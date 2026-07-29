import { openDB } from '../database/db';
import { Expense } from '../models/Expense';
import { SupabaseService } from '../services/SupabaseService';

export class ExpenseRepository {
  private storeName = 'expenses';
  private supabaseService = new SupabaseService();

  async getAll(): Promise<Expense[]> {
    try {
      const remote = await this.supabaseService.getExpenses();
      if (remote.length > 0) {
        for (const item of remote) {
          await this.saveLocal(item);
        }
        return remote.filter(e => !e.deleted);
      }
    } catch (e) {
      console.warn('ExpenseRepository remote getAll fallback:', e);
    }
    return this.getLocalAll();
  }

  private async getLocalAll(): Promise<Expense[]> {
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

    await this.saveLocal(expense);
    await this.supabaseService.saveExpense(expense);

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
    const expense = await this.getById(id);
    if (expense) {
      expense.deleted = true;
      expense.updatedAt = new Date().toISOString();
      await this.save(expense);
    }
  }
}
