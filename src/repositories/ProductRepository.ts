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
      return remote.filter(p => !p.deleted);
    } catch (e) {
      return this.getLocalAll();
    }
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

    // Guardar directamente en Supabase (base de datos primaria)
    await this.supabaseService.saveProduct(product);
    // Guardar en cache local silenciosamente
    await this.saveLocal(product).catch(() => {});

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
    const product = await this.getById(id);
    if (product) {
      product.deleted = true;
      product.updatedAt = new Date().toISOString();
      await this.save(product);
    }
  }
}
