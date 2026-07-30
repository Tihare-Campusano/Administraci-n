import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Logger } from '../utils/Logger';

export const SUPABASE_URL = 'https://atmnawbmvvfjdkkwkdwm.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF0bW5hd2JtdnZfamRra3drZHdtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUxOTQ5MjIsImV4cCI6MjEwMDc3MDkyMn0.UX58TjLoemo6_OlosbUCW3Odm5Y1EW7xrch3kqgE-d8';

export class SupabaseService {
  private static instance: SupabaseClient | null = null;

  public getClient(): SupabaseClient {
    if (!SupabaseService.instance) {
      SupabaseService.instance = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      Logger.info('system', 'INITIALIZE_SUPABASE_CLIENT', { url: SUPABASE_URL });
    }
    return SupabaseService.instance;
  }

  // --- CUSTOMERS ---
  async getCustomers(): Promise<any[]> {
    const startTime = performance.now();
    try {
      const client = this.getClient();
      const { data, error } = await client.from('customers').select('*');
      const durationMs = Math.round(performance.now() - startTime);

      if (error) {
        Logger.error('customers', 'SELECT', null, error, durationMs);
        throw error;
      }

      const mapped = (data || []).map(item => ({
        id: item.id,
        name: item.name,
        phone: item.phone || '',
        address: item.address || '',
        notes: item.notes || '',
        createdAt: item.created_at || item.createdAt || new Date().toISOString(),
        updatedAt: item.updated_at || item.updatedAt || new Date().toISOString(),
        deleted: item.deleted || false
      }));

      Logger.info('customers', 'SELECT', { count: mapped.length }, mapped, durationMs);
      return mapped;
    } catch (e: any) {
      const durationMs = Math.round(performance.now() - startTime);
      Logger.warn('customers', 'SELECT_FALLBACK', null, e, durationMs);
      return [];
    }
  }

  async saveCustomer(customer: any): Promise<void> {
    const startTime = performance.now();
    const payload = {
      id: customer.id,
      name: customer.name,
      phone: customer.phone || '',
      address: customer.address || '',
      notes: customer.notes || '',
      created_at: customer.createdAt,
      updated_at: customer.updatedAt,
      deleted: customer.deleted || false
    };

    try {
      const client = this.getClient();
      const { data, error } = await client.from('customers').upsert(payload).select();
      const durationMs = Math.round(performance.now() - startTime);

      if (error) {
        Logger.error('customers', 'UPSERT', payload, error, durationMs);
        throw error;
      }

      Logger.info('customers', 'UPSERT', payload, data, durationMs);
    } catch (e: any) {
      const durationMs = Math.round(performance.now() - startTime);
      Logger.error('customers', 'UPSERT_EXCEPTION', payload, e, durationMs);
    }
  }

  // --- PRODUCTS ---
  async getProducts(): Promise<any[]> {
    const startTime = performance.now();
    try {
      const client = this.getClient();
      const { data, error } = await client.from('products').select('*');
      const durationMs = Math.round(performance.now() - startTime);

      if (error) {
        Logger.error('products', 'SELECT', null, error, durationMs);
        throw error;
      }

      const mapped = (data || []).map(item => ({
        id: item.id,
        name: item.name,
        description: item.description || '',
        price: Number(item.price) || 0,
        cost: Number(item.cost) || 0,
        category: item.category || 'General',
        available: item.available !== false,
        image: item.image || '',
        createdAt: item.created_at || item.createdAt || new Date().toISOString(),
        updatedAt: item.updated_at || item.updatedAt || new Date().toISOString(),
        deleted: item.deleted || false
      }));

      Logger.info('products', 'SELECT', { count: mapped.length }, mapped, durationMs);
      return mapped;
    } catch (e: any) {
      const durationMs = Math.round(performance.now() - startTime);
      Logger.warn('products', 'SELECT_FALLBACK', null, e, durationMs);
      return [];
    }
  }

  async saveProduct(product: any): Promise<void> {
    const startTime = performance.now();
    const payload = {
      id: product.id,
      name: product.name,
      description: product.description || '',
      price: Number(product.price) || 0,
      cost: Number(product.cost) || 0,
      category: product.category || 'General',
      available: product.available !== false,
      image: product.image || '',
      created_at: product.createdAt,
      updated_at: product.updatedAt,
      deleted: product.deleted || false
    };

    try {
      const client = this.getClient();
      const { data, error } = await client.from('products').upsert(payload).select();
      const durationMs = Math.round(performance.now() - startTime);

      if (error) {
        Logger.error('products', 'UPSERT', payload, error, durationMs);
        throw error;
      }

      Logger.info('products', 'UPSERT', payload, data, durationMs);
    } catch (e: any) {
      const durationMs = Math.round(performance.now() - startTime);
      Logger.error('products', 'UPSERT_EXCEPTION', payload, e, durationMs);
    }
  }

