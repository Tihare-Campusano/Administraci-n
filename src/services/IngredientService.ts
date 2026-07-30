import { IngredientRepository } from '../repositories/IngredientRepository';
import { Ingredient, UnitType } from '../models/Ingredient';

export class IngredientService {
  private repo = new IngredientRepository();

  async getAllIngredients(): Promise<Ingredient[]> {
    return this.repo.getAll();
  }

  async getIngredientById(id: string): Promise<Ingredient | undefined> {
    return this.repo.getById(id);
  }

  async saveIngredient(data: {
    id?: string;
    name: string;
    unit: UnitType;
    currentStock: number;
    minStock: number;
    costPerUnit: number;
  }): Promise<Ingredient> {
    const existing = data.id ? await this.repo.getById(data.id) : undefined;
    const now = new Date().toISOString();

    const ingredient: Ingredient = {
      id: data.id || crypto.randomUUID(),
      name: data.name,
      unit: data.unit,
      currentStock: Number(data.currentStock) || 0,
      minStock: Number(data.minStock) || 0,
      costPerUnit: Number(data.costPerUnit) || 0,
      createdAt: existing ? existing.createdAt : now,
      updatedAt: now
    };

    return this.repo.save(ingredient);
  }

  async updateStock(id: string, newStock: number): Promise<Ingredient> {
    const ing = await this.repo.getById(id);
    if (!ing) throw new Error('Insumo no encontrado');

    ing.currentStock = Math.max(0, newStock);
    ing.updatedAt = new Date().toISOString();
    return this.repo.save(ing);
  }

  async deleteIngredient(id: string): Promise<void> {
    await this.repo.delete(id);
  }
}
