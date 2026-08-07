import { openDB } from '../database/db';
import { Expense } from '../models/Expense';
import { SupabaseService } from '../services/SupabaseService';

export class ExpenseRepository {
  private storeName = 'expenses';
  private supabaseService = new SupabaseService();

  async getAll(): Promise<Expense[]> {
    const local = await this.getLocalAll();

    try {
      const remote = await this.supabaseService.getExpenses();
      if (remote && remote.length > 0) {
        const localMap = new Map<string, Expense>(local.map(e => [e.id, e]));

        for (const item of remote) {
          const existing = localMap.get(item.id);
          if (!existing || (item.updatedAt && existing.updatedAt && new Date(item.updatedAt) > new Date(existing.updatedAt))) {
            await this.saveLocal(item).catch(() => {});
            localMap.set(item.id, item);
          }
        }

        for (const localItem of local) {
          if (!remote.some(r => r.id === localItem.id)) {
            this.supabaseService.saveExpense(localItem).catch(() => {});
          }
        }

        return Array.from(localMap.values()).filter(e => !e.deleted);
      }
    } catch (e) {
      console.warn('Sincronización de gastos desde Supabase no disponible, usando IndexedDB local:', e);
    }

    return local;
  }

  private async getLocalAll(): Promise<Expense[]> {
    try {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(this.storeName, 'readonly');
        const store = transaction.objectStore(this.storeName);
        const request = store.getAll();

        request.onsuccess = () => {
          const list: Expense[] = request.result || [];
          resolve(list.filter(e => !e.deleted));
        };
        request.onerror = () => reject(request.error);
      });
    } catch {
      return [];
    }
  }

  async getById(id: string): Promise<Expense | undefined> {
    if (!id) return undefined;
    const all = await this.getAll();
    return all.find(e => e.id === id);
  }

  async save(expense: Expense): Promise<Expense> {
    const now = new Date().toISOString();
    if (!expense.createdAt) {
      expense.createdAt = now;
    }
    expense.updatedAt = now;
    if (expense.deleted === undefined) {
      expense.deleted = false;
    }

    // 1. Guardar de forma inmediata en IndexedDB local
    await this.saveLocal(expense).catch(() => {});

    // 2. Sincronizar asincrónicamente con Supabase
    try {
      await this.supabaseService.saveExpense(expense);
    } catch (err) {
      console.warn('Sincronización cloud del gasto fallida:', err);
    }

    return expense;
  }

  private async saveLocal(expense: Expense): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.storeName, 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.put(expense);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async delete(id: string): Promise<void> {
    // 1. Eliminar primero en almacenamiento local
    await this.deleteLocal(id).catch(() => {});

    // 2. Eliminar en Supabase Cloud
    try {
      await this.supabaseService.deleteRow('expenses', id);
    } catch (err) {
      console.warn('Eliminación cloud del gasto fallida:', err);
    }
  }

  private async deleteLocal(id: string): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.storeName, 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}
