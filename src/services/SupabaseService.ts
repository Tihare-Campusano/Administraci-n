import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { ProductRepository } from '../repositories/ProductRepository';
import { CustomerRepository } from '../repositories/CustomerRepository';
import { OrderRepository } from '../repositories/OrderRepository';
import { ExpenseRepository } from '../repositories/ExpenseRepository';
import { NoteRepository } from '../repositories/NoteRepository';
import { showToast } from '../components/Toast';

export const DEFAULT_SUPABASE_URL = 'https://atmnawbmvvfjdkkwkdwm.supabase.co';
export const DEFAULT_SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF0bW5hd2JtdnZmamRra3drZHdtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUxOTQ5MjIsImV4cCI6MjEwMDc3MDkyMn0.UX58TjLoemo6_OlosbUCW3Odm5Y1EW7xrch3kqgE-d8';

export class SupabaseService {
  private prodRepo = new ProductRepository();
  private custRepo = new CustomerRepository();
  private orderRepo = new OrderRepository();
  private expRepo = new ExpenseRepository();
  private noteRepo = new NoteRepository();

  private client: SupabaseClient | null = null;
  private currentUrl: string = '';
  private currentKey: string = '';

  constructor() {
    this.getClient();
  }

  public getClient(): SupabaseClient | null {
    const url = localStorage.getItem('supabase_url')?.trim() || DEFAULT_SUPABASE_URL;
    const key = localStorage.getItem('supabase_key')?.trim() || DEFAULT_SUPABASE_KEY;

    if (!url || !key) {
      this.client = null;
      this.currentUrl = '';
      this.currentKey = '';
      return null;
    }

    if (!this.client || this.currentUrl !== url || this.currentKey !== key) {
      try {
        this.currentUrl = url;
        this.currentKey = key;
        this.client = createClient(url, key);
      } catch (err) {
        console.error('Error al inicializar cliente de Supabase:', err);
        this.client = null;
      }
    }

    return this.client;
  }

  async getCredentials(): Promise<{ url: string; key: string }> {
    return {
      url: localStorage.getItem('supabase_url') || '',
      key: localStorage.getItem('supabase_key') || ''
    };
  }

  async saveCredentials(url: string, key: string): Promise<boolean> {
    const cleanUrl = url.trim();
    const cleanKey = key.trim();

    if (!cleanUrl || !cleanKey) {
      localStorage.removeItem('supabase_url');
      localStorage.removeItem('supabase_key');
      this.client = null;
      this.currentUrl = '';
      this.currentKey = '';
      return false;
    }
    
    localStorage.setItem('supabase_url', cleanUrl);
    localStorage.setItem('supabase_key', cleanKey);
    
    // Forzar recreación del cliente
    this.currentUrl = '';
    this.currentKey = '';
    this.getClient();
    
    return await this.testConnection();
  }

  async testConnection(): Promise<boolean> {
    const client = this.getClient();
    if (!client) return false;
    try {
      const { error } = await client.from('products').select('id').limit(1);
      if (error) {
        if (error.code === 'PGRST116' || error.message.includes('relation "products" does not exist')) {
          return true;
        }
        console.warn('Supabase testConnection error:', error.message);
        return false;
      }
      return true;
    } catch (e) {
      return false;
    }
  }

  async isConfigured(): Promise<boolean> {
    const client = this.getClient();
    return client !== null && await this.testConnection();
  }

  async syncWithCloud(): Promise<void> {
    const client = this.getClient();
    if (!client) {
      throw new Error('Supabase no está configurado o conectado. Por favor ingresa la URL y anon_key en Respaldo y Ajustes.');
    }

    await this.syncTable('products', this.prodRepo);
    await this.syncTable('customers', this.custRepo);
    await this.syncTable('orders', this.orderRepo);
    await this.syncTable('expenses', this.expRepo);
    await this.syncTable('notes', this.noteRepo);
  }

  private async syncTable(tableName: string, repo: any): Promise<void> {
    const client = this.getClient();
    if (!client) return;

    const localItems = await repo.getAllRaw();

    const { data: remoteItems, error } = await client.from(tableName).select('*');
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
      const { error: uploadError } = await client.from(tableName).upsert(mappedUpload);
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
          await client.from('order_items').upsert(orderItemsToUpload);
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

  async syncNowIfConfigured(): Promise<void> {
    try {
      const client = this.getClient();
      if (client) {
        await this.syncWithCloud();
      }
    } catch (e: any) {
      console.warn('Auto cloud sync warning:', e);
      const msg = e?.message || '';
      if (msg.includes('row-level security') || msg.includes('42501')) {
        showToast('Supabase bloqueó el guardado (RLS activo). Ejecuta el SQL de desactivación en Supabase.', 'danger');
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
      isArchived: 'is_archived',
      isLocked: 'is_locked',
      reminderAt: 'reminder_at',
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
      is_archived: 'isArchived',
      is_locked: 'isLocked',
      reminder_at: 'reminderAt',
      image_url: 'image',
      expense_date: 'date',
      checklist: 'items'
    };

    const item: any = {};
    for (const key of Object.keys(dbItem)) {
      const jsKey = keyMap[key] || key;
      item[jsKey] = dbItem[key];
    }

    // Normalizar fallbacks de campos
    item.id = item.id || '';
    item.createdAt = item.createdAt || new Date().toISOString();
    item.updatedAt = item.updatedAt || item.createdAt;

    return item;
  }
}
