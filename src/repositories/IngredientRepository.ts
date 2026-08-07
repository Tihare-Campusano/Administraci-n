import { openDB } from '../database/db';
import { Ingredient } from '../models/Ingredient';
import { SupabaseService } from '../services/SupabaseService';

export class IngredientRepository {
  private storeName = 'ingredients';
  private supabaseService = new SupabaseService();

  async getAll(): Promise<Ingredient[]> {
    const local = await this.getLocalAll();

    try {
      const remote = await this.supabaseService.getIngredients();
      if (remote && remote.length > 0) {
        const localMap = new Map<string, Ingredient>(local.map(i => [i.id, i]));

        for (const item of remote) {
          const existing = localMap.get(item.id);
          if (!existing || (item.updatedAt && existing.updatedAt && new Date(item.updatedAt) > new Date(existing.updatedAt))) {
            await this.saveLocal(item).catch(() => {});
            localMap.set(item.id, item);
          }
        }

        for (const localItem of local) {
          if (!remote.some(r => r.id === localItem.id)) {
            this.supabaseService.saveIngredient(localItem).catch(() => {});
          }
        }

        return Array.from(localMap.values()).filter(i => !i.deleted);
      }
    } catch (e) {
      console.warn('Sincronización de ingredientes desde Supabase no disponible, usando IndexedDB local:', e);
    }

    return local;
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

    // 1. Guardar de forma inmediata en IndexedDB local
    await this.saveLocal(ingredient).catch(() => {});

    // 2. Sincronizar asincrónicamente con Supabase
    try {
      await this.supabaseService.saveIngredient(ingredient);
    } catch (err) {
      console.warn('Sincronización cloud del ingrediente fallida:', err);
    }

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
    // 1. Marcar/eliminar primero en almacenamiento local
    await this.deleteLocal(id).catch(() => {});

    // 2. Eliminar en Supabase Cloud
    try {
      await this.supabaseService.deleteRow('ingredients', id);
    } catch (err) {
      console.warn('Eliminación cloud del ingrediente fallida:', err);
    }
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
