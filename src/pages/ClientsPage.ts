import { CustomerService } from '../services/CustomerService';
import { showToast } from '../components/Toast';

export class ClientsPage {
  private customerService = new CustomerService();
  private selectedClientId: string | null = null;
  private onClientAddedCallback: ((clientId: string) => void) | null = null;

  init(onClientAdded?: (clientId: string) => void): void {
    if (onClientAdded) this.onClientAddedCallback = onClientAdded;
    document.getElementById('clients-new-client-btn')?.addEventListener('click', () => this.openModal());
    document.getElementById('close-client-modal')?.addEventListener('click', () => this.closeModal());
    document.getElementById('btn-cancel-client')?.addEventListener('click', () => this.closeModal());
    document.getElementById('client-form')?.addEventListener('submit', (e) => this.handleFormSubmit(e));

    const modalOverlay = document.getElementById('modal-client');
    modalOverlay?.addEventListener('click', (e) => {
      if (e.target === modalOverlay) this.closeModal();
    });
  }

  async load(): Promise<void> {
    const grid = document.getElementById('clients-grid');
    if (!grid) return;
    grid.innerHTML = '<div class="empty-state">Cargando directorio...</div>';

    try {
      const clients = await this.customerService.getAllCustomers();
      if (clients.length === 0) {
        this.renderEmptyState(grid);
        return;
      }
      this.renderClientsList(grid, clients);
    } catch (err) {
      grid.innerHTML = '<div class="empty-state">Error al cargar clientes.</div>';
    }
  }

  private renderEmptyState(grid: HTMLElement): void {
    grid.innerHTML = `
      <div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/></svg>
        <h3>No hay clientes registrados</h3>
        <p>Agrega clientes frecuentes para facilitar la toma de sus pedidos.</p>
      </div>
    `;
  }

  private renderClientsList(grid: HTMLElement, clients: any[]): void {
    grid.innerHTML = clients.map(client => {
      const name = client.name || 'Cliente sin nombre';
      const phone = client.phone || 'No registrado';
      const notes = client.notes || client.address || 'No registrada';
      const id = client.id || '';

      return `
        <div class="glass-card catalog-card">
          <div class="catalog-card-header">
            <span class="catalog-card-badge">Cliente Frecuente</span>
          </div>
          <h3 class="catalog-card-title">${name}</h3>
          <p class="catalog-card-desc">
            <strong>📞 Teléfono:</strong> ${phone}<br>
            <strong>📍 Info/Dirección:</strong> ${notes}
          </p>
          <div class="catalog-card-footer">
            <button class="btn btn-secondary btn-sm edit-client-btn" data-id="${id}">Editar</button>
            <button class="btn btn-danger btn-sm delete-client-btn" data-id="${id}">Borrar</button>
          </div>
        </div>
      `;
    }).join('');

    this.bindActionButtons();
  }

  private bindActionButtons(): void {
    document.querySelectorAll('.edit-client-btn').forEach(btn => {
      btn.addEventListener('click', () => this.openModal(btn.getAttribute('data-id') || undefined));
    });
    document.querySelectorAll('.delete-client-btn').forEach(btn => {
      btn.addEventListener('click', () => this.deleteClient(btn.getAttribute('data-id') || ''));
    });
  }

  async openModal(id?: string, _isQuickAdd?: boolean): Promise<void> {
    this.selectedClientId = id || null;
    const form = document.getElementById('client-form') as HTMLFormElement;
    const title = document.getElementById('client-modal-title');
    if (!form) return;
    form.reset();

    const idInput = document.getElementById('client-id') as HTMLInputElement;
    if (idInput) idInput.value = id || '';

    if (id && title) {
      title.textContent = 'Editar Cliente';
      const client = await this.customerService.getCustomerById(id);
      if (client) {
        (document.getElementById('client-name') as HTMLInputElement).value = client.name;
        (document.getElementById('client-phone') as HTMLInputElement).value = client.phone || '';
        (document.getElementById('client-notes') as HTMLTextAreaElement).value = client.notes || '';
      }
    } else if (title) {
      title.textContent = 'Crear Cliente';
    }

    document.getElementById('modal-client')?.classList.add('active');
    setTimeout(() => {
      (document.getElementById('client-name') as HTMLInputElement)?.focus();
    }, 50);
  }

  closeModal(): void {
    document.getElementById('modal-client')?.classList.remove('active');
    this.selectedClientId = null;
  }

  private async handleFormSubmit(e: Event): Promise<void> {
    e.preventDefault();
    const name = (document.getElementById('client-name') as HTMLInputElement).value;
    const phone = (document.getElementById('client-phone') as HTMLInputElement).value;
    const notes = (document.getElementById('client-notes') as HTMLTextAreaElement).value;

    try {
      const client = await this.customerService.saveCustomer({
        id: this.selectedClientId || '',
        name,
        phone,
        address: '', // Matching required attribute 'address'
        notes
      });
      
      showToast(this.selectedClientId ? 'Datos del cliente actualizados' : 'Cliente registrado con éxito');
      this.closeModal();
      
      if (this.onClientAddedCallback) {
        this.onClientAddedCallback(client.id);
        this.onClientAddedCallback = null; // reset
      }
      await this.load();
    } catch (err: any) {
      showToast(err.message || 'Error al guardar cliente', 'danger');
    }
  }

  private async deleteClient(id: string): Promise<void> {
    if (confirm('¿Estás seguro de que deseas eliminar este cliente?')) {
      try {
        await this.customerService.deleteCustomer(id);
        showToast('Cliente eliminado');
        this.load();
      } catch (err) {
        showToast('Error al eliminar cliente', 'danger');
      }
    }
  }
}
