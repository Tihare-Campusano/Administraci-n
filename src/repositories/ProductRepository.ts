import { openDB } from '../database/db';
import { Product } from '../models/Product';

export class ProductRepository {
  private storeName = 'products';

  async getAll(): Promise<Product[]> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.storeName, 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.getAll();

      request.onsuccess = () => {
        const list: Product[] = request.result || [];
        resolve(list.filter(p => !p.deleted));
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getAllRaw(): Promise<Product[]> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.storeName, 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async getById(id: string): Promise<Product | undefined> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.storeName, 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async save(product: Product): Promise<Product> {
    product.updatedAt = new Date().toISOString();
    if (product.deleted === undefined) {
      product.deleted = false;
    }
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.storeName, 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.put(product);

      request.onsuccess = () => resolve(product);
      request.onerror = () => reject(request.error);
    });
  }

  async delete(id: string): Promise<void> {
    const product = await this.getById(id);
    if (product) {
      product.deleted = true;
      product.updatedAt = new Date().toISOString();
      await this.save(product);
    }
  }
}
