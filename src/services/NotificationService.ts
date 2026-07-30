import { NotificationRepository } from '../repositories/NotificationRepository';
import { AppNotification, NotificationType } from '../models/Notification';
import { OrderRepository } from '../repositories/OrderRepository';
import { IngredientRepository } from '../repositories/IngredientRepository';

export class NotificationService {
  private repo = new NotificationRepository();
  private orderRepo = new OrderRepository();
  private ingredientRepo = new IngredientRepository();

  async getAllNotifications(): Promise<AppNotification[]> {
    await this.runAutomaticAlertCheck();
    return this.repo.getAll();
  }

  async getUnreadCount(): Promise<number> {
    const list = await this.getAllNotifications();
    return list.filter(n => !n.read).length;
  }

  async markAllAsRead(): Promise<void> {
    await this.repo.markAllAsRead();
  }

  async addNotification(data: {
    title: string;
    message: string;
    type: NotificationType;
    linkTab?: string;
    actionData?: any;
  }): Promise<AppNotification> {
    const notification: AppNotification = {
      id: crypto.randomUUID(),
      title: data.title,
      message: data.message,
      type: data.type,
      read: false,
      createdAt: new Date().toISOString(),
      linkTab: data.linkTab,
      actionData: data.actionData
    };

    return this.repo.save(notification);
  }

  async runAutomaticAlertCheck(): Promise<void> {
    try {
      const orders = await this.orderRepo.getAll();
      const ingredients = await this.ingredientRepo.getAll();
      const existing = await this.repo.getAll();
      const now = new Date();

      // 1. Alertas de Entrega Próxima (deliveryAt a menos de 60 minutos)
      const activeOrders = orders.filter(o => o.status === 'pending');
      for (const order of activeOrders) {
        if (order.deliveryAt) {
          const deliveryTime = new Date(order.deliveryAt);
          const diffMinutes = (deliveryTime.getTime() - now.getTime()) / (1000 * 60);

          if (diffMinutes > 0 && diffMinutes <= 60) {
            const alertId = `deliv_${order.id}_${order.deliveryAt}`;
            const exists = existing.some(n => n.actionData?.alertKey === alertId);

            if (!exists) {
              await this.repo.save({
                id: crypto.randomUUID(),
                title: '⏰ Entrega Próxima',
                message: `El Pedido #${order.orderNumber} debe entregarse en aprox. ${Math.round(diffMinutes)} minutos.`,
                type: 'delivery',
                read: false,
                createdAt: new Date().toISOString(),
                linkTab: 'active-orders',
                actionData: { alertKey: alertId, orderId: order.id }
              });
            }
          }
        }
      }

      // 2. Alertas de Stock Mínimo de Insumos
      for (const ing of ingredients) {
        if (ing.currentStock <= ing.minStock) {
          const alertId = `stock_${ing.id}_${ing.currentStock}`;
          const exists = existing.some(n => n.actionData?.alertKey === alertId);

          if (!exists) {
            await this.repo.save({
              id: crypto.randomUUID(),
              title: '⚠️ Stock Crítico de Insumo',
              message: `El insumo "${ing.name}" tiene ${ing.currentStock} ${ing.unit} (Mínimo: ${ing.minStock} ${ing.unit}).`,
              type: 'stock',
              read: false,
              createdAt: new Date().toISOString(),
              linkTab: 'stock',
              actionData: { alertKey: alertId, ingredientId: ing.id }
            });
          }
        }
      }

      // 3. Alertas FIFO (pedidos pendientes acumulando >30 min)
      for (const order of activeOrders) {
        const created = new Date(order.createdAt);
        const diffMinutes = (now.getTime() - created.getTime()) / (1000 * 60);

        if (diffMinutes >= 30) {
          const alertId = `fifo_${order.id}`;
          const exists = existing.some(n => n.actionData?.alertKey === alertId);

          if (!exists) {
            await this.repo.save({
              id: crypto.randomUUID(),
              title: '⏳ Pedido con Demora en Espera',
              message: `El Pedido #${order.orderNumber} lleva ${Math.round(diffMinutes)} min en estado Pendiente.`,
              type: 'fifo',
              read: false,
              createdAt: new Date().toISOString(),
              linkTab: 'active-orders',
              actionData: { alertKey: alertId, orderId: order.id }
            });
          }
        }
      }
    } catch (err) {
      console.error('Error checking automatic alerts:', err);
    }
  }

  async simulateIncomingChannelMessage(): Promise<AppNotification> {
    const channels = [
      {
        channel: '💬 WhatsApp Business',
        client: 'Camila Silva',
        msg: '¡Hola! Quisiera encargar 1 Caja de Galletas New York para entregar mañana a las 17:00.',
        notes: 'Cliente WhatsApp: Camila Silva. Solicitud 1 caja de galletas.'
      },
      {
        channel: '📸 Instagram Direct',
        client: 'Sofía M. (@sofia_pasteles)',
        msg: 'Hola, ¿tienen disponibilidad de Torta de Cacao para el sábado en Viña del Mar?',
        notes: 'Consulta desde Instagram Direct'
      },
      {
        channel: '✉️ Gmail Correo',
        client: 'Empresa Valparaíso (contacto@empresa.cl)',
        msg: 'Cotización corporativa para evento: 50 cup-cakes decorados.',
        notes: 'Cotización vía correo electrónico corporativo'
      },
      {
        channel: '💙 Facebook Messenger',
        client: 'Rodrigo Morales',
        msg: 'Hola! Consulta por precio de cajas de galletas y delivery a Reñaca.',
        notes: 'Consulta vía Facebook Messenger'
      }
    ];

    const pick = channels[Math.floor(Math.random() * channels.length)];
    const notif: AppNotification = {
      id: crypto.randomUUID(),
      title: `${pick.channel}: ${pick.client}`,
      message: pick.msg,
      type: 'channel',
      read: false,
      createdAt: new Date().toISOString(),
      linkTab: 'active-orders',
      actionData: { notes: pick.notes, clientName: pick.client }
    };

    return this.repo.save(notif);
  }
}
