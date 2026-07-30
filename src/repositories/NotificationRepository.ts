import { openDB } from '../database/db';
import { AppNotification } from '../models/Notification';

export class NotificationRepository {
  private storeName = 'notifications';

  async getAll(): Promise<AppNotification[]> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.storeName, 'readonly');
      const store = tx.objectStore(this.storeName);
      const req = store.getAll();

      req.onsuccess = () => {
        const list = req.result || [];
        list.sort((a: AppNotification, b: AppNotification) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        resolve(list);
      };

      req.onerror = () => reject(req.error);
    });
  }

  async save(notification: AppNotification): Promise<AppNotification> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.storeName, 'readwrite');
      const store = tx.objectStore(this.storeName);
      const req = store.put(notification);

      req.onsuccess = () => resolve(notification);
      req.onerror = () => reject(req.error);
    });
  }

  async markAllAsRead(): Promise<void> {
    const notifications = await this.getAll();
    for (const n of notifications) {
      if (!n.read) {
        n.read = true;
        await this.save(n);
      }
    }
  }

  async delete(id: string): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.storeName, 'readwrite');
      const store = tx.objectStore(this.storeName);
      const req = store.delete(id);

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }
}
