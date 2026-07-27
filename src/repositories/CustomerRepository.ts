import { openDB } from '../database/db';
import { Customer } from '../models/Customer';

export class CustomerRepository {
  private storeName = 'customers';

  async getAll(): Promise<Customer[]> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.storeName, 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.getAll();

      request.onsuccess = () => {
        const list: Customer[] = request.result || [];
        resolve(list.filter(c => !c.deleted));
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getAllRaw(): Promise<Customer[]> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.storeName, 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async getById(id: string): Promise<Customer | undefined> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.storeName, 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async save(customer: Customer): Promise<Customer> {
    customer.updatedAt = new Date().toISOString();
    if (customer.deleted === undefined) {
      customer.deleted = false;
    }
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.storeName, 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.put(customer);

      request.onsuccess = () => resolve(customer);
      request.onerror = () => reject(request.error);
    });
  }

  async delete(id: string): Promise<void> {
    const customer = await this.getById(id);
    if (customer) {
      customer.deleted = true;
      customer.updatedAt = new Date().toISOString();
      await this.save(customer);
    }
  }
}
