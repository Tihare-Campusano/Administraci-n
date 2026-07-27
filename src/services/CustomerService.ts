import { CustomerRepository } from '../repositories/CustomerRepository';
import { Customer } from '../models/Customer';

export class CustomerService {
  private repo = new CustomerRepository();

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

    const existing = data.id ? await this.repo.getById(data.id) : undefined;
    
    const customer: Customer = {
      ...data,
      createdAt: existing ? existing.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    return this.repo.save(customer);
  }

  async deleteCustomer(id: string): Promise<void> {
    return this.repo.delete(id);
  }
}
