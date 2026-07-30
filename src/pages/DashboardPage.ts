import { Chart } from 'chart.js/auto';
import { ExpenseService } from '../services/ExpenseService';
import { OrderService } from '../services/OrderService';
import { formatMoney } from '../utils/formatters';

export class DashboardPage {
  private expenseService = new ExpenseService();
  private orderService = new OrderService();
  private chartInstance: Chart | null = null;
  private onOpenOrderModal: () => void = () => {};

  private activeVinaFilter = 'all';

  private vinaSuppliers = [
    {
      id: 'vina_1',
      name: 'Dolce Mundo',
      category: 'premium',
      categoryLabel: '⭐ Calidad / Coberturas',
      specialty: 'Coberturas de Chocolate, Boquillas, Moldes de Silicona y Fondant',
      rating: '⭐ 4.9 (Más variada)',
      address: 'Calle Arlegui 440, Viña del Mar Centro',
      phone: '+56 9 8765 4321',
      mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Dolce+Mundo+Arlegui+Vina+del+Mar',
      badgeColor: '#ec4899'
    },
    {
      id: 'vina_2',
      name: 'La Veguita (Sector Mercado)',
      category: 'economic',
      categoryLabel: '💰 Mayorista Económico',
      specialty: 'Mantequillas por bloque, Harinas por saco, Azúcar Flor y Cremas Vegetales',
      rating: '⭐ 4.8 (Mejor Precio)',
      address: 'Sector Mercado Municipal / Viana, Viña del Mar',
      phone: '+56 9 1234 5678',
      mapsUrl: 'https://www.google.com/maps/search/?api=1&query=La+Veguita+Mercado+Vina+del+Mar',
      badgeColor: '#10b981'
    },
    {
      id: 'vina_3',
      name: 'El Tostadito',
      category: 'economic',
      categoryLabel: '🌰 Frutos Secos & Harinas',
      specialty: 'Harina de Almendras, Frutos Secos por Kilo, Esencias y Semillas',
      rating: '⭐ 4.8 (Frescura Garantizada)',
      address: 'Calle Valparaíso / Centro Viña del Mar',
      phone: '+56 9 5555 4444',
      mapsUrl: 'https://www.google.com/maps/search/?api=1&query=El+Tostadito+Valparaiso+Vina+del+Mar',
      badgeColor: '#f59e0b'
    },
    {
      id: 'vina_4',
      name: 'Comercial Centro Abasto',
      category: 'packaging',
      categoryLabel: '📦 Cajas & Packaging',
      specialty: 'Cajas para Tortas y Cupcakes, Envases Delivery, Moldes de Aluminio y Papel Mantequilla',
      rating: '⭐ 4.7 (Especialista en Cajas)',
      address: 'Calle Viana / Álvarez, Viña del Mar',
      phone: '+56 9 9999 8888',
      mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Centro+Abasto+Viana+Vina+del+Mar',
      badgeColor: '#3b82f6'
    },
    {
      id: 'vina_5',
      name: 'Distribuidora Horneadas & Repostería',
      category: 'premium',
      categoryLabel: '🍰 Premezclas & Insumos',
      specialty: 'Premezclas de Bizcochuelo, Colorantes en Gel, Chispas de Chocolate e Insumos Profesionales',
      rating: '⭐ 4.7 (Stock Constante)',
      address: 'Viña del Mar Centro',
      phone: '+56 9 7777 6666',
      mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Distribuidora+Reposteria+Vina+del+Mar',
      badgeColor: '#8b5cf6'
    },
    {
      id: 'vina_6',
      name: 'Empaques & PlasViña',
      category: 'packaging',
      categoryLabel: '📦 Domos & Cajas Altas',
      specialty: 'Domos transparentes para tortas altas, cajas térmicas, envases compostables y vasos postre',
      rating: '⭐ 4.9 (Especialista en Empaques)',
      address: 'Calle Viana 880, Viña del Mar',
      phone: '+56 9 3333 2222',
      mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Empaques+Plasvina+Vina+del+Mar',
      badgeColor: '#06b6d4'
    },
    {
      id: 'vina_7',
      name: 'ColorChef Viña',
      category: 'colors',
      categoryLabel: '🎨 Colorantes & Decoración',
      specialty: 'Colorantes en gel Wilton/Enco, matizadores liposolubles para chocolate, glitters y perlas',
      rating: '⭐ 4.9 (Colorantes Pro)',
      address: 'Av. Libertad / 4 Poniente, Viña del Mar',
      phone: '+56 9 4444 1111',
      mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Colorantes+ColorChef+Vina+del+Mar',
      badgeColor: '#f43f5e'
    },
    {
      id: 'vina_8',
      name: 'Plásticos & Envases Valparaíso-Viña',
      category: 'packaging',
      categoryLabel: '📦 Cajas con Ventana & MDF',
      specialty: 'Cajas cuadradas con ventana, bases rígidas de MDF, blondas de papel y cintas satinadas',
      rating: '⭐ 4.8 (Variedad en Cajas)',
      address: 'Calle Álvarez / Echevers, Viña del Mar',
      phone: '+56 9 2222 8888',
      mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Envases+y+Packaging+Vina+del+Mar',
      badgeColor: '#3b82f6'
    },
    {
      id: 'vina_9',
      name: 'Arte & Dulce Repostería Viña',
      category: 'colors',
      categoryLabel: '🎨 Papel de Arroz & Adornos',
      specialty: 'Impresiones comestibles en papel de arroz/azúcar, cortadores de galletas y aerografía pastelera',
      rating: '⭐ 4.8 (Impresiones Comestibles)',
      address: 'Calle Arlegui / Plaza Sucre, Viña del Mar',
      phone: '+56 9 6666 9999',
      mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Arte+y+Dulce+Reposteria+Vina+del+Mar',
      badgeColor: '#a855f7'
    },
    {
      id: 'vina_10',
      name: 'Comercial Quillota-Viña (Empaques)',
      category: 'packaging',
      categoryLabel: '📦 Mangas & Cajas por Mayor',
      specialty: 'Mangas desechables profesionales, duyas/picos inox y cajas de torta por bulto/paquete',
      rating: '⭐ 4.7 (Precio por Mayor)',
      address: 'Sector 15 Norte / Mall Marina Oriente, Viña del Mar',
      phone: '+56 9 1111 7777',
      mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Comercial+Empaques+Reposteria+Vina+del+Mar',
      badgeColor: '#14b8a6'
    }
  ];

