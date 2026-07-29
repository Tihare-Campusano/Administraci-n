import { OrderRepository } from '../repositories/OrderRepository';
import { SupabaseService } from './SupabaseService';
import { Order, OrderItem } from '../models/Order';

export class OrderService {
  private repo = new OrderRepository();
  private supabaseService = new SupabaseService();

  async getAllOrders(): Promise<Order[]> {
    return this.repo.getAll();
  }

  async getOrderById(id: string): Promise<Order | undefined> {
    return this.repo.getById(id);
  }

  async createOrder(data: {
    customerId: string;
    items: OrderItem[];
    discount: number;
    deliveryFee: number;
    paymentMethod: string;
    paymentStatus: 'paid' | 'unpaid';
    notes: string;
  }): Promise<Order> {
    if (data.items.length === 0) {
      throw new Error('Un pedido debe contener al menos un producto');
    }

    const orders = await this.repo.getAll();
    const orderNumber = orders.length + 1;
    const subtotal = data.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const total = subtotal - data.discount + data.deliveryFee;

    const newOrder: Order = {
      id: crypto.randomUUID(),
      orderNumber,
      customerId: data.customerId,
      products: data.items,
      subtotal,
      discount: data.discount,
      deliveryFee: data.deliveryFee,
      total: total < 0 ? 0 : total,
      paymentMethod: data.paymentMethod,
      paymentStatus: data.paymentStatus,
      status: 'pending',
      notes: data.notes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const saved = await this.repo.save(newOrder);
    await this.supabaseService.syncNowIfConfigured();
    return saved;
  }

  async updateOrder(order: Order): Promise<Order> {
    const saved = await this.repo.save(order);
    await this.supabaseService.syncNowIfConfigured();
    return saved;
  }

  async completeOrder(id: string): Promise<Order> {
    const order = await this.repo.getById(id);
    if (!order) throw new Error('Pedido no encontrado');

    order.status = 'completed';
    order.completedAt = new Date().toISOString();
    order.updatedAt = new Date().toISOString();
    const saved = await this.repo.save(order);
    await this.supabaseService.syncNowIfConfigured();
    return saved;
  }

  async cancelOrder(id: string): Promise<Order> {
    const order = await this.repo.getById(id);
    if (!order) throw new Error('Pedido no encontrado');

    order.status = 'cancelled';
    order.completedAt = new Date().toISOString();
    order.updatedAt = new Date().toISOString();
    const saved = await this.repo.save(order);
    await this.supabaseService.syncNowIfConfigured();
    return saved;
  }

  async togglePaymentStatus(id: string): Promise<Order> {
    const order = await this.repo.getById(id);
    if (!order) throw new Error('Pedido no encontrado');

    order.paymentStatus = order.paymentStatus === 'paid' ? 'unpaid' : 'paid';
    order.updatedAt = new Date().toISOString();
    const saved = await this.repo.save(order);
    await this.supabaseService.syncNowIfConfigured();
    return saved;
  }

  async deleteOrderRecord(id: string): Promise<void> {
    await this.repo.delete(id);
    await this.supabaseService.syncNowIfConfigured();
  }
}
