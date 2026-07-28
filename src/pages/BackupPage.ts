import { BackupService } from '../services/BackupService';
import { SecurityService } from '../services/SecurityService';
import { PinLogin } from '../components/PinLogin';
import { showToast } from '../components/Toast';
import { SyncService } from '../services/SyncService';
import { SupabaseService } from '../services/SupabaseService';

export class BackupPage {
  private backupService = new BackupService();
  private securityService = new SecurityService();
  private syncService = new SyncService();
  private supabaseService = new SupabaseService();
  private pinLogin!: PinLogin;
  private onReloadNeeded: () => void = () => {};

  init(onReloadNeeded: () => void, pinLogin: PinLogin): void {
    this.onReloadNeeded = onReloadNeeded;
    this.pinLogin = pinLogin;
    
    document.getElementById('btn-export-db')?.addEventListener('click', () => this.handleExport());
    document.getElementById('btn-import-db')?.addEventListener('click', () => this.triggerFileSelector());
    document.getElementById('import-file-input')?.addEventListener('change', (e) => this.handleImport(e));
    document.getElementById('btn-reset-db')?.addEventListener('click', () => this.handleReset());

    // Seguridad con PIN
    document.getElementById('btn-security-toggle')?.addEventListener('click', () => this.handleSecurityToggle());
    document.getElementById('btn-security-change')?.addEventListener('click', () => this.handleSecurityChange());
    
    // Sincronización Local
    this.setupSyncUI();

    // Sincronización Supabase Cloud
    this.setupSupabaseUI();
    
    this.updateSecurityStatusUI();
  }

  private async setupSyncUI(): Promise<void> {
    const syncNowBtn = document.getElementById('btn-sync-now') as HTMLButtonElement;
    const statusMsg = document.getElementById('sync-status-msg');
    const quickUrlSpan = document.getElementById('sync-quick-url');

    if (!syncNowBtn || !statusMsg) {
      return;
    }

    // Cargar estado inicial y habilitar autosync por defecto
    const lastDate = await this.syncService.getLastSyncDate();
    if (lastDate) {
      statusMsg.textContent = `Última sincronización: ${new Date(lastDate).toLocaleString()}`;
    } else {
      statusMsg.textContent = 'Lista para sincronizar (automática activa)';
    }

    // Iniciar auto-sincronización en segundo plano automáticamente
    this.syncService.startAutoSync();

    // Obtener y mostrar la URL de acceso del host
    const updateUrlDisplay = async () => {
      if (quickUrlSpan) {
        quickUrlSpan.textContent = 'Obteniendo dirección local...';
        const info = await this.syncService.getHostInfo();
        if (info && info.access_url) {
          quickUrlSpan.textContent = info.access_url;
        } else {
          // Fallback a partir de la URL actual si el servidor local de info no responde o está offline
          const currentHostname = window.location.hostname || 'localhost';
          const currentPort = window.location.port || '8000';
          quickUrlSpan.textContent = `http://${currentHostname}:${currentPort}`;
        }
      }
    };
    updateUrlDisplay();

    // Evento de Sincronización Manual
    syncNowBtn.addEventListener('click', async () => {
      try {
        syncNowBtn.disabled = true;
        statusMsg.textContent = 'Sincronizando datos... ⏳';
        statusMsg.style.color = 'var(--text-secondary)';

        await this.syncService.syncNow();

        const newLastDate = await this.syncService.getLastSyncDate();
        statusMsg.textContent = `¡Sincronizado con éxito! ✅ (${new Date(newLastDate).toLocaleTimeString()})`;
        statusMsg.style.color = 'var(--success)';
        showToast('Sincronización completada correctamente');
      } catch (err: any) {
        console.error(err);
        statusMsg.textContent = `Error al sincronizar: ${err.message || 'Error de red'}`;
        statusMsg.style.color = 'var(--danger)';
        showToast('Fallo en la sincronización local', 'danger');
      } finally {
        syncNowBtn.disabled = false;
      }
    });
  }

