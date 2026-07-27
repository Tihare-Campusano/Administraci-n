import { SecurityRepository } from '../repositories/SecurityRepository';
import { ProductRepository } from '../repositories/ProductRepository';
import { CustomerRepository } from '../repositories/CustomerRepository';
import { OrderRepository } from '../repositories/OrderRepository';
import { ExpenseRepository } from '../repositories/ExpenseRepository';

export class SyncService {
  private secRepo = new SecurityRepository();
  private prodRepo = new ProductRepository();
  private custRepo = new CustomerRepository();
  private orderRepo = new OrderRepository();
  private expRepo = new ExpenseRepository();

  private ENABLED_KEY = 'sync_enabled';
  private ROLE_KEY = 'sync_role';
  private HOST_IP_KEY = 'sync_host_ip';
  private LAST_DATE_KEY = 'sync_last_date';

  private static autoSyncInterval: any = null;

  async isSyncEnabled(): Promise<boolean> {
    const val = await this.secRepo.getVal<boolean>(this.ENABLED_KEY);
    return val === true;
  }

  async getSyncRole(): Promise<'host' | 'client'> {
    const val = await this.secRepo.getVal<'host' | 'client'>(this.ROLE_KEY);
    return val || 'host';
  }

  async getSyncHostIp(): Promise<string> {
    const val = await this.secRepo.getVal<string>(this.HOST_IP_KEY);
    return val || '';
  }

  async getLastSyncDate(): Promise<string> {
    const val = await this.secRepo.getVal<string>(this.LAST_DATE_KEY);
    return val || '';
  }

  async setSyncSettings(enabled: boolean, role: 'host' | 'client', hostIp: string): Promise<void> {
    await this.secRepo.setVal(this.ENABLED_KEY, enabled);
    await this.secRepo.setVal(this.ROLE_KEY, role);
    await this.secRepo.setVal(this.HOST_IP_KEY, hostIp);
    if (!enabled) {
      this.stopAutoSync();
    } else {
      this.startAutoSync();
    }
  }

  async syncNow(): Promise<void> {
    const enabled = await this.isSyncEnabled();
    if (!enabled) return;

    const role = await this.getSyncRole();
    const hostIp = await this.getSyncHostIp();
    
    // Determine API Endpoint
    let baseUrl = 'http://localhost:8080';
    if (role === 'client') {
      if (!hostIp) {
        throw new Error('La dirección IP del Host no está configurada.');
      }
      baseUrl = `http://${hostIp}:8080`;
    }

    // 1. Gather all local data (including soft-deleted items)
    const products = await this.prodRepo.getAllRaw();
    const customers = await this.custRepo.getAllRaw();
    const orders = await this.orderRepo.getAllRaw();
    const expenses = await this.expRepo.getAllRaw();

    const localPayload = {
      products,
      customers,
      orders,
      expenses
    };

    // 2. Send payload to Python sync server
    const response = await fetch(`${baseUrl}/api/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(localPayload)
    });

    if (!response.ok) {
      throw new Error(`Error en el servidor de sincronización: ${response.statusText}`);
    }

    const remoteData = await response.json();

    // 3. Merge data from response into IndexedDB
    if (remoteData.products) {
      for (const item of remoteData.products) {
        const local = await this.prodRepo.getById(item.id);
        if (!local || !local.updatedAt || item.updatedAt > local.updatedAt) {
          await this.prodRepo.save(item);
        }
      }
    }

    if (remoteData.customers) {
      for (const item of remoteData.customers) {
        const local = await this.custRepo.getById(item.id);
        if (!local || !local.updatedAt || item.updatedAt > local.updatedAt) {
          await this.custRepo.save(item);
        }
      }
    }

    if (remoteData.orders) {
      for (const item of remoteData.orders) {
        const local = await this.orderRepo.getById(item.id);
        if (!local || !local.updatedAt || item.updatedAt > local.updatedAt) {
          await this.orderRepo.save(item);
        }
      }
    }

    if (remoteData.expenses) {
      for (const item of remoteData.expenses) {
        const local = await this.expRepo.getById(item.id);
        if (!local || !local.updatedAt || item.updatedAt > local.updatedAt) {
          await this.expRepo.save(item);
        }
      }
    }

    // 4. Update last sync date
    const syncDate = new Date().toISOString();
    await this.secRepo.setVal(this.LAST_DATE_KEY, syncDate);

    // 5. Notify UI to refresh data
    window.dispatchEvent(new CustomEvent('db-synced'));
  }

  startAutoSync(): void {
    if (SyncService.autoSyncInterval) return;

    // Sincronizar automáticamente cada 30 segundos
    SyncService.autoSyncInterval = setInterval(async () => {
      try {
        await this.syncNow();
        console.log('Sincronización en segundo plano ejecutada correctamente.');
      } catch (err) {
        console.warn('Error en la sincronización automática en segundo plano:', err);
      }
    }, 30000);
  }

  stopAutoSync(): void {
    if (SyncService.autoSyncInterval) {
      clearInterval(SyncService.autoSyncInterval);
      SyncService.autoSyncInterval = null;
    }
  }
}
