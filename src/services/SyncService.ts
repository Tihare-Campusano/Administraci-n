import { SecurityRepository } from '../repositories/SecurityRepository';
import { ProductRepository } from '../repositories/ProductRepository';
import { CustomerRepository } from '../repositories/CustomerRepository';
import { OrderRepository } from '../repositories/OrderRepository';
import { ExpenseRepository } from '../repositories/ExpenseRepository';
import { SupabaseService } from './SupabaseService';

export class SyncService {
  private secRepo = new SecurityRepository();
  private prodRepo = new ProductRepository();
  private custRepo = new CustomerRepository();
  private orderRepo = new OrderRepository();
  private expRepo = new ExpenseRepository();
  private supabaseService = new SupabaseService();

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

  async getHostInfo(): Promise<{ host_ip: string; access_url: string } | null> {
    try {
      const res = await fetch('http://localhost:8080/api/info');
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.warn('No se pudo conectar al servidor de sincronización local para obtener información:', e);
    }
    return null;
  }

  async syncNow(): Promise<void> {
    // 1. Priorizar sincronización con Supabase (Nube) si está configurado
    try {
      const isCloudConfigured = await this.supabaseService.isConfigured();
      if (isCloudConfigured) {
        await this.supabaseService.syncWithCloud();
        const syncDate = new Date().toISOString();
        await this.secRepo.setVal(this.LAST_DATE_KEY, syncDate);
        window.dispatchEvent(new CustomEvent('db-synced'));
        return; // Éxito en la nube, terminamos el proceso
      }
    } catch (e: any) {
      console.warn('Fallo al sincronizar con Supabase Cloud, intentando fallback local...', e);
      // Si el error indica que las tablas no están listas, lo lanzamos para que se muestre al usuario
      if (e.message && e.message.includes('relation')) {
        throw e;
      }
    }

    // 2. Fallback: Sincronización Local Inteligente (Red Local)
    const currentHostname = window.location.hostname;
    let baseUrl = 'http://localhost:8080';
    
    if (currentHostname && currentHostname !== 'localhost' && currentHostname !== '127.0.0.1' && currentHostname !== '::1' && currentHostname !== '') {
      // If we accessed via local network, the python sync server is at the same host IP
      baseUrl = `http://${currentHostname}:8080`;
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
