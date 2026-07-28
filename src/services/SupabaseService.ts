import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { ProductRepository } from '../repositories/ProductRepository';
import { CustomerRepository } from '../repositories/CustomerRepository';
import { OrderRepository } from '../repositories/OrderRepository';
import { ExpenseRepository } from '../repositories/ExpenseRepository';

export class SupabaseService {
  private prodRepo = new ProductRepository();
  private custRepo = new CustomerRepository();
  private orderRepo = new OrderRepository();
  private expRepo = new ExpenseRepository();

  private client: SupabaseClient | null = null;

  constructor() {
    this.initClient();
  }

  private initClient(): void {
    const url = localStorage.getItem('supabase_url');
    const key = localStorage.getItem('supabase_key');
    if (url && key) {
      this.client = createClient(url, key);
    }
  }

  async getCredentials(): Promise<{ url: string; key: string }> {
    return {
      url: localStorage.getItem('supabase_url') || '',
      key: localStorage.getItem('supabase_key') || ''
    };
  }

  async saveCredentials(url: string, key: string): Promise<boolean> {
    if (!url || !key) {
      localStorage.removeItem('supabase_url');
      localStorage.removeItem('supabase_key');
      this.client = null;
      return false;
    }
    
    localStorage.setItem('supabase_url', url);
    localStorage.setItem('supabase_key', key);
    this.client = createClient(url, key);
    
    return await this.testConnection();
  }

  async testConnection(): Promise<boolean> {
    if (!this.client) return false;
    try {
      // Query the products table metadata or select a limit of 1
      const { error } = await this.client.from('products').select('id').limit(1);
      if (error) {
        // If error is code PGRST116 or missing relation, connection is valid, tables just don't exist yet
        if (error.code === 'PGRST116' || error.message.includes('relation "products" does not exist')) {
          return true;
        }
        return false;
      }
      return true;
    } catch (e) {
      return false;
    }
  }

  async isConfigured(): Promise<boolean> {
    return this.client !== null && await this.testConnection();
  }

  async syncWithCloud(): Promise<void> {
    if (!this.client) {
      throw new Error('Supabase no está configurado o conectado.');
    }

    await this.syncTable('products', this.prodRepo);
    await this.syncTable('customers', this.custRepo);
    await this.syncTable('orders', this.orderRepo);
    await this.syncTable('expenses', this.expRepo);
  }

  private async syncTable(tableName: string, repo: any): Promise<void> {
    if (!this.client) return;

    // A. Gather local items (including soft-deleted)
    const localItems = await repo.getAllRaw();

    // B. Download remote items
    const { data: remoteItems, error } = await this.client.from(tableName).select('*');
    if (error) {
      throw new Error(`Error al leer tabla remota ${tableName}: ${error.message}`);
    }

    const remoteMap = new Map<string, any>();
    if (remoteItems) {
      for (const item of remoteItems) {
        remoteMap.set(item.id, item);
      }
    }

    // C. Detect items to upload (local newer than remote)
    const toUpload: any[] = [];
    for (const localItem of localItems) {
      const remoteItem = remoteMap.get(localItem.id);
      if (!remoteItem) {
        toUpload.push(localItem);
      } else {
        const localUpdated = localItem.updatedAt || '';
        const remoteUpdated = remoteItem.updated_at || remoteItem.updatedAt || '';
        if (localUpdated > remoteUpdated) {
          toUpload.push(localItem);
        }
      }
    }

    if (toUpload.length > 0) {
      const mappedUpload = toUpload.map(item => this.mapToDb(item));
      const { error: uploadError } = await this.client.from(tableName).upsert(mappedUpload);
      if (uploadError) {
        throw new Error(`Error al subir datos a ${tableName}: ${uploadError.message}`);
      }
    }

    // D. Detect items to download (remote newer than local)
    if (remoteItems) {
      for (const remoteItem of remoteItems) {
        const mappedRemote = this.mapFromDb(remoteItem);
        const localItem = await repo.getById(mappedRemote.id);
        if (!localItem) {
          await repo.save(mappedRemote);
        } else {
          const localUpdated = localItem.updatedAt || '';
          const remoteUpdated = mappedRemote.updatedAt || '';
          if (remoteUpdated > localUpdated) {
            await repo.save(mappedRemote);
          }
        }
      }
    }
  }

  // Helpers to map camelCase <-> snake_case properties
  private mapToDb(item: any): any {
    const dbItem: any = {};
    for (const key of Object.keys(item)) {
      const dbKey = key === 'createdAt' ? 'created_at' : (key === 'updatedAt' ? 'updated_at' : (key === 'customerId' ? 'customer_id' : (key === 'paymentMethod' ? 'payment_method' : (key === 'paymentStatus' ? 'payment_status' : key))));
      dbItem[dbKey] = item[key];
    }
    return dbItem;
  }

  private mapFromDb(dbItem: any): any {
    const item: any = {};
    for (const key of Object.keys(dbItem)) {
      const jsKey = key === 'created_at' ? 'createdAt' : (key === 'updated_at' ? 'updatedAt' : (key === 'customer_id' ? 'customerId' : (key === 'payment_method' ? 'paymentMethod' : (key === 'payment_status' ? 'paymentStatus' : key))));
      item[jsKey] = dbItem[key];
    }
    return item;
  }
}