  // --- ORDERS ---
  async getOrders(): Promise<any[]> {
    const startTime = performance.now();
    try {
      const client = this.getClient();
      const { data, error } = await client.from('orders').select('*');
      const durationMs = Math.round(performance.now() - startTime);

      if (error) {
        Logger.error('orders', 'SELECT', null, error, durationMs);
        throw error;
      }

      const mapped = (data || []).map(item => ({
        id: item.id,
        orderNumber: item.order_number || item.orderNumber || 1,
        customerId: item.customer_id || item.customerId,
        products: typeof item.products === 'string' ? JSON.parse(item.products) : (item.products || []),
        subtotal: Number(item.subtotal) || 0,
        discount: Number(item.discount) || 0,
        deliveryFee: Number(item.delivery_fee) || Number(item.deliveryFee) || 0,
        total: Number(item.total) || 0,
        paymentMethod: item.payment_method || item.paymentMethod || 'Efectivo',
        paymentStatus: item.payment_status || item.paymentStatus || 'unpaid',
        status: item.status || 'pending',
        notes: item.notes || '',
        createdAt: item.created_at || item.createdAt || new Date().toISOString(),
        completedAt: item.completed_at || item.completedAt,
        updatedAt: item.updated_at || item.updatedAt || new Date().toISOString(),
        deleted: item.deleted || false
      }));

      Logger.info('orders', 'SELECT', { count: mapped.length }, mapped, durationMs);
      return mapped;
    } catch (e: any) {
      const durationMs = Math.round(performance.now() - startTime);
      Logger.warn('orders', 'SELECT_FALLBACK', null, e, durationMs);
      return [];
    }
  }

  async saveOrder(order: any): Promise<void> {
    const startTime = performance.now();
    const payload = {
      id: order.id,
      order_number: order.orderNumber,
      customer_id: order.customerId,
      products: order.products,
      subtotal: order.subtotal,
      discount: order.discount,
      delivery_fee: order.deliveryFee,
      total: order.total,
      payment_method: order.paymentMethod,
      payment_status: order.paymentStatus,
      status: order.status,
      notes: order.notes || '',
      created_at: order.createdAt,
      completed_at: order.completedAt || null,
      updated_at: order.updatedAt,
      deleted: order.deleted || false
    };

    try {
      const client = this.getClient();
      const { data, error } = await client.from('orders').upsert(payload).select();
      const durationMs = Math.round(performance.now() - startTime);

      if (error) {
        Logger.error('orders', 'UPSERT', payload, error, durationMs);
        throw error;
      }

      Logger.info('orders', 'UPSERT', payload, data, durationMs);
    } catch (e: any) {
      const durationMs = Math.round(performance.now() - startTime);
      Logger.error('orders', 'UPSERT_EXCEPTION', payload, e, durationMs);
    }
  }

  // --- EXPENSES ---
  async getExpenses(): Promise<any[]> {
    const startTime = performance.now();
    try {
      const client = this.getClient();
      const { data, error } = await client.from('expenses').select('*');
      const durationMs = Math.round(performance.now() - startTime);

      if (error) {
        Logger.error('expenses', 'SELECT', null, error, durationMs);
        throw error;
      }

      const mapped = (data || []).map(item => ({
        id: item.id,
        title: item.title,
        amount: Number(item.amount) || 0,
        category: item.category || 'General',
        date: item.date || item.created_at,
        createdAt: item.created_at || item.createdAt || new Date().toISOString(),
        updatedAt: item.updated_at || item.updatedAt || new Date().toISOString(),
        deleted: item.deleted || false
      }));

      Logger.info('expenses', 'SELECT', { count: mapped.length }, mapped, durationMs);
      return mapped;
    } catch (e: any) {
      const durationMs = Math.round(performance.now() - startTime);
      Logger.warn('expenses', 'SELECT_FALLBACK', null, e, durationMs);
      return [];
    }
  }

