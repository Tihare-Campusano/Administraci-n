import { openDB } from '../database/db';
import { Order } from '../models/Order';
import { SupabaseService } from '../services/SupabaseService';

export class OrderRepository {
  private storeName = 'orders';
  private supabaseService = new SupabaseService();

  async getAll(): Promise<Order[]> {
    const local = await this.getLocalAll();

    try {
      const remote = await this.supabaseService.getOrders();
      if (remote && remote.length > 0) {
        const localMap = new Map<string, Order>(local.map(o => [o.id, o]));

        for (const item of remote) {
          const existing = localMap.get(item.id);
          if (!existing || (item.updatedAt && existing.updatedAt && new Date(item.updatedAt) > new Date(existing.updatedAt))) {
            await this.saveLocal(item).catch(() => {});
            localMap.set(item.id, item);
          }
        }

        for (const localItem of local) {
          if (!remote.some(r => r.id === localItem.id)) {
            this.supabaseService.saveOrder(localItem).catch(() => {});
          }
        }

        return Array.from(localMap.values()).filter(o => !o.deleted);
      }
    } catch (e) {
      console.warn('Sincronización de pedidos desde Supabase no disponible, usando IndexedDB local:', e);
    }

    return local;
  }

  private async getLocalAll(): Promise<Order[]> {
    try {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(this.storeName, 'readonly');
        const store = transaction.objectStore(this.storeName);
        const request = store.getAll();

        request.onsuccess = () => {
          const list: Order[] = request.result || [];
          resolve(list.filter(o => !o.deleted));
        };
        request.onerror = () => reject(request.error);
      });
    } catch {
      return [];
    }
  }

  async getById(id: string): Promise<Order | undefined> {
    if (!id) return undefined;
    const all = await this.getAll();
    return all.find(o => o.id === id);
  }

  async save(order: Order): Promise<Order> {
    order.updatedAt = new Date().toISOString();
    if (order.deleted === undefined) {
      order.deleted = false;
    }

    // 1. Guardar de forma inmediata en IndexedDB local
    await this.saveLocal(order).catch(() => {});

    // 2. Sincronizar asincrónicamente con Supabase
    try {
      await this.supabaseService.saveOrder(order);
    } catch (err) {
      console.warn('Sincronización cloud del pedido fallida:', err);
    }

    return order;
  }

  private async saveLocal(order: Order): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.storeName, 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.put(order);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async delete(id: string): Promise<void> {
    // 1. Eliminar primero en almacenamiento local
    await this.deleteLocal(id).catch(() => {});

    // 2. Eliminar en Supabase Cloud
    try {
      await this.supabaseService.deleteRow('orders', id);
    } catch (err) {
      console.warn('Eliminación cloud del pedido fallida:', err);
    }
  }

  private async deleteLocal(id: string): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.storeName, 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}
