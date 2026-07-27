import { OrderService } from '../services/OrderService';
import { CustomerService } from '../services/CustomerService';
import { formatMoney, formatDate } from '../utils/formatters';
import { showToast } from '../components/Toast';

export class ActiveOrdersPage {
  private orderService = new OrderService();
  private customerService = new CustomerService();
  private onOpenOrderModal: (id: string) => void = () => {};
  private onReloadNeeded: () => void = () => {};

  init(onOpenOrderModal: (id: string) => void, onReloadNeeded: () => void): void {
    this.onOpenOrderModal = onOpenOrderModal;
    this.onReloadNeeded = onReloadNeeded;
    document.getElementById('orders-new-order-btn')?.addEventListener('click', () => this.onOpenOrderModal(''));
  }

  async load(): Promise<void> {
    const grid = document.getElementById('active-orders-grid');
    if (!grid) return;
    grid.innerHTML = '<div class="empty-state">Cargando pedidos...</div>';

    try {
      const orders = await this.orderService.getAllOrders();
      const customers = await this.customerService.getAllCustomers();
      const custMap = new Map(customers.map(c => [c.id, c.name]));
      
      const active = orders.filter(o => o.status === 'pending');
      active.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

      if (active.length === 0) {
        this.renderEmptyState(grid);
        return;
      }
      this.renderOrders(grid, active, custMap);
    } catch (err) {
      grid.innerHTML = '<div class="empty-state">Error al cargar pedidos activos.</div>';
    }
  }

  private renderEmptyState(grid: HTMLElement): void {
    grid.innerHTML = `
      <div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/></svg>
        <h3>No hay pedidos activos</h3>
        <p>¡Buen trabajo! Has completado todas tus órdenes o no has tomado un pedido nuevo aún.</p>
      </div>
    `;
  }

  private renderOrders(grid: HTMLElement, activeOrders: any[], custMap: Map<string, string>): void {
    grid.innerHTML = activeOrders.map(order => {
      const itemsMarkup = order.products.map((item: any) => `
        <div class="order-item-row">
          <span class="item-qty-name">${item.quantity}x ${item.name}</span>
          <span class="item-price">${formatMoney(item.price * item.quantity)}</span>
        </div>
      `).join('');

      const paymentBadge = order.paymentStatus === 'paid'
        ? '<span class="order-status-badge status-paid">Pagado</span>'
        : '<span class="order-status-badge status-unpaid">Pendiente</span>';
      
      const clientName = custMap.get(order.customerId) || 'Cliente Desconocido';

      return `
        <div class="glass-card order-card ${order.paymentStatus}" id="order-card-${order.id}">
          <div class="order-header">
            <div class="order-meta">
              <span class="order-num">Pedido #${order.orderNumber}</span>
              <span class="order-time">${formatDate(order.createdAt)}</span>
            </div>
            ${paymentBadge}
          </div>
          <div class="order-client">👤 <strong>${clientName}</strong></div>
          <div class="order-items">${itemsMarkup}</div>
          ${order.notes ? `<div style="font-size:0.8rem; color:var(--text-secondary); background:rgba(255,255,255,0.02); padding:6px 10px; border-radius:var(--radius-sm); margin-top:4px;">📝 <em>${order.notes}</em></div>` : ''}
          <div class="order-summary">
            <div>
              <span class="order-total-label">Total c/envío:</span>
              <div class="order-total-val">${formatMoney(order.total)}</div>
            </div>
            <div class="order-actions-row">
              <button class="btn btn-secondary btn-sm toggle-payment-btn" data-id="${order.id}">${order.paymentStatus === 'paid' ? 'Deber' : 'Cobrar'}</button>
              <button class="btn btn-primary btn-sm complete-order-btn" data-id="${order.id}">Listo ✅</button>
            </div>
          </div>
          <div class="order-actions-row" style="margin-top: 4px; justify-content: flex-end;">
            <button class="btn btn-secondary btn-sm edit-order-btn" data-id="${order.id}">Editar</button>
            <button class="btn btn-danger btn-sm cancel-order-btn" data-id="${order.id}">Cancelar</button>
          </div>
        </div>
      `;
    }).join('');

    this.bindActionButtons();
  }

  private bindActionButtons(): void {
    document.querySelectorAll('.complete-order-btn').forEach(btn => {
      btn.addEventListener('click', () => this.completeOrder(btn.getAttribute('data-id') || ''));
    });
    document.querySelectorAll('.toggle-payment-btn').forEach(btn => {
      btn.addEventListener('click', () => this.togglePayment(btn.getAttribute('data-id') || ''));
    });
    document.querySelectorAll('.edit-order-btn').forEach(btn => {
      btn.addEventListener('click', () => this.onOpenOrderModal(btn.getAttribute('data-id') || ''));
    });
    document.querySelectorAll('.cancel-order-btn').forEach(btn => {
      btn.addEventListener('click', () => this.cancelOrder(btn.getAttribute('data-id') || ''));
    });
  }

  private async completeOrder(id: string): Promise<void> {
    const card = document.getElementById(`order-card-${id}`);
    card?.classList.add('completing');

    setTimeout(async () => {
      try {
        await this.orderService.completeOrder(id);
        showToast('¡Pedido completado con éxito!');
        this.onReloadNeeded();
        this.load();
      } catch (err) {
        showToast('Error al completar pedido', 'danger');
      }
    }, 400);
  }

  private async togglePayment(id: string): Promise<void> {
    try {
      const order = await this.orderService.togglePaymentStatus(id);
      showToast(`Pedido actualizado como ${order.paymentStatus === 'paid' ? 'Pagado' : 'Pendiente'}`);
      this.onReloadNeeded();
      this.load();
    } catch (err) {
      showToast('Error al actualizar pago', 'danger');
    }
  }

  private async cancelOrder(id: string): Promise<void> {
    if (confirm('¿Deseas cancelar este pedido? Se moverá al historial como Cancelado.')) {
      try {
        await this.orderService.cancelOrder(id);
        showToast('Pedido cancelado', 'danger');
        this.onReloadNeeded();
        this.load();
      } catch (err) {
        showToast('Error al cancelar pedido', 'danger');
      }
    }
  }
}
