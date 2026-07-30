import { openDB } from '../database/db';
import { Ingredient } from '../models/Ingredient';

export class IngredientRepository {
  private storeName = 'ingredients';

  async getAll(): Promise<Ingredient[]> {
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
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.storeName, 'readonly');
      const store = tx.objectStore(this.storeName);
      const req = store.get(id);

      req.onsuccess = () => {
        const result = req.result as Ingredient;
        if (result && result.deleted) {
          resolve(undefined);
        } else {
          resolve(result);
        }
      };

      req.onerror = () => reject(req.error);
    });
  }

  async save(ingredient: Ingredient): Promise<Ingredient> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.storeName, 'readwrite');
      const store = tx.objectStore(this.storeName);
      const req = store.put(ingredient);

      req.onsuccess = () => resolve(ingredient);
      req.onerror = () => reject(req.error);
    });
  }

  async delete(id: string): Promise<void> {
    const item = await this.getById(id);
    if (item) {
      item.deleted = true;
      item.updatedAt = new Date().toISOString();
      await this.save(item);
    }
  }
}
