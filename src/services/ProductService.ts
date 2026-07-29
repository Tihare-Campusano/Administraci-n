import { ProductRepository } from '../repositories/ProductRepository';
import { Product } from '../models/Product';

export class ProductService {
  private repo = new ProductRepository();

  async getAllProducts(): Promise<Product[]> {
    return this.repo.getAll();
  }

  async getProductById(id: string): Promise<Product | undefined> {
    return this.repo.getById(id);
  }

  async saveProduct(data: Omit<Product, 'createdAt' | 'updatedAt'>): Promise<Product> {
    const id = data.id?.trim() || crypto.randomUUID();
    const existing = await this.repo.getById(id);
    const now = new Date().toISOString();
    
    if (data.price < 0 || data.cost < 0) {
      throw new Error('El precio y costo del producto deben ser positivos');
    }

    const product: Product = {
      ...data,
      id,
      createdAt: existing ? existing.createdAt : now,
      updatedAt: now
    };

    return await this.repo.save(product);
  }

  async toggleAvailability(id: string): Promise<Product> {
    const product = await this.repo.getById(id);
    if (!product) throw new Error('Producto no encontrado');

    product.available = !product.available;
    product.updatedAt = new Date().toISOString();
    return await this.repo.save(product);
  }

  async deleteProduct(id: string): Promise<void> {
    await this.repo.delete(id);
  }

  calculateProfitMargin(product: Product): number {
    if (product.price === 0) return 0;
    return ((product.price - product.cost) / product.price) * 100;
  }
}
