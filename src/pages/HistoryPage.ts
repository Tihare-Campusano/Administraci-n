import { OrderService } from '../services/OrderService';
import { CustomerService } from '../services/CustomerService';
import { formatMoney, formatDate } from '../utils/formatters';
import { showToast } from '../components/Toast';

export class HistoryPage {
  private orderService = new OrderService();
  private customerService = new CustomerService();
  
  private searchQuery = '';
  private paymentFilter = 'all';
  private dateFilter = 'all';
  private onReloadNeeded: () => void = () => {};

  init(onReloadNeeded: () => void): void {
    this.onReloadNeeded = onReloadNeeded;
    
    document.getElementById('history-search')?.addEventListener('input', (e) => {
      this.searchQuery = (e.target as HTMLInputElement).value.toLowerCase();
      this.load();
    });
    
    document.getElementById('filter-payment')?.addEventListener('change', (e) => {
      this.paymentFilter = (e.target as HTMLSelectElement).value;
      this.load();
    });
    
    document.getElementById('filter-date')?.addEventListener('change', (e) => {
      this.dateFilter = (e.target as HTMLSelectElement).value;
      this.load();
    });
  }

  async load(): Promise<void> {
    const tbody = document.getElementById('history-table-body');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="7" class="empty-state">Cargando historial...</td></tr>';

    try {
      const orders = await this.orderService.getAllOrders();
      const customers = await this.customerService.getAllCustomers();
      const custMap = new Map(customers.map(c => [c.id, c.name]));
      
      const filtered = this.applyFilters(orders, custMap);
      
      if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="empty-state">No se encontraron ventas registradas.</td></tr>';
        return;
      }
      
      this.renderTable(tbody, filtered, custMap);
    } catch (err) {
      tbody.innerHTML = '<tr><td colspan="7" class="empty-state">Error al cargar historial.</td></tr>';
    }
  }

  private applyFilters(orders: any[], custMap: Map<string, string>): any[] {
    // Sort newest first
    const sorted = [...orders].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    return sorted.filter(order => {
      const name = (custMap.get(order.customerId) || '').toLowerCase();
      const matchesSearch = name.includes(this.searchQuery) || order.orderNumber.toString().includes(this.searchQuery);
      
      let matchesPayment = true;
      if (this.paymentFilter === 'paid') matchesPayment = order.paymentStatus === 'paid';
      else if (this.paymentFilter === 'unpaid') matchesPayment = order.paymentStatus === 'unpaid';

      let matchesDate = true;
      if (this.dateFilter !== 'all') {
        const orderDate = new Date(order.createdAt);
        const today = new Date();
        if (this.dateFilter === 'today') {
          matchesDate = orderDate.toDateString() === today.toDateString();
        } else if (this.dateFilter === 'week') {
          const weekAgo = new Date();
          weekAgo.setDate(today.getDate() - 7);
          matchesDate = orderDate >= weekAgo;
        } else if (this.dateFilter === 'month') {
          matchesDate = orderDate.getMonth() === today.getMonth() && orderDate.getFullYear() === today.getFullYear();
        }
      }

      return matchesSearch && matchesPayment && matchesDate;
    });
  }

  private renderTable(tbody: HTMLElement, orders: any[], custMap: Map<string, string>): void {
    tbody.innerHTML = orders.map(order => {
      const itemsString = order.products.map((p: any) => `${p.quantity}x ${p.name}`).join(', ');
      const clientName = custMap.get(order.customerId) || 'Cliente Desconocido';
      
      let statusBadge = '';
      if (order.status === 'cancelled') {
        statusBadge = '<span class="order-status-badge status-unpaid" style="background:rgba(239,68,68,0.08); color:var(--danger)">Cancelado</span>';
      } else {
        statusBadge = order.paymentStatus === 'paid'
          ? '<span class="order-status-badge status-paid" style="cursor:pointer;">Pagado</span>'
          : '<span class="order-status-badge status-unpaid" style="cursor:pointer; background:rgba(245,158,11,0.08); color:var(--warning)">Pendiente</span>';
      }

      return `
        <tr>
          <td><strong>#${order.orderNumber}</strong></td>
          <td>${formatDate(order.createdAt)}</td>
          <td>${clientName}</td>
          <td style="max-width:250px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${itemsString}">${itemsString}</td>
          <td><strong>${formatMoney(order.total)}</strong></td>
          <td><div class="payment-badge-click" data-id="${order.id}">${statusBadge}</div></td>
          <td>
            <button class="btn btn-danger btn-sm delete-history-btn" data-id="${order.id}" style="padding:4px 8px; font-size:0.75rem;">Eliminar</button>
          </td>
        </tr>
      `;
    }).join('');

    this.bindTableEvents();
  }

  private bindTableEvents(): void {
    document.querySelectorAll('.payment-badge-click').forEach(elem => {
      elem.addEventListener('click', () => this.togglePayment(elem.getAttribute('data-id') || ''));
    });
    document.querySelectorAll('.delete-history-btn').forEach(btn => {
      btn.addEventListener('click', () => this.deleteOrder(btn.getAttribute('data-id') || ''));
    });
  }

  private async togglePayment(id: string): Promise<void> {
    try {
      await this.orderService.togglePaymentStatus(id);
      showToast('Estado de pago actualizado');
      this.onReloadNeeded();
      this.load();
    } catch (err) {
      showToast('Error al actualizar pago', 'danger');
    }
  }

  private async deleteOrder(id: string): Promise<void> {
    if (confirm('¿Deseas eliminar permanentemente esta venta de los registros?')) {
      try {
        await this.orderService.deleteOrderRecord(id);
        showToast('Registro de venta eliminado');
        this.onReloadNeeded();
        this.load();
      } catch (err) {
        showToast('Error al eliminar registro', 'danger');
      }
    }
  }
}
