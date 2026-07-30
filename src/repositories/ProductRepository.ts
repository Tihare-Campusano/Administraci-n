import { openDB } from '../database/db';
import { Product } from '../models/Product';
import { SupabaseService } from '../services/SupabaseService';

export class ProductRepository {
  private storeName = 'products';
  private supabaseService = new SupabaseService();

  async getAll(): Promise<Product[]> {
    try {
      const remote = await this.supabaseService.getProducts();
      for (const item of remote) {
        await this.saveLocal(item).catch(() => {});
      }
    } catch (e) {
      // Ignorar fallos de red en sync remoto
    }
    return this.getLocalAll();
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

    // 1. Guardar primero en IndexedDB
    await this.saveLocal(product);

    // 2. Intentar sincronizar con la nube de forma asíncrona no bloqueante
    try {
      await this.supabaseService.saveProduct(product);
    } catch (err) {
      console.warn('Sincronización cloud del producto fallida u offline:', err);
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
    // 1. Eliminar primero de IndexedDB local
    await this.deleteLocal(id);

    // 2. Intentar eliminar en la nube de forma asíncrona no bloqueante
    try {
      await this.supabaseService.deleteRow('products', id);
    } catch (err) {
      console.warn('Eliminación cloud del producto fallida u offline:', err);
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