  init(onOpenOrderModal: () => void): void {
    this.onOpenOrderModal = onOpenOrderModal;
    document.getElementById('dashboard-new-order-btn')?.addEventListener('click', () => this.onOpenOrderModal());

    document.querySelectorAll('#vina-supplier-filters .samsung-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        document.querySelectorAll('#vina-supplier-filters .samsung-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        this.activeVinaFilter = pill.getAttribute('data-filter') || 'all';
        this.renderVinaSuppliers();
      });
    });
  }

  async load(): Promise<void> {
    try {
      const stats = await this.expenseService.getFinancialStats();
      this.updateStatsUI(stats);

      const orders = await this.orderService.getAllOrders();
      const completed = orders.filter(o => o.status === 'completed');
      
      this.renderTopProducts(completed);
      this.renderChart(completed);
      this.renderVinaSuppliers();
    } catch (err) {
      console.error('Error loading dashboard stats', err);
    }
  }

  private renderVinaSuppliers(): void {
    const grid = document.getElementById('vina-suppliers-grid');
    if (!grid) return;

    let filtered = this.vinaSuppliers;
    if (this.activeVinaFilter !== 'all') {
      filtered = this.vinaSuppliers.filter(s => s.category === this.activeVinaFilter);
    }

    grid.innerHTML = filtered.map(sup => `
      <div class="glass-card catalog-card" style="border-top: 3px solid ${sup.badgeColor}; padding: 1.1rem; display: flex; flex-direction: column; justify-content: space-between;">
        <div>
          <div class="catalog-card-header" style="margin-bottom: 6px;">
            <span class="catalog-card-title" style="font-size: 1rem;">${sup.name}</span>
            <span class="catalog-card-badge" style="background: rgba(255,255,255,0.06); color: ${sup.badgeColor}; border: 1px solid ${sup.badgeColor}; font-size: 0.72rem;">
              ${sup.categoryLabel}
            </span>
          </div>

          <div style="font-size: 0.8rem; color: #f59e0b; font-weight: 700; margin-bottom: 6px;">
            ${sup.rating}
          </div>

          <p style="font-size: 0.82rem; color: var(--text-secondary); margin-bottom: 8px; line-height: 1.35;">
            <strong>Especialidad:</strong> ${sup.specialty}
          </p>

          <div style="font-size: 0.78rem; color: var(--text-muted); display: flex; align-items: center; gap: 4px; margin-bottom: 12px;">
            📍 <span>${sup.address}</span>
          </div>
        </div>

        <div style="display: flex; gap: 8px; border-top: 1px solid var(--border-glass); padding-top: 8px;">
          <a href="${sup.mapsUrl}" target="_blank" class="btn btn-secondary btn-sm" style="flex: 1; text-align: center; text-decoration: none; font-size: 0.78rem; display: inline-flex; align-items: center; justify-content: center; gap: 4px;">
            🗺️ Ver Mapa
          </a>
          <a href="https://wa.me/56987654321?text=Hola,%20quisiera%20consultar%20precio%20de%20insumos%20de%20reposter%C3%ADa" target="_blank" class="btn btn-primary btn-sm" style="flex: 1; text-align: center; text-decoration: none; font-size: 0.78rem; display: inline-flex; align-items: center; justify-content: center; gap: 4px; background: #10b981; border-color: #10b981;">
            💬 Cotizar
          </a>
        </div>
      </div>
    `).join('');
  }

  private updateStatsUI(stats: any): void {
    const today = document.getElementById('stats-income-today');
    const month = document.getElementById('stats-income-month');
    const active = document.getElementById('stats-orders-active');
    const pending = document.getElementById('stats-payments-pending');

    if (today) today.textContent = formatMoney(stats.earnedToday);
    if (month) month.textContent = formatMoney(stats.earnedMonth);
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
