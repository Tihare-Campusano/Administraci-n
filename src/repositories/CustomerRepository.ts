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
    } catch (e) {
      // Ignorar fallos de red en sync remoto
    }
    return this.getLocalAll();
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
    
    // 1. Guardar primero en IndexedDB
    await this.saveLocal(customer);

    // 2. Intentar sincronizar con la nube de forma asíncrona no bloqueante
    try {
      await this.supabaseService.saveCustomer(customer);
    } catch (err) {
      console.warn('Sincronización cloud del cliente fallida u offline:', err);
    }

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
    // 1. Eliminar primero de IndexedDB local
    await this.deleteLocal(id);

    // 2. Intentar eliminar en la nube de forma asíncrona no bloqueante
    try {
      await this.supabaseService.deleteRow('customers', id);
    } catch (err) {
      console.warn('Eliminación cloud del cliente fallida u offline:', err);
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
