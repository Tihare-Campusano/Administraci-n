import { openDB } from '../database/db';
import { Expense } from '../models/Expense';
import { SupabaseService } from '../services/SupabaseService';

export class ExpenseRepository {
  private storeName = 'expenses';
  private supabaseService = new SupabaseService();

  async getAll(): Promise<Expense[]> {
    try {
      const remote = await this.supabaseService.getExpenses();
      for (const item of remote) {
        await this.saveLocal(item).catch(() => {});
      }
    } catch (e) {
      // Ignorar fallos de red en sync remoto
    }
    return this.getLocalAll();
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

    // 1. Guardar primero en IndexedDB
    await this.saveLocal(expense);

    // 2. Sincronización asíncrona no bloqueante a la nube
    try {
      await this.supabaseService.saveExpense(expense);
    } catch (err) {
      console.warn('Sincronización cloud del gasto fallida u offline:', err);
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
    // 1. Eliminar primero de IndexedDB local
    await this.deleteLocal(id);

    // 2. Sincronización asíncrona no bloqueante a la nube
    try {
      await this.supabaseService.deleteRow('expenses', id);
    } catch (err) {
      console.warn('Eliminación cloud del gasto fallida u offline:', err);
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
