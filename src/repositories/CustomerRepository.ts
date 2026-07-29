import { openDB } from '../database/db';
import { Customer } from '../models/Customer';
import { SupabaseService } from '../services/SupabaseService';

export class CustomerRepository {
  private storeName = 'customers';
  private supabaseService = new SupabaseService();

  async getAll(): Promise<Customer[]> {
    try {
      const remote = await this.supabaseService.getCustomers();
      if (remote.length > 0) {
        for (const item of remote) {
          await this.saveLocal(item);
        }
        return remote.filter(c => !c.deleted);
      }
    } catch (e) {
      console.warn('CustomerRepository remote getAll fallback:', e);
    }
    return this.getLocalAll();
  }

  private async getLocalAll(): Promise<Customer[]> {
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
    
    // Save to local IndexedDB
    await this.saveLocal(customer);

    // Save to Supabase Cloud
    await this.supabaseService.saveCustomer(customer);

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
    const customer = await this.getById(id);
    if (customer) {
      customer.deleted = true;
      customer.updatedAt = new Date().toISOString();
      await this.save(customer);
    }
  }
}
