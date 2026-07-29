import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { ProductRepository } from '../repositories/ProductRepository';
import { CustomerRepository } from '../repositories/CustomerRepository';
import { OrderRepository } from '../repositories/OrderRepository';
import { ExpenseRepository } from '../repositories/ExpenseRepository';
import { NoteRepository } from '../repositories/NoteRepository';

export class SupabaseService {
  private prodRepo = new ProductRepository();
  private custRepo = new CustomerRepository();
  private orderRepo = new OrderRepository();
  private expRepo = new ExpenseRepository();
  private noteRepo = new NoteRepository();

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
      const { error } = await this.client.from('products').select('id').limit(1);
      if (error) {
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
    await this.syncTable('notes', this.noteRepo);
  }

  private async syncTable(tableName: string, repo: any): Promise<void> {
    if (!this.client) return;

    const localItems = await repo.getAllRaw();

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

      // Si estamos subiendo pedidos, alimentar también la tabla relacional de detalle order_items
      if (tableName === 'orders') {
        const orderItemsToUpload: any[] = [];
        for (const order of toUpload) {
          if (Array.isArray(order.products)) {
            for (const p of order.products) {
              orderItemsToUpload.push({
                id: `${order.id}_${p.productId || Math.random().toString(36).substring(2, 7)}`,
                order_id: order.id,
                product_id: p.productId || null,
                name: p.name,
                price: p.price,
                quantity: p.quantity
              });
            }
          }
        }
        if (orderItemsToUpload.length > 0) {
          await this.client.from('order_items').upsert(orderItemsToUpload);
        }
      }
    }

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

  private mapToDb(item: any): any {
    const keyMap: Record<string, string> = {
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      completedAt: 'completed_at',
      customerId: 'customer_id',
      paymentMethod: 'payment_method',
      paymentStatus: 'payment_status',
      orderNumber: 'order_number',
      deliveryFee: 'delivery_fee',
      isPinned: 'is_pinned',
      image: 'image_url',
      date: 'expense_date',
      items: 'checklist'
    };

    const dbItem: any = {};
    for (const key of Object.keys(item)) {
      const dbKey = keyMap[key] || key;
      dbItem[dbKey] = item[key];
    }
    return dbItem;
  }

  private mapFromDb(dbItem: any): any {
    const keyMap: Record<string, string> = {
      created_at: 'createdAt',
      updated_at: 'updatedAt',
      completed_at: 'completedAt',
      customer_id: 'customerId',
      payment_method: 'paymentMethod',
      payment_status: 'paymentStatus',
      order_number: 'orderNumber',
      delivery_fee: 'deliveryFee',
      is_pinned: 'isPinned',
      image_url: 'image',
      expense_date: 'date',
      checklist: 'items'
    };

    const item: any = {};
    for (const key of Object.keys(dbItem)) {
      const jsKey = keyMap[key] || key;
      item[jsKey] = dbItem[key];
    }
    return item;
  }
}
