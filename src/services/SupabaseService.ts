import { createClient, SupabaseClient } from '@supabase/supabase-js';

export const SUPABASE_URL = 'https://atmnawbmvvfjdkkwkdwm.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF0bW5hd2JtdnZfamRra3drZHdtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUxOTQ5MjIsImV4cCI6MjEwMDc3MDkyMn0.UX58TjLoemo6_OlosbUCW3Odm5Y1EW7xrch3kqgE-d8';

export class SupabaseService {
  private static instance: SupabaseClient | null = null;

  public getClient(): SupabaseClient {
    if (!SupabaseService.instance) {
      SupabaseService.instance = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }
    return SupabaseService.instance;
  }

  // --- CUSTOMERS ---
  async getCustomers(): Promise<any[]> {
    try {
      const client = this.getClient();
      const { data, error } = await client.from('customers').select('*');
      if (error) {
        console.error('Error al leer clientes en Supabase:', error.message);
        throw error;
      }
      return (data || []).map(item => ({
        id: item.id,
        name: item.name,
        phone: item.phone || '',
        address: item.address || '',
        notes: item.notes || '',
        createdAt: item.created_at || item.createdAt || new Date().toISOString(),
        updatedAt: item.updated_at || item.updatedAt || new Date().toISOString(),
        deleted: item.deleted || false
      }));
    } catch (e) {
      console.warn('Supabase fetch customers failed:', e);
      return [];
    }
  }

  async saveCustomer(customer: any): Promise<void> {
    try {
      const client = this.getClient();
      const payload = {
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        address: customer.address || '',
        notes: customer.notes || '',
        created_at: customer.createdAt,
        updated_at: customer.updatedAt,
        deleted: customer.deleted || false
      };
      const { error } = await client.from('customers').upsert(payload);
      if (error) {
        console.error('Error al guardar cliente en Supabase:', error.message);
        throw error;
      }
    } catch (e: any) {
      console.warn('Supabase saveCustomer failed:', e.message || e);
    }
  }

  // --- PRODUCTS ---
  async getProducts(): Promise<any[]> {
    try {
      const client = this.getClient();
      const { data, error } = await client.from('products').select('*');
      if (error) {
        console.error('Error al leer productos en Supabase:', error.message);
        throw error;
      }
      return (data || []).map(item => ({
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
    } catch (e) {
      console.warn('Supabase fetch products failed:', e);
      return [];
    }
  }

  async saveProduct(product: any): Promise<void> {
    try {
      const client = this.getClient();
      const payload = {
        id: product.id,
        name: product.name,
        description: product.description,
        price: product.price,
        cost: product.cost,
        category: product.category,
        available: product.available,
        image: product.image || '',
        created_at: product.createdAt,
        updated_at: product.updatedAt,
        deleted: product.deleted || false
      };
      const { error } = await client.from('products').upsert(payload);
      if (error) {
        console.error('Error al guardar producto en Supabase:', error.message);
        throw error;
      }
    } catch (e: any) {
      console.warn('Supabase saveProduct failed:', e.message || e);
    }
  }

  // --- ORDERS ---
  async getOrders(): Promise<any[]> {
    try {
      const client = this.getClient();
      const { data, error } = await client.from('orders').select('*');
      if (error) {
        console.error('Error al leer pedidos en Supabase:', error.message);
        throw error;
      }
      return (data || []).map(item => ({
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
    } catch (e) {
      console.warn('Supabase fetch orders failed:', e);
      return [];
    }
  }

  async saveOrder(order: any): Promise<void> {
    try {
      const client = this.getClient();
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
        notes: order.notes,
        created_at: order.createdAt,
        completed_at: order.completedAt || null,
        updated_at: order.updatedAt,
        deleted: order.deleted || false
      };
      const { error } = await client.from('orders').upsert(payload);
      if (error) {
        console.error('Error al guardar pedido en Supabase:', error.message);
        throw error;
      }
    } catch (e: any) {
      console.warn('Supabase saveOrder failed:', e.message || e);
    }
  }

  // --- EXPENSES ---
  async getExpenses(): Promise<any[]> {
    try {
      const client = this.getClient();
      const { data, error } = await client.from('expenses').select('*');
      if (error) {
        console.error('Error al leer gastos en Supabase:', error.message);
        throw error;
      }
      return (data || []).map(item => ({
        id: item.id,
        title: item.title,
        amount: Number(item.amount) || 0,
        category: item.category || 'General',
        date: item.date || item.created_at,
        createdAt: item.created_at || item.createdAt || new Date().toISOString(),
        updatedAt: item.updated_at || item.updatedAt || new Date().toISOString(),
        deleted: item.deleted || false
      }));
    } catch (e) {
      console.warn('Supabase fetch expenses failed:', e);
      return [];
    }
  }

  async saveExpense(expense: any): Promise<void> {
    try {
      const client = this.getClient();
      const payload = {
        id: expense.id,
        title: expense.title,
        amount: expense.amount,
        category: expense.category,
        date: expense.date,
        created_at: expense.createdAt || new Date().toISOString(),
        updated_at: expense.updatedAt || new Date().toISOString(),
        deleted: expense.deleted || false
      };
      const { error } = await client.from('expenses').upsert(payload);
      if (error) {
        console.error('Error al guardar gasto en Supabase:', error.message);
        throw error;
      }
    } catch (e: any) {
      console.warn('Supabase saveExpense failed:', e.message || e);
    }
  }

  // --- NOTES ---
  async getNotes(): Promise<any[]> {
    try {
      const client = this.getClient();
      const { data, error } = await client.from('notes').select('*');
      if (error) {
        console.error('Error al leer notas en Supabase:', error.message);
        throw error;
      }
      return (data || []).map(item => ({
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
    } catch (e) {
      console.warn('Supabase fetch notes failed:', e);
      return [];
    }
  }

  async saveNote(note: any): Promise<void> {
    try {
      const client = this.getClient();
      const payload = {
        id: note.id,
        title: note.title,
        content: note.content,
        items: note.items,
        category: note.category,
        is_pinned: note.isPinned,
        color: note.color,
        created_at: note.createdAt,
        updated_at: note.updatedAt,
        deleted: note.deleted || false
      };
      const { error } = await client.from('notes').upsert(payload);
      if (error) {
        console.error('Error al guardar nota en Supabase:', error.message);
        throw error;
      }
    } catch (e: any) {
      console.warn('Supabase saveNote failed:', e.message || e);
    }
  }
}
