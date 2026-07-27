import { ProductRepository } from '../repositories/ProductRepository';
import { CustomerRepository } from '../repositories/CustomerRepository';
import { OrderRepository } from '../repositories/OrderRepository';
import { ExpenseRepository } from '../repositories/ExpenseRepository';

export class BackupService {
  private prodRepo = new ProductRepository();
  private custRepo = new CustomerRepository();
  private orderRepo = new OrderRepository();
  private expRepo = new ExpenseRepository();

  async exportData(): Promise<string> {
    const products = await this.prodRepo.getAll();
    const customers = await this.custRepo.getAll();
    const orders = await this.orderRepo.getAll();
    const expenses = await this.expRepo.getAll();

    const data = {
      app: 'FoodAdmin',
      version: 2,
      exportedAt: new Date().toISOString(),
      products,
      customers,
      orders,
      expenses
    };

    return JSON.stringify(data, null, 2);
  }

  async importData(jsonString: string): Promise<void> {
    const data = JSON.parse(jsonString);
    
    // Validate schema
    if (!data.products || !data.customers || !data.orders || !data.expenses) {
      throw new Error('Estructura de archivo inválida. No es una copia de seguridad válida de FoodAdmin.');
    }

    // Overwrite Products
    await this.clearAndImportProducts(data.products);
    
    // Overwrite Customers
    await this.clearAndImportCustomers(data.customers);
    
    // Overwrite Orders
    await this.clearAndImportOrders(data.orders);
    
    // Overwrite Expenses
    await this.clearAndImportExpenses(data.expenses);
  }

  private async clearAndImportProducts(items: any[]): Promise<void> {
    const all = await this.prodRepo.getAll();
    for (const item of all) {
      await this.prodRepo.delete(item.id);
    }
    for (const item of items) {
      await this.prodRepo.save(item);
    }
  }

  private async clearAndImportCustomers(items: any[]): Promise<void> {
    const all = await this.custRepo.getAll();
    for (const item of all) {
      await this.custRepo.delete(item.id);
    }
    for (const item of items) {
      await this.custRepo.save(item);
    }
  }

  private async clearAndImportOrders(items: any[]): Promise<void> {
    const all = await this.orderRepo.getAll();
    for (const item of all) {
      await this.orderRepo.delete(item.id);
    }
    for (const item of items) {
      await this.orderRepo.save(item);
    }
  }

  private async clearAndImportExpenses(items: any[]): Promise<void> {
    const all = await this.expRepo.getAll();
    for (const item of all) {
      await this.expRepo.delete(item.id);
    }
    for (const item of items) {
      await this.expRepo.save(item);
    }
  }
}
