import { SupabaseService } from './SupabaseService';
import { Logger } from '../utils/Logger';

export class CloudSyncService {
  private supabaseService = new SupabaseService();
  private pollIntervalId: any = null;
  private isSubscribed = false;

  public init(onTableChange?: (table: string) => void): void {
    if (this.isSubscribed) return;
    this.isSubscribed = true;

    try {
      this.supabaseService.subscribeToRealtime((table, eventType, payload) => {
        Logger.info('sync', 'REALTIME_UPDATE', { table, eventType });
        
        // Dispatch custom event for UI updates
        const event = new CustomEvent('foodadmin-cloud-change', {
          detail: { table, eventType, payload }
        });
        window.dispatchEvent(event);

        if (onTableChange) {
          onTableChange(table);
        }
      });
    } catch (err) {
      Logger.error('sync', 'REALTIME_INIT_ERROR', null, err);
    }

    // Polling fallback every 12 seconds
    this.pollIntervalId = setInterval(() => {
      const event = new CustomEvent('foodadmin-cloud-sync', {
        detail: { timestamp: new Date().toISOString() }
      });
      window.dispatchEvent(event);
    }, 12000);
  }

  public stop(): void {
    if (this.pollIntervalId) {
      clearInterval(this.pollIntervalId);
      this.pollIntervalId = null;
    }
    this.isSubscribed = false;
  }
}
