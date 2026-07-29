import { openDB } from '../database/db';
import { Order } from '../models/Order';
import { SupabaseService } from '../services/SupabaseService';

export class OrderRepository {
  private storeName = 'orders';
  private supabaseService = new SupabaseService();

  async getAll(): Promise<Order[]> {
    try {
      const remote = await this.supabaseService.getOrders();
      if (remote.length > 0) {
        for (const item of remote) {
          await this.saveLocal(item);
        }
        return remote.filter(o => !o.deleted);
      }
    } catch (e) {
      console.warn('OrderRepository remote getAll fallback:', e);
    }
    return this.getLocalAll();
  }

  private async getLocalAll(): Promise<Order[]> {
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

    await this.saveLocal(order);
    await this.supabaseService.saveOrder(order);

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
    const order = await this.getById(id);
    if (order) {
      order.deleted = true;
      order.updatedAt = new Date().toISOString();
      await this.save(order);
    }
  }
}
