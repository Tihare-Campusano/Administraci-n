import { openDB } from '../database/db';
import { Expense } from '../models/Expense';

export class ExpenseRepository {
  private storeName = 'expenses';

  async getAll(): Promise<Expense[]> {
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

  async getAllRaw(): Promise<Expense[]> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.storeName, 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async getById(id: string): Promise<Expense | undefined> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.storeName, 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
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
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.storeName, 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.put(expense);

      request.onsuccess = () => resolve(expense);
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
