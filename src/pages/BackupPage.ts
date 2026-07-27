import { BackupService } from '../services/BackupService';
import { showToast } from '../components/Toast';

export class BackupPage {
  private backupService = new BackupService();
  private onReloadNeeded: () => void = () => {};

  init(onReloadNeeded: () => void): void {
    this.onReloadNeeded = onReloadNeeded;
    
    document.getElementById('btn-export-db')?.addEventListener('click', () => this.handleExport());
    document.getElementById('btn-import-db')?.addEventListener('click', () => this.triggerFileSelector());
    document.getElementById('import-file-input')?.addEventListener('change', (e) => this.handleImport(e));
    document.getElementById('btn-reset-db')?.addEventListener('click', () => this.handleReset());
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
