import { BackupService } from '../services/BackupService';
import { SecurityService } from '../services/SecurityService';
import { PinLogin } from '../components/PinLogin';
import { showToast } from '../components/Toast';
import { SyncService } from '../services/SyncService';

export class BackupPage {
  private backupService = new BackupService();
  private securityService = new SecurityService();
  private syncService = new SyncService();
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
    
    this.updateSecurityStatusUI();
  }

  private async setupSyncUI(): Promise<void> {
    const enabledCheckbox = document.getElementById('sync-enabled-checkbox') as HTMLInputElement;
    const detailsContainer = document.getElementById('sync-config-details');
    const roleHostRadio = document.getElementById('sync-role-host') as HTMLInputElement;
    const roleClientRadio = document.getElementById('sync-role-client') as HTMLInputElement;
    const ipContainer = document.getElementById('sync-ip-container');
    const hostIpInput = document.getElementById('sync-host-ip') as HTMLInputElement;
    const syncNowBtn = document.getElementById('btn-sync-now') as HTMLButtonElement;
    const statusMsg = document.getElementById('sync-status-msg');
    
    // Elementos nuevos
    const hostInfoContainer = document.getElementById('sync-host-info-container');
    const hostUrlText = document.getElementById('sync-host-url');
    const detectIpBtn = document.getElementById('btn-detect-ip');
    const toggleGuideBtn = document.getElementById('btn-toggle-sync-guide');
    const quickGuideContainer = document.getElementById('sync-quick-guide');

    if (!enabledCheckbox || !detailsContainer || !roleHostRadio || !roleClientRadio || !ipContainer || !hostIpInput || !syncNowBtn || !statusMsg) {
      return;
    }

    // Cargar estado inicial de los ajustes
    const enabled = await this.syncService.isSyncEnabled();
    const role = await this.syncService.getSyncRole();
    const hostIp = await this.syncService.getSyncHostIp();
    const lastDate = await this.syncService.getLastSyncDate();

    enabledCheckbox.checked = enabled;
    detailsContainer.style.display = enabled ? 'flex' : 'none';
    syncNowBtn.disabled = !enabled;

    if (role === 'client') {
      roleClientRadio.checked = true;
      ipContainer.style.display = 'flex';
      if (hostInfoContainer) hostInfoContainer.style.display = 'none';
    } else {
      roleHostRadio.checked = true;
      ipContainer.style.display = 'none';
      if (hostInfoContainer && enabled) hostInfoContainer.style.display = 'flex';
    }

    hostIpInput.value = hostIp;

    if (lastDate) {
      const dateFormatted = new Date(lastDate).toLocaleString();
      statusMsg.textContent = `Última sincronización: ${dateFormatted}`;
    } else {
      statusMsg.textContent = enabled ? 'Habilitada (sin sincronizar)' : 'Sincronización inactiva';
    }

    // Consultar IP local si somos Host
    const updateHostInfo = async () => {
      const isEnabled = enabledCheckbox.checked;
      const selectedRole = roleHostRadio.checked ? 'host' : 'client';
      if (isEnabled && selectedRole === 'host') {
        if (hostInfoContainer && hostUrlText) {
          hostInfoContainer.style.display = 'flex';
          hostUrlText.textContent = 'Consultando IP local... ⏳';
          const info = await this.syncService.getHostInfo();
          if (info) {
            hostUrlText.textContent = info.access_url;
          } else {
            const currentHostname = window.location.hostname || 'localhost';
            hostUrlText.textContent = `http://${currentHostname}:8000`;
          }
        }
      } else {
        if (hostInfoContainer) {
          hostInfoContainer.style.display = 'none';
        }
      }
    };

    // Ejecutar consulta inicial
    if (enabled && role === 'host') {
      updateHostInfo();
    }

    // Eventos
    const saveSettings = async () => {
      const isEnabled = enabledCheckbox.checked;
      const selectedRole = roleHostRadio.checked ? 'host' : 'client';
      const ipVal = hostIpInput.value.trim();

      detailsContainer.style.display = isEnabled ? 'flex' : 'none';
      ipContainer.style.display = (isEnabled && selectedRole === 'client') ? 'flex' : 'none';
      syncNowBtn.disabled = !isEnabled;

      if (!isEnabled) {
        statusMsg.textContent = 'Sincronización inactiva';
      } else if (lastDate) {
        statusMsg.textContent = `Última sincronización: ${new Date(lastDate).toLocaleString()}`;
      } else {
        statusMsg.textContent = 'Habilitada (sin sincronizar)';
      }

      await this.syncService.setSyncSettings(isEnabled, selectedRole, ipVal);
      await updateHostInfo();
    };

    enabledCheckbox.addEventListener('change', saveSettings);
    roleHostRadio.addEventListener('change', saveSettings);
    roleClientRadio.addEventListener('change', saveSettings);
    hostIpInput.addEventListener('input', saveSettings);

    // Botón de autodetección
    if (detectIpBtn) {
      detectIpBtn.addEventListener('click', () => {
        const currentHostname = window.location.hostname;
        if (currentHostname && currentHostname !== 'localhost' && currentHostname !== '127.0.0.1' && currentHostname !== '::1' && currentHostname !== '') {
          hostIpInput.value = currentHostname;
          showToast('IP del Host detectada correctamente');
          saveSettings();
        } else {
          showToast('No se puede autodetectar desde esta PC local (localhost).', 'danger');
        }
      });
    }

    // Botón de guía colapsable
    if (toggleGuideBtn && quickGuideContainer) {
      toggleGuideBtn.addEventListener('click', () => {
        const isHidden = quickGuideContainer.style.display === 'none' || quickGuideContainer.style.display === '';
        quickGuideContainer.style.display = isHidden ? 'flex' : 'none';
        toggleGuideBtn.innerHTML = isHidden 
          ? '<span>📖 Ocultar Guía de Sincronización</span>' 
          : '<span>📖 Ver Guía Rápida de Sincronización</span>';
      });
    }

    syncNowBtn.addEventListener('click', async () => {
      try {
        syncNowBtn.disabled = true;
        statusMsg.textContent = 'Sincronizando... ⏳';
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
