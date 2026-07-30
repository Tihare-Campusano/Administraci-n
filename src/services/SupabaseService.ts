import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Logger } from '../utils/Logger';

export const SUPABASE_URL = 'https://atmnawbmvvfjdkkwkdwm.supabase.co';
export const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF0bW5hd2JtdnZmamRra3drZHdtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUxOTQ5MjIsImV4cCI6MjEwMDc3MDkyMn0.UX58TjLoemo6_OlosbUCW3Odm5Y1EW7xrch3kqgE-d8';

export class SupabaseService {
  private static instance: SupabaseClient | null = null;

  public getClient(): SupabaseClient {
    if (!SupabaseService.instance) {
      SupabaseService.instance = createClient(
        SUPABASE_URL,
        SUPABASE_ANON_KEY,
        {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false
          }
        }
      );

      Logger.info(
        'system',
        'INITIALIZE_SUPABASE_CLIENT',
        { url: SUPABASE_URL }
      );
    }

    return SupabaseService.instance;
  }

  //===========================================
  // MÉTODOS GENÉRICOS
  //===========================================

  private async getAll(table: string): Promise<any[]> {
    const startTime = performance.now();

    try {
      const client = this.getClient();

      const { data, error } = await client
        .from(table)
        .select('*');

      const durationMs = Math.round(performance.now() - startTime);

      if (error) {
        Logger.error(table, 'SELECT', null, error, durationMs);
        throw error;
      }

      const activeData = (data || []).filter(item => item.deleted !== true);

      Logger.info(
        table,
        'SELECT',
        { count: activeData.length },
        activeData,
        durationMs
      );

      return activeData;
    } catch (e: any) {
      Logger.error(table, 'SELECT_EXCEPTION', null, e);
      return [];
    }
  }

  private async save(
    table: string,
    payload: any
  ): Promise<void> {
    const startTime = performance.now();

    try {

      if (!payload.id && table !== 'app_settings') {
        throw new Error(`El registro de ${table} no tiene ID.`);
      }

      payload.updated_at = new Date().toISOString();

      if (!payload.created_at && table !== 'app_settings') {
        payload.created_at = new Date().toISOString();
      }

      const client = this.getClient();

      const options =
        table === 'app_settings'
          ? { onConflict: 'key' }
          : { onConflict: 'id' };

      const { data, error } =
        await client
          .from(table)
          .upsert(payload, options)
          .select();

      const durationMs = Math.round(
        performance.now() - startTime
      );

      if (error) {
        Logger.error(
          table,
          'UPSERT',
          payload,
          error,
          durationMs
        );
        throw error;
      }

      Logger.info(
        table,
        'UPSERT',
        payload,
        data,
        durationMs
      );

    } catch (e: any) {

      Logger.error(
        table,
        'UPSERT_EXCEPTION',
        payload,
        e
      );

      throw e;
    }
  }

  async deleteRow(table: string, id: string): Promise<void> {
    const startTime = performance.now();
    try {
      const client = this.getClient();
      const { error } = await client.from(table).delete().eq('id', id);
      const durationMs = Math.round(performance.now() - startTime);

      if (error) {
        Logger.error(table, 'DELETE', { id }, error, durationMs);
        throw error;
      }

      Logger.info(table, 'DELETE', { id }, null, durationMs);
    } catch (e: any) {
      Logger.error(table, 'DELETE_EXCEPTION', { id }, e);
      throw e;
    }
  }

  //===========================================
  // CUSTOMERS
  //===========================================

  async getCustomers(): Promise<any[]> {

    const rows = await this.getAll('customers');

    return rows.map(item => ({
      id: item.id,
      name: item.name,
      phone: item.phone ?? '',
      address: item.address ?? '',
      notes: item.notes ?? '',
      createdAt: item.created_at,
      updatedAt: item.updated_at,
      deleted: item.deleted ?? false
    }));

  }

  async saveCustomer(customer: any): Promise<void> {

    await this.save('customers', {

      id: customer.id,

      name: customer.name,

      phone: customer.phone ?? '',

      address: customer.address ?? '',

      notes: customer.notes ?? '',

      created_at:
        customer.createdAt,

      updated_at:
        customer.updatedAt,

      deleted:
        customer.deleted ?? false

    });

  }

  //===========================================
  // PRODUCTS
  //===========================================

  async getProducts(): Promise<any[]> {

    const rows =
      await this.getAll('products');

    return rows.map(item => ({

      id: item.id,

      name: item.name,

      description:
        item.description ?? '',

      price:
        Number(item.price) || 0,

      cost:
        Number(item.cost) || 0,

      category:
        item.category ?? 'General',

      available:
        item.available !== false,

      image:
        item.image ?? '',

      createdAt:
        item.created_at,

      updatedAt:
        item.updated_at,

      deleted:
        item.deleted ?? false

    }));

  }

  async saveProduct(product: any): Promise<void> {

    await this.save('products', {

      id: product.id,

      name: product.name,

      description:
        product.description ?? '',

      price:
        Number(product.price) || 0,

      cost:
        Number(product.cost) || 0,

      category:
        product.category ?? 'General',

      available:
        product.available !== false,

      image:
        product.image ?? '',

      created_at:
        product.createdAt,

      updated_at:
        product.updatedAt,

      deleted:
        product.deleted ?? false

    });

  }

  //===========================================
  // ORDERS
  //===========================================

  async getOrders(): Promise<any[]> {

    const rows = await this.getAll('orders');

    return rows.map(item => ({

      id: item.id,

      orderNumber:
        item.order_number ?? 1,

      customerId:
        item.customer_id ?? null,

      products:
        Array.isArray(item.products)
          ? item.products
          : (item.products ?? []),

      subtotal:
        Number(item.subtotal) || 0,

      discount:
        Number(item.discount) || 0,

      deliveryFee:
        Number(item.delivery_fee) || 0,

      total:
        Number(item.total) || 0,

      paymentMethod:
        item.payment_method ?? 'Efectivo',

      paymentStatus:
        item.payment_status ?? 'unpaid',

      status:
        item.status ?? 'pending',

      notes:
        item.notes ?? '',

      createdAt:
        item.created_at,

      completedAt:
        item.completed_at,

      updatedAt:
        item.updated_at,

      deleted:
        item.deleted ?? false

    }));

  }

  async saveOrder(order: any): Promise<void> {

    await this.save('orders', {

      id:
        order.id,

      order_number:
        order.orderNumber ?? 1,

      customer_id:
        order.customerId ?? null,

      products:
        order.products ?? [],

      subtotal:
        Number(order.subtotal) || 0,

      discount:
        Number(order.discount) || 0,

      delivery_fee:
        Number(order.deliveryFee) || 0,

      total:
        Number(order.total) || 0,

      payment_method:
        order.paymentMethod ?? 'Efectivo',

      payment_status:
        order.paymentStatus ?? 'unpaid',

      status:
        order.status ?? 'pending',

      notes:
        order.notes ?? '',

      created_at:
        order.createdAt,

      completed_at:
        order.completedAt ?? null,

      updated_at:
        order.updatedAt,

      deleted:
        order.deleted ?? false

    });

  }

  //===========================================
  // EXPENSES
  //===========================================

  async getExpenses(): Promise<any[]> {

    const rows =
      await this.getAll('expenses');

    return rows.map(item => ({

      id:
        item.id,

      title:
        item.title,

      amount:
        Number(item.amount) || 0,

      category:
        item.category ?? 'General',

      date:
        item.date,

      createdAt:
        item.created_at,

      updatedAt:
        item.updated_at,

      deleted:
        item.deleted ?? false

    }));

  }

  async saveExpense(expense: any): Promise<void> {

    await this.save('expenses', {

      id:
        expense.id,

      title:
        expense.title,

      amount:
        Number(expense.amount) || 0,

      category:
        expense.category ?? 'General',

      date:
        expense.date ?? new Date().toISOString(),

      created_at:
        expense.createdAt,

      updated_at:
        expense.updatedAt,

      deleted:
        expense.deleted ?? false

    });

  }

  //===========================================
  // NOTES
  //===========================================

  async getNotes(): Promise<any[]> {

    const rows =
      await this.getAll('notes');

    return rows.map(item => ({

      id:
        item.id,

      title:
        item.title,

      content:
        item.content ?? '',

      items:
        Array.isArray(item.items)
          ? item.items
          : (item.items ?? []),

      category:
        item.category ?? 'General',

      isPinned:
        item.is_pinned ?? false,

      color:
        item.color ?? '#ec4899',

      createdAt:
        item.created_at,

      updatedAt:
        item.updated_at,

      deleted:
        item.deleted ?? false

    }));

  }

  async saveNote(note: any): Promise<void> {
    const payload: any = {
      id: note.id,
      title: note.title,
      content: note.content ?? '',
      items: note.items ?? [],
      category: note.category ?? 'General',
      is_pinned: note.isPinned ?? false,
      color: note.color ?? '#ec4899',
      created_at: note.createdAt,
      updated_at: note.updatedAt,
      deleted: note.deleted ?? false
    };

    try {
      await this.save('notes', payload);
    } catch (e: any) {
      // Si la tabla 'notes' en Supabase aún no tiene la columna 'items', reintentar sin 'items'
      if (e?.message?.includes('items') || e?.details?.includes('items')) {
        delete payload.items;
        await this.save('notes', payload).catch(() => {});
      } else {
        throw e;
      }
    }
  }

  //===========================================
  // APP SETTINGS
  //===========================================

  async getSetting(key: string): Promise<any | null> {

    const startTime = performance.now();

    try {

      const client = this.getClient();

      const { data, error } = await client
        .from('app_settings')
        .select('value')
        .eq('key', key)
        .single();

      const durationMs =
        Math.round(performance.now() - startTime);

      if (error) {

        if (error.code !== 'PGRST116') {

          Logger.warn(
            'settings',
            'GET_SETTING',
            { key },
            error,
            durationMs
          );

        }

        return null;

      }

      Logger.info(
        'settings',
        'GET_SETTING',
        { key },
        data,
        durationMs
      );

      return data?.value ?? null;

    } catch (e: any) {

      Logger.error(
        'settings',
        'GET_SETTING_EXCEPTION',
        { key },
        e
      );

      return null;

    }

  }

  async saveSetting(
    key: string,
    value: any
  ): Promise<void> {

    const payload = {

      key,

      value,

      updated_at:
        new Date().toISOString()

    };

    await this.save(
      'app_settings',
      payload
    );

  }

  async deleteSetting(key: string): Promise<void> {
    try {
      const client = this.getClient();
      await client.from('app_settings').delete().eq('key', key);
    } catch (e) {}
  }
}