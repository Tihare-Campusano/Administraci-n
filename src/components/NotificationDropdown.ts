import { NotificationService } from '../services/NotificationService';
import { formatDate } from '../utils/formatters';
import { showToast } from './Toast';

export class NotificationDropdown {
  private notificationService = new NotificationService();
  private onNavigateTab: (tabId: string) => void = () => {};

  init(onNavigateTab: (tabId: string) => void): void {
    this.onNavigateTab = onNavigateTab;
    const btn = document.getElementById('notification-bell-btn');
    const dropdown = document.getElementById('notification-dropdown');
    const markAllBtn = document.getElementById('btn-mark-all-read');
    const simulateBtn = document.getElementById('btn-simulate-msg');

    btn?.addEventListener('click', (e) => {
      e.stopPropagation();
      dropdown?.classList.toggle('active');
      this.load();
    });

    markAllBtn?.addEventListener('click', async (e) => {
      e.stopPropagation();
      await this.notificationService.markAllAsRead();
      this.load();
    });

    simulateBtn?.addEventListener('click', async (e) => {
      e.stopPropagation();
      const notif = await this.notificationService.simulateIncomingChannelMessage();
      showToast(`📩 ${notif.title}`, 'success');
      await this.load();
    });

    document.addEventListener('click', (e) => {
      if (dropdown && !dropdown.contains(e.target as Node) && e.target !== btn) {
        dropdown.classList.remove('active');
      }
    });

    this.updateBadge();
  }

  async updateBadge(): Promise<void> {
    const unreadCount = await this.notificationService.getUnreadCount();
    const badge = document.getElementById('notification-badge');
    if (badge) {
      if (unreadCount > 0) {
        badge.textContent = unreadCount > 9 ? '9+' : unreadCount.toString();
        badge.style.display = 'inline-flex';
      } else {
        badge.style.display = 'none';
      }
    }
  }

  async load(): Promise<void> {
    const listContainer = document.getElementById('notification-list');
    if (!listContainer) return;

    const allNotifications = await this.notificationService.getAllNotifications();
    const unreadNotifications = allNotifications.filter(n => !n.read);
    await this.updateBadge();

    if (unreadNotifications.length === 0) {
      listContainer.innerHTML = `
        <div class="empty-notif">No tienes notificaciones sin leer 🎉</div>
        <div style="padding: 8px 16px; text-align: center; border-top: 1px solid var(--border-glass);">
          <button class="btn-text-sm btn-go-history" style="color: var(--accent); font-weight: 700;">📜 Ver Historial Completo</button>
        </div>
      `;
      listContainer.querySelector('.btn-go-history')?.addEventListener('click', () => {
        this.onNavigateTab('notifications');
        document.getElementById('notification-dropdown')?.classList.remove('active');
      });
      return;
    }

    listContainer.innerHTML = unreadNotifications.slice(0, 8).map(n => `
      <div class="notif-item unread" data-tab="${n.linkTab || ''}">
        <div class="notif-title-row">
          <span class="notif-title">${n.title}</span>
          <span class="notif-date">${formatDate(n.createdAt)}</span>
        </div>
        <div class="notif-message">${n.message}</div>
      </div>
    `).join('') + `
      <div style="padding: 10px 16px; text-align: center; border-top: 1px solid var(--border-glass); background: rgba(0,0,0,0.15);">
        <button class="btn-text-sm btn-go-history" style="color: var(--accent); font-weight: 700;">📜 Ver Historial Completo (${allNotifications.length})</button>
      </div>
    `;

    listContainer.querySelectorAll('.notif-item').forEach(item => {
      item.addEventListener('click', () => {
        const tab = item.getAttribute('data-tab');
        if (tab) {
          this.onNavigateTab(tab);
          document.getElementById('notification-dropdown')?.classList.remove('active');
        }
      });
    });

    listContainer.querySelector('.btn-go-history')?.addEventListener('click', () => {
      this.onNavigateTab('notifications');
      document.getElementById('notification-dropdown')?.classList.remove('active');
    });
  }
}
