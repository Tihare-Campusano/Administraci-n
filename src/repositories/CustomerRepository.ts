import { openDB } from '../database/db';
import { Customer } from '../models/Customer';
import { SupabaseService } from '../services/SupabaseService';

export class CustomerRepository {
  private storeName = 'customers';
  private supabaseService = new SupabaseService();

  async getAll(): Promise<Customer[]> {
    try {
      const remote = await this.supabaseService.getCustomers();
      for (const item of remote) {
        await this.saveLocal(item).catch(() => {});
      }
      return remote.filter(c => !c.deleted);
    } catch (e) {
      return this.getLocalAll();
    }
  }

  private async getLocalAll(): Promise<Customer[]> {
    try {
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
    } catch {
      return [];
    }
  }

  async getById(id: string): Promise<Customer | undefined> {
    if (!id) return undefined;
    const all = await this.getAll();
    return all.find(c => c.id === id);
  }

  async save(customer: Customer): Promise<Customer> {
    customer.updatedAt = new Date().toISOString();
    if (customer.deleted === undefined) {
      customer.deleted = false;
    }
    
    await this.supabaseService.saveCustomer(customer);
    await this.saveLocal(customer).catch(() => {});

    return customer;
  }

  private async saveLocal(customer: Customer): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.storeName, 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.put(customer);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async delete(id: string): Promise<void> {
    await this.supabaseService.deleteRow('customers', id);
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
