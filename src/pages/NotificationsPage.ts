import { NotificationService } from '../services/NotificationService';
import { formatDate } from '../utils/formatters';
import { showToast } from '../components/Toast';

export class NotificationsPage {
  private notificationService = new NotificationService();
  private currentFilter = 'all';
  private searchQuery = '';

  init(): void {
    const searchInput = document.getElementById('notif-search-input') as HTMLInputElement;
    searchInput?.addEventListener('input', (e) => {
      this.searchQuery = (e.target as HTMLInputElement).value.toLowerCase();
      this.render();
    });

    document.querySelectorAll('#notif-pills-bar .samsung-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        document.querySelectorAll('#notif-pills-bar .samsung-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        this.currentFilter = pill.getAttribute('data-filter') || 'all';
        this.render();
      });
    });

    document.getElementById('btn-clear-all-notifs')?.addEventListener('click', async () => {
      if (confirm('¿Deseas marcar todas las notificaciones como leídas?')) {
        await this.notificationService.markAllAsRead();
        showToast('Todas las notificaciones han sido marcadas como leídas', 'success');
        this.load();
      }
    });
  }

  async load(): Promise<void> {
    this.render();
  }

  private async render(): Promise<void> {
    const listContainer = document.getElementById('notifs-full-list');
    if (!listContainer) return;

    const allNotifs = await this.notificationService.getAllNotifications();

    let filtered = allNotifs;

    // Filtros por categoría
    if (this.currentFilter === 'channel') {
      filtered = filtered.filter(n => n.type === 'channel');
    } else if (this.currentFilter === 'delivery') {
      filtered = filtered.filter(n => n.type === 'delivery');
    } else if (this.currentFilter === 'stock') {
      filtered = filtered.filter(n => n.type === 'stock');
    } else if (this.currentFilter === 'unread') {
      filtered = filtered.filter(n => !n.read);
    }

    // Buscador
    if (this.searchQuery) {
      filtered = filtered.filter(n => 
        n.title.toLowerCase().includes(this.searchQuery) ||
        n.message.toLowerCase().includes(this.searchQuery)
      );
    }

    if (filtered.length === 0) {
      listContainer.innerHTML = `
        <div class="empty-state" style="padding: 3rem 1rem;">
          <p>No se encontraron notificaciones en esta categoría 🎉</p>
        </div>
      `;
      return;
    }

    listContainer.innerHTML = filtered.map(n => {
      let icon = '🔔';
      if (n.type === 'channel') icon = '💬';
      else if (n.type === 'delivery') icon = '⏰';
      else if (n.type === 'stock') icon = '⚠️';

      return `
        <div class="glass-card notif-card-full ${n.read ? 'read' : 'unread'}" style="margin-bottom: 12px; padding: 16px; border-left: 4px solid ${n.read ? 'var(--border-glass)' : 'var(--accent)'};">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; margin-bottom: 8px;">
            <div style="display: flex; align-items: center; gap: 10px;">
              <span style="font-size: 1.3rem;">${icon}</span>
              <div>
                <h3 style="font-size: 0.95rem; font-weight: 700; color: var(--text-primary); margin: 0;">${n.title}</h3>
                <span style="font-size: 0.75rem; color: var(--text-muted);">${formatDate(n.createdAt)}</span>
              </div>
            </div>
            <span class="order-status-badge ${n.read ? 'status-cancelled' : 'status-paid'}">
              ${n.read ? 'Leída' : 'Nueva'}
            </span>
          </div>

          <p style="font-size: 0.88rem; color: var(--text-secondary); margin: 8px 0 12px 0; line-height: 1.45;">
            ${n.message}
          </p>

          ${n.actionData?.notes ? `
            <div style="background: rgba(0,0,0,0.25); padding: 10px 12px; border-radius: var(--radius-sm); font-size: 0.82rem; color: var(--text-primary); border: 1px solid var(--border-glass); margin-bottom: 12px;">
              📌 <strong>Detalle del cliente:</strong> ${n.actionData.notes}
            </div>
          ` : ''}

          <div style="display: flex; justify-content: flex-end; gap: 10px;">
            <button class="btn btn-primary btn-sm btn-open-notif-tab" data-tab="${n.linkTab || 'active-orders'}">
              Ver e Ir al Módulo ➔
            </button>
          </div>
        </div>
      `;
    }).join('');

    listContainer.querySelectorAll('.btn-open-notif-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.getAttribute('data-tab');
        if (tab) {
          document.querySelector(`.nav-link[data-tab="${tab}"]`)?.dispatchEvent(new Event('click'));
        }
      });
    });
  }
}
