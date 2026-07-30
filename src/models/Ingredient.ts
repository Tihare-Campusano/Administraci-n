export type UnitType = 'g' | 'kg' | 'ml' | 'l' | 'unid';

export interface Ingredient {
  id: string;
  name: string;
  unit: UnitType;
  currentStock: number;
  minStock: number;
  costPerUnit: number;
  createdAt: string;
  updatedAt: string;
  deleted?: boolean;
}

export interface RecipeItem {
  ingredientId: string;
  quantity: number;
}
