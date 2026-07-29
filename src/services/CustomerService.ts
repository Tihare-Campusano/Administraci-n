import { CustomerRepository } from '../repositories/CustomerRepository';
import { SupabaseService } from './SupabaseService';
import { Customer } from '../models/Customer';

export class CustomerService {
  private repo = new CustomerRepository();
  private supabaseService = new SupabaseService();

  async getAllCustomers(): Promise<Customer[]> {
    return this.repo.getAll();
  }

  async getCustomerById(id: string): Promise<Customer | undefined> {
    return this.repo.getById(id);
  }

  async saveCustomer(data: Omit<Customer, 'createdAt' | 'updatedAt'>): Promise<Customer> {
    if (!data.name.trim()) {
      throw new Error('El nombre del cliente es obligatorio');
    }

    const id = data.id?.trim() || crypto.randomUUID();
    const existing = await this.repo.getById(id);
    
    const customer: Customer = {
      ...data,
      id,
      createdAt: existing ? existing.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const saved = await this.repo.save(customer);
    await this.supabaseService.syncNowIfConfigured();
    return saved;
  }

  async deleteCustomer(id: string): Promise<void> {
    await this.repo.delete(id);
    await this.supabaseService.syncNowIfConfigured();
  }
}
