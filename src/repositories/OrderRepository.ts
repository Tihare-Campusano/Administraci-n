import { openDB } from '../database/db';
import { Order } from '../models/Order';
import { SupabaseService } from '../services/SupabaseService';

export class OrderRepository {
  private storeName = 'orders';
  private supabaseService = new SupabaseService();

  async getAll(): Promise<Order[]> {
    try {
      const remote = await this.supabaseService.getOrders();
      for (const item of remote) {
        await this.saveLocal(item).catch(() => {});
      }
      return remote;
    } catch (e) {
      return this.getLocalAll();
    }
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

    try {
      await this.supabaseService.saveOrder(order);
    } catch (err) {
      console.warn('Sincronización cloud del pedido fallida:', err);
    }

    await this.saveLocal(order).catch(() => {});
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
    try {
      await this.supabaseService.deleteRow('orders', id);
    } catch (err) {
      console.warn('Eliminación cloud del pedido fallida:', err);
    }

    await this.deleteLocal(id).catch(() => {});
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
