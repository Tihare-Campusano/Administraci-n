import { openDB } from '../database/db';
import { Order } from '../models/Order';

export class OrderRepository {
  private storeName = 'orders';

  async getAll(): Promise<Order[]> {
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

  async getAllRaw(): Promise<Order[]> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.storeName, 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async getById(id: string): Promise<Order | undefined> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.storeName, 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async save(order: Order): Promise<Order> {
    order.updatedAt = new Date().toISOString();
    if (order.deleted === undefined) {
      order.deleted = false;
    }
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.storeName, 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.put(order);

      request.onsuccess = () => resolve(order);
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
