import { ExpenseRepository } from '../repositories/ExpenseRepository';
import { OrderRepository } from '../repositories/OrderRepository';
import { ProductRepository } from '../repositories/ProductRepository';
import { Expense } from '../models/Expense';

export class ExpenseService {
  private expenseRepo = new ExpenseRepository();
  private orderRepo = new OrderRepository();
  private productRepo = new ProductRepository();

  async getAllExpenses(): Promise<Expense[]> {
    return this.expenseRepo.getAll();
  }

  async saveExpense(expense: Expense): Promise<Expense> {
    if (expense.amount < 0) throw new Error('El monto del gasto debe ser positivo');
    return await this.expenseRepo.save(expense);
  }

  async deleteExpense(id: string): Promise<void> {
    await this.expenseRepo.delete(id);
  }

  async getFinancialStats() {
    const orders = await this.orderRepo.getAll();
    const expenses = await this.expenseRepo.getAll();
    const products = await this.productRepo.getAll();
    
    const completed = orders.filter(o => o.status === 'completed');
    const active = orders.filter(o => o.status === 'pending');
    
    const today = new Date().toDateString();
    const currMonth = new Date().getMonth();
    const currYear = new Date().getFullYear();

    let earnedToday = 0;
    let earnedMonth = 0;
    let pendingCobro = 0;

    // Daily & Monthly revenue
    completed.forEach(o => {
      const orderDate = new Date(o.createdAt);
      if (orderDate.toDateString() === today) earnedToday += o.total;
      if (orderDate.getMonth() === currMonth && orderDate.getFullYear() === currYear) {
        earnedMonth += o.total;
      }
    });

    // Unpaid balances (both active pending and completed unpaid)
    orders.forEach(o => {
      if (o.status !== 'cancelled' && o.paymentStatus === 'unpaid') {
        pendingCobro += o.total;
      }
    });

    // Net Profit = (Completed Revenue) - (Completed Food Cost) - (Expenses)
    const prodCostMap = new Map(products.map(p => [p.id, p.cost]));
    let totalFoodCost = 0;
    completed.forEach(o => {
      o.products.forEach(item => {
        const cost = prodCostMap.get(item.productId) || 0;
        totalFoodCost += cost * item.quantity;
      });
    });

    const totalRevenue = completed.reduce((sum, o) => sum + o.total, 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    const netProfit = totalRevenue - totalFoodCost - totalExpenses;

    return {
      earnedToday,
      earnedMonth,
      pendingCobro,
      activeOrdersCount: active.length,
      netProfit
    };
  }
}
