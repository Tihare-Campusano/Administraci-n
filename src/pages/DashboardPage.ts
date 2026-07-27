import { Chart } from 'chart.js/auto';
import { ExpenseService } from '../services/ExpenseService';
import { OrderService } from '../services/OrderService';
import { formatMoney } from '../utils/formatters';

export class DashboardPage {
  private expenseService = new ExpenseService();
  private orderService = new OrderService();
  private chartInstance: Chart | null = null;
  private onOpenOrderModal: () => void = () => {};

  init(onOpenOrderModal: () => void): void {
    this.onOpenOrderModal = onOpenOrderModal;
    document.getElementById('dashboard-new-order-btn')?.addEventListener('click', () => this.onOpenOrderModal());
  }

  async load(): Promise<void> {
    try {
      const stats = await this.expenseService.getFinancialStats();
      this.updateStatsUI(stats);

      const orders = await this.orderService.getAllOrders();
      const completed = orders.filter(o => o.status === 'completed');
      
      this.renderTopProducts(completed);
      this.renderChart(completed);
    } catch (err) {
      console.error('Error loading dashboard stats', err);
    }
  }

  private updateStatsUI(stats: any): void {
    const today = document.getElementById('stats-income-today');
    const month = document.getElementById('stats-income-month');
    const active = document.getElementById('stats-orders-active');
    const pending = document.getElementById('stats-payments-pending');

    if (today) today.textContent = formatMoney(stats.earnedToday);
    if (month) month.textContent = formatMoney(stats.netProfit); // Shows monthly net profit! Or stats.earnedMonth
    if (active) active.textContent = stats.activeOrdersCount.toString();
    if (pending) pending.textContent = formatMoney(stats.pendingCobro);
  }

  private renderTopProducts(completedOrders: any[]): void {
    const list = document.getElementById('top-products-list');
    if (!list) return;
    list.innerHTML = '';

    const productSalesMap = new Map<string, { qty: number, revenue: number, name: string }>();
    completedOrders.forEach(order => {
      order.products.forEach((item: any) => {
        const prod = productSalesMap.get(item.productId) || { qty: 0, revenue: 0, name: item.name };
        prod.qty += item.quantity;
        prod.revenue += item.quantity * item.price;
        productSalesMap.set(item.productId, prod);
      });
    });

    const sorted = Array.from(productSalesMap.values()).sort((a, b) => b.qty - a.qty);
    if (sorted.length === 0) {
      list.innerHTML = `<div class="empty-state" style="padding:1rem;"><p>Completa pedidos para ver estadísticas de tus platos estrella.</p></div>`;
      return;
    }

    list.innerHTML = sorted.slice(0, 5).map((stat, i) => `
      <div class="product-rank-item rank-${i + 1}">
        <div class="rank-badge">${i + 1}</div>
        <div class="rank-name-desc">
          <span class="rank-name">${stat.name}</span>
          <span class="rank-sales">${stat.qty} vendidos</span>
        </div>
        <span class="rank-revenue">${formatMoney(stat.revenue)}</span>
      </div>
    `).join('');
  }

  private renderChart(completedOrders: any[]): void {
    const canvas = document.getElementById('salesChart') as HTMLCanvasElement;
    if (!canvas) return;

    if (this.chartInstance) {
      this.chartInstance.destroy();
    }

    const { labels, data } = this.calculateChartData(completedOrders);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const gradient = ctx.createLinearGradient(0, 0, 0, 300);
    gradient.addColorStop(0, 'rgba(249, 115, 22, 0.4)');
    gradient.addColorStop(1, 'rgba(249, 115, 22, 0.0)');

    this.chartInstance = new Chart(canvas, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          data,
          borderColor: '#f97316',
          borderWidth: 3,
          backgroundColor: gradient,
          fill: true,
          tension: 0.35
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { color: 'rgba(255, 255, 255, 0.05)' }, ticks: { color: '#94a3b8' } },
          y: { grid: { color: 'rgba(255, 255, 255, 0.05)' }, ticks: { color: '#94a3b8', callback: (val) => '$' + val } }
        }
      }
    });
  }

  private calculateChartData(completedOrders: any[]) {
    const labels: string[] = [];
    const data: number[] = [];
    const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      labels.push(`${days[d.getDay()]} ${d.getDate()}`);

      const dateStr = d.toDateString();
      const dayTotal = completedOrders
        .filter(o => new Date(o.createdAt).toDateString() === dateStr)
        .reduce((sum, o) => sum + o.total, 0);

      data.push(dayTotal);
    }

    return { labels, data };
  }
}
