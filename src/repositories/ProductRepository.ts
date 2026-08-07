import { openDB } from '../database/db';
import { Product } from '../models/Product';
import { SupabaseService } from '../services/SupabaseService';

export class ProductRepository {
  private storeName = 'products';
  private supabaseService = new SupabaseService();

  async getAll(): Promise<Product[]> {
    const local = await this.getLocalAll();

    try {
      const remote = await this.supabaseService.getProducts();
      if (remote && remote.length > 0) {
        const localMap = new Map<string, Product>(local.map(p => [p.id, p]));

        for (const item of remote) {
          const existing = localMap.get(item.id);
          if (!existing || (item.updatedAt && existing.updatedAt && new Date(item.updatedAt) > new Date(existing.updatedAt))) {
            await this.saveLocal(item).catch(() => {});
            localMap.set(item.id, item);
          }
        }

        for (const localItem of local) {
          if (!remote.some(r => r.id === localItem.id)) {
            this.supabaseService.saveProduct(localItem).catch(() => {});
          }
        }

        return Array.from(localMap.values()).filter(p => !p.deleted);
      }
    } catch (e) {
      console.warn('Sincronización de productos desde Supabase no disponible, usando IndexedDB local:', e);
    }

    return local;
  }

  private async getLocalAll(): Promise<Product[]> {
    try {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(this.storeName, 'readonly');
        const store = transaction.objectStore(this.storeName);
        const request = store.getAll();

        request.onsuccess = () => {
          const list: Product[] = request.result || [];
          resolve(list.filter(p => !p.deleted));
        };
        request.onerror = () => reject(request.error);
      });
    } catch {
      return [];
    }
  }

  async getById(id: string): Promise<Product | undefined> {
    if (!id) return undefined;
    const all = await this.getAll();
    return all.find(p => p.id === id);
  }

  async save(product: Product): Promise<Product> {
    product.updatedAt = new Date().toISOString();
    if (product.deleted === undefined) {
      product.deleted = false;
    }

    // 1. Guardar de forma inmediata en IndexedDB local
    await this.saveLocal(product).catch(() => {});

    // 2. Sincronizar asincrónicamente con Supabase
    try {
      await this.supabaseService.saveProduct(product);
    } catch (err) {
      console.warn('Sincronización cloud del producto fallida:', err);
    }

    return product;
  }

  private async saveLocal(product: Product): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.storeName, 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.put(product);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async delete(id: string): Promise<void> {
    // 1. Eliminar primero en almacenamiento local
    await this.deleteLocal(id).catch(() => {});

    // 2. Eliminar en Supabase Cloud
    try {
      await this.supabaseService.deleteRow('products', id);
    } catch (err) {
      console.warn('Eliminación cloud del producto fallida:', err);
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
