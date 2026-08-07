import { openDB } from '../database/db';
import { Customer } from '../models/Customer';
import { SupabaseService } from '../services/SupabaseService';

export class CustomerRepository {
  private storeName = 'customers';
  private supabaseService = new SupabaseService();

  async getAll(): Promise<Customer[]> {
    const local = await this.getLocalAll();

    try {
      const remote = await this.supabaseService.getCustomers();
      if (remote && remote.length > 0) {
        const localMap = new Map<string, Customer>(local.map(c => [c.id, c]));

        for (const item of remote) {
          const existing = localMap.get(item.id);
          if (!existing || (item.updatedAt && existing.updatedAt && new Date(item.updatedAt) > new Date(existing.updatedAt))) {
            await this.saveLocal(item).catch(() => {});
            localMap.set(item.id, item);
          }
        }

        for (const localItem of local) {
          if (!remote.some(r => r.id === localItem.id)) {
            this.supabaseService.saveCustomer(localItem).catch(() => {});
          }
        }

        return Array.from(localMap.values()).filter(c => !c.deleted);
      }
    } catch (e) {
      console.warn('Sincronización de clientes desde Supabase no disponible, usando IndexedDB local:', e);
    }

    return local;
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

    // 1. Guardar de forma inmediata en IndexedDB local
    await this.saveLocal(customer).catch(() => {});

    // 2. Sincronizar asincrónicamente con Supabase
    try {
      await this.supabaseService.saveCustomer(customer);
    } catch (err) {
      console.warn('Sincronización cloud del cliente fallida:', err);
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
    // 1. Eliminar primero en almacenamiento local
    await this.deleteLocal(id).catch(() => {});

    // 2. Eliminar en Supabase Cloud
    try {
      await this.supabaseService.deleteRow('customers', id);
    } catch (err) {
      console.warn('Eliminación cloud del cliente fallida:', err);
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