  async saveExpense(expense: any): Promise<void> {
    const startTime = performance.now();
    const payload = {
      id: expense.id,
      title: expense.title,
      amount: expense.amount,
      category: expense.category || 'General',
      date: expense.date,
      created_at: expense.createdAt || new Date().toISOString(),
      updated_at: expense.updatedAt || new Date().toISOString(),
      deleted: expense.deleted || false
    };

    try {
      const client = this.getClient();
      const { data, error } = await client.from('expenses').upsert(payload).select();
      const durationMs = Math.round(performance.now() - startTime);

      if (error) {
        Logger.error('expenses', 'UPSERT', payload, error, durationMs);
        throw error;
      }

      Logger.info('expenses', 'UPSERT', payload, data, durationMs);
    } catch (e: any) {
      const durationMs = Math.round(performance.now() - startTime);
      Logger.error('expenses', 'UPSERT_EXCEPTION', payload, e, durationMs);
    }
  }

  // --- NOTES ---
  async getNotes(): Promise<any[]> {
    const startTime = performance.now();
    try {
      const client = this.getClient();
      const { data, error } = await client.from('notes').select('*');
      const durationMs = Math.round(performance.now() - startTime);

      if (error) {
        Logger.error('notes', 'SELECT', null, error, durationMs);
        throw error;
      }

      const mapped = (data || []).map(item => ({
        id: item.id,
        title: item.title,
        content: item.content || '',
        items: typeof item.items === 'string' ? JSON.parse(item.items) : (item.items || []),
        category: item.category || 'General',
        isPinned: item.is_pinned !== undefined ? item.is_pinned : (item.isPinned || false),
        color: item.color || '#ec4899',
        createdAt: item.created_at || item.createdAt || new Date().toISOString(),
        updatedAt: item.updated_at || item.updatedAt || new Date().toISOString(),
        deleted: item.deleted || false
      }));

      Logger.info('notes', 'SELECT', { count: mapped.length }, mapped, durationMs);
      return mapped;
    } catch (e: any) {
      const durationMs = Math.round(performance.now() - startTime);
      Logger.warn('notes', 'SELECT_FALLBACK', null, e, durationMs);
      return [];
    }
  }

  async saveNote(note: any): Promise<void> {
    const startTime = performance.now();
    const payload = {
      id: note.id,
      title: note.title,
      content: note.content || '',
      items: note.items || [],
      category: note.category || 'General',
      is_pinned: note.isPinned !== undefined ? note.isPinned : false,
      color: note.color || '#ec4899',
      created_at: note.createdAt,
      updated_at: note.updatedAt,
      deleted: note.deleted || false
    };

    try {
      const client = this.getClient();
      const { data, error } = await client.from('notes').upsert(payload).select();
      const durationMs = Math.round(performance.now() - startTime);

      if (error) {
        Logger.error('notes', 'UPSERT', payload, error, durationMs);
        throw error;
      }

      Logger.info('notes', 'UPSERT', payload, data, durationMs);
    } catch (e: any) {
      const durationMs = Math.round(performance.now() - startTime);
      Logger.error('notes', 'UPSERT_EXCEPTION', payload, e, durationMs);
    }
  }

  // --- APP SETTINGS / SECURITY ---
  async getSetting(key: string): Promise<any | null> {
    const startTime = performance.now();
    try {
      const client = this.getClient();
      const { data, error } = await client.from('app_settings').select('value').eq('key', key).single();
      const durationMs = Math.round(performance.now() - startTime);

      if (error) {
        if (error.code !== 'PGRST116') {
          Logger.warn('settings', 'SELECT_SETTING', { key }, error, durationMs);
        }
        return null;
      }

      return data ? data.value : null;
    } catch (e: any) {
      return null;
    }
  }

  async saveSetting(key: string, value: any): Promise<void> {
    const startTime = performance.now();
    const payload = {
      key,
      value,
      updated_at: new Date().toISOString()
    };

    try {
      const client = this.getClient();
      const { data, error } = await client.from('app_settings').upsert(payload, { onConflict: 'key' }).select();
      const durationMs = Math.round(performance.now() - startTime);

      if (error) {
        Logger.error('settings', 'UPSERT_SETTING', payload, error, durationMs);
        throw error;
      }

      Logger.info('settings', 'UPSERT_SETTING', payload, data, durationMs);
    } catch (e: any) {
      const durationMs = Math.round(performance.now() - startTime);
      Logger.error('settings', 'UPSERT_SETTING_EXCEPTION', payload, e, durationMs);
    }
  }
}
