import { openDB } from '../database/db';
import { Ingredient } from '../models/Ingredient';
import { SupabaseService } from '../services/SupabaseService';

export class IngredientRepository {
  private storeName = 'ingredients';
  private supabaseService = new SupabaseService();

  async getAll(): Promise<Ingredient[]> {
    try {
      const remote = await this.supabaseService.getIngredients();
      for (const item of remote) {
        await this.saveLocal(item).catch(() => {});
      }
      return remote;
    } catch (e) {
      return this.getLocalAll();
    }
  }

  private async getLocalAll(): Promise<Ingredient[]> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.storeName, 'readonly');
      const store = tx.objectStore(this.storeName);
      const req = store.getAll();

      req.onsuccess = () => {
        const list = (req.result || []).filter((item: Ingredient) => !item.deleted);
        resolve(list);
      };

      req.onerror = () => reject(req.error);
    });
  }

  async getById(id: string): Promise<Ingredient | undefined> {
    if (!id) return undefined;
    const all = await this.getAll();
    return all.find(i => i.id === id);
  }

  async save(ingredient: Ingredient): Promise<Ingredient> {
    ingredient.updatedAt = new Date().toISOString();
    if (ingredient.deleted === undefined) {
      ingredient.deleted = false;
    }

    try {
      await this.supabaseService.saveIngredient(ingredient);
    } catch (err) {
      console.warn('Sincronización cloud del ingrediente fallida:', err);
    }

    await this.saveLocal(ingredient).catch(() => {});
    return ingredient;
  }

  private async saveLocal(ingredient: Ingredient): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.storeName, 'readwrite');
      const store = tx.objectStore(this.storeName);
      const req = store.put(ingredient);

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async delete(id: string): Promise<void> {
    try {
      await this.supabaseService.deleteRow('ingredients', id);
    } catch (err) {
      console.warn('Eliminación cloud del ingrediente fallida:', err);
    }

    await this.deleteLocal(id).catch(() => {});
  }

  private async deleteLocal(id: string): Promise<void> {
    const item = await this.getById(id);
    if (item) {
      item.deleted = true;
      item.updatedAt = new Date().toISOString();
      await this.saveLocal(item).catch(() => {});
    }
  }
}