  private async setupSupabaseUI(): Promise<void> {
    const urlInput = document.getElementById('supabase-url') as HTMLInputElement;
    const keyInput = document.getElementById('supabase-key') as HTMLInputElement;
    const testBtn = document.getElementById('btn-supabase-test') as HTMLButtonElement;
    const statusMsg = document.getElementById('supabase-status-msg');

    if (!urlInput || !keyInput || !testBtn || !statusMsg) {
      return;
    }

    // Cargar credenciales iniciales
    const creds = await this.supabaseService.getCredentials();
    urlInput.value = creds.url;
    keyInput.value = creds.key;

    const updateStatus = async () => {
      const isConnected = await this.supabaseService.isConfigured();
      if (isConnected) {
        statusMsg.textContent = 'Conectado ✅';
        statusMsg.style.color = 'var(--success)';
      } else {
        statusMsg.textContent = 'Desconectado';
        statusMsg.style.color = 'var(--text-secondary)';
      }
    };
    updateStatus();

    // Evento de prueba y conexión
    testBtn.addEventListener('click', async () => {
      const url = urlInput.value.trim();
      const key = keyInput.value.trim();

      testBtn.disabled = true;
      statusMsg.textContent = 'Probando conexión... ⏳';
      statusMsg.style.color = 'var(--text-secondary)';

      try {
        const success = await this.supabaseService.saveCredentials(url, key);
        if (success) {
          statusMsg.textContent = 'Conectado ✅';
          statusMsg.style.color = 'var(--success)';
          showToast('Conectado a Supabase correctamente');
          
          // Sincronizar de inmediato
          try {
            await this.syncService.syncNow();
            showToast('Sincronización en la nube realizada con éxito');
          } catch (syncErr: any) {
            console.error(syncErr);
            showToast('Supabase conectado, pero falta crear las tablas en tu base de datos', 'danger');
          }
        } else {
          statusMsg.textContent = 'Error de conexión ❌';
          statusMsg.style.color = 'var(--danger)';
          showToast('Credenciales incorrectas o servidor inalcanzable', 'danger');
        }
      } catch (err: any) {
        statusMsg.textContent = 'Error de conexión ❌';
        statusMsg.style.color = 'var(--danger)';
        showToast('Error de conexión a Supabase', 'danger');
      } finally {
        testBtn.disabled = false;
      }
    });
  }

  async updateSecurityStatusUI(): Promise<void> {
    const isEnabled = await this.securityService.isSecurityEnabled();
    const statusText = document.getElementById('security-status-text');
    const toggleBtn = document.getElementById('btn-security-toggle');
    const changeBtn = document.getElementById('btn-security-change');

    if (statusText) {
      statusText.innerHTML = isEnabled 
        ? 'El bloqueo de pantalla por PIN está <strong style="color:var(--success);">activo</strong>. Se solicitará el código al abrir la aplicación.' 
        : 'El bloqueo de pantalla por PIN está <strong style="color:var(--text-secondary);">desactivado</strong> actualmente.';
    }

    if (toggleBtn) {
      toggleBtn.textContent = isEnabled ? 'Desactivar PIN de Bloqueo' : 'Activar PIN de Bloqueo';
      if (isEnabled) {
        toggleBtn.classList.remove('btn-primary');
        toggleBtn.classList.add('btn-danger');
      } else {
        toggleBtn.classList.remove('btn-danger');
        toggleBtn.classList.add('btn-primary');
      }
    }

    if (changeBtn) {
      changeBtn.style.display = isEnabled ? 'inline-block' : 'none';
    }
  }

  private async handleSecurityToggle(): Promise<void> {
    const isEnabled = await this.securityService.isSecurityEnabled();
    if (isEnabled) {
      this.pinLogin.show('disable');
    } else {
      this.pinLogin.show('setup');
    }
  }

  private handleSecurityChange(): void {
    this.pinLogin.show('change');
  }

  private async handleExport(): Promise<void> {
    try {
      const dataStr = await this.backupService.exportData();
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `foodadmin_backup_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      
      URL.revokeObjectURL(url);
      showToast('Copia de seguridad descargada con éxito');
    } catch (err) {
      showToast('Error al exportar base de datos', 'danger');
    }
  }

  private triggerFileSelector(): void {
    const input = document.getElementById('import-file-input') as HTMLInputElement;
    input?.click();
  }

  private async handleImport(e: Event): Promise<void> {
    const target = e.target as HTMLInputElement;
    const file = target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        if (confirm('¿Estás seguro de importar? Esto reemplazará todos tus datos actuales de la aplicación.')) {
          await this.backupService.importData(text);
          showToast('Base de datos restaurada con éxito');
          this.onReloadNeeded();
        }
      } catch (err: any) {
        showToast(`Error al importar datos: ${err.message}`, 'danger');
      }
    };
    reader.readAsText(file);
    target.value = ''; // reset file selector
  }

  private async handleReset(): Promise<void> {
    if (confirm('🚨 ¿Estás seguro de formatear la aplicación? Se eliminarán todos los productos, clientes e historial permanentemente.')) {
      if (confirm('CONFIRMACIÓN EXTRA: ¿Seguro? Perderás todos tus datos registrados.')) {
        try {
          const deleteReq = indexedDB.deleteDatabase('FoodAdminDB');
          deleteReq.onsuccess = () => {
            showToast('Base de datos eliminada. Reiniciando...', 'danger');
            setTimeout(() => window.location.reload(), 1500);
          };
          deleteReq.onerror = () => {
            showToast('Error al reiniciar base de datos', 'danger');
          };
        } catch (err) {
          showToast('Error al reiniciar base de datos', 'danger');
        }
      }
    }
  }
}
