export type NotificationType = 'delivery' | 'stock' | 'fifo' | 'channel' | 'info';

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  read: boolean;
  createdAt: string;
  linkTab?: string;
  actionData?: any;
}
