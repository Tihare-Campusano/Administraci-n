import { IngredientService } from '../services/IngredientService';
import { UnitType } from '../models/Ingredient';
import { showToast } from '../components/Toast';

export class StockPage {
  private ingredientService = new IngredientService();
  private selectedId: string | null = null;

  init(): void {
    document.getElementById('stock-new-btn')?.addEventListener('click', () => this.openModal());
    document.getElementById('close-stock-modal')?.addEventListener('click', () => this.closeModal());
    document.getElementById('btn-cancel-stock')?.addEventListener('click', () => this.closeModal());
    document.getElementById('stock-form')?.addEventListener('submit', (e) => this.handleSubmit(e));

    const modalOverlay = document.getElementById('modal-stock');
    modalOverlay?.addEventListener('click', (e) => {
      if (e.target === modalOverlay) this.closeModal();
    });
  }

  async load(): Promise<void> {
    const grid = document.getElementById('stock-grid');
    if (!grid) return;

    grid.innerHTML = '<div class="empty-state">Cargando inventario de insumos...</div>';

    try {
      const ingredients = await this.ingredientService.getAllIngredients();

      if (ingredients.length === 0) {
        grid.innerHTML = `
          <div class="empty-state" style="grid-column: 1 / -1;">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="48" height="48"><path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>
            <h3>No hay insumos registrados</h3>
            <p>Comienza registrando tus materias primas (Mantequilla, Harina, Cajas, etc.) haciendo clic en "+ Nuevo Insumo".</p>
          </div>
        `;
        return;
      }

      grid.innerHTML = ingredients.map(ing => {
        const isCritical = ing.currentStock <= ing.minStock;
        const percent = ing.minStock > 0 ? Math.min(100, Math.round((ing.currentStock / (ing.minStock * 2)) * 100)) : 100;
        const badgeColor = isCritical ? 'var(--danger)' : (ing.currentStock <= ing.minStock * 1.5 ? 'var(--warning)' : 'var(--success)');

        return `
          <div class="glass-card catalog-card" style="border-top: 4px solid ${badgeColor}; padding: 1.25rem;">
            <div class="catalog-card-header">
              <span class="catalog-card-title">${ing.name}</span>
              <span class="catalog-card-badge" style="background: rgba(255,255,255,0.06); color: ${badgeColor}; border: 1px solid ${badgeColor};">
                ${isCritical ? '⚠️ Stock Crítico' : '✅ En Regla'}
              </span>
            </div>
            
            <div style="margin-top: 8px;">
              <div style="display: flex; justify-content: space-between; font-size: 0.85rem; margin-bottom: 4px;">
                <span>Stock Actual: <strong>${ing.currentStock} ${ing.unit}</strong></span>
                <span style="color: var(--text-muted);">Mínimo: ${ing.minStock} ${ing.unit}</span>
              </div>
              <div style="width: 100%; background: rgba(255,255,255,0.08); height: 8px; border-radius: 4px; overflow: hidden;">
                <div style="width: ${percent}%; background: ${badgeColor}; height: 100%; transition: width 0.3s ease;"></div>
              </div>
            </div>

            <div style="font-size: 0.82rem; color: var(--text-secondary); margin-top: 6px;">
              Costo unitario aprox: <strong>$${ing.costPerUnit}</strong> / ${ing.unit}
            </div>

            <div class="catalog-card-footer" style="margin-top: 12px; display: flex; gap: 8px; justify-content: flex-end;">
              <button class="btn btn-secondary btn-sm edit-stock-btn" data-id="${ing.id}">Editar</button>
              <button class="btn btn-danger btn-sm delete-stock-btn" data-id="${ing.id}">Borrar</button>
            </div>
          </div>
        `;
      }).join('');

      this.bindEvents();
    } catch (err) {
      grid.innerHTML = '<div class="empty-state">Error al cargar insumos.</div>';
    }
  }

  private bindEvents(): void {
    document.querySelectorAll('.edit-stock-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        if (id) this.openModal(id);
      });
    });

    document.querySelectorAll('.delete-stock-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        if (id) this.deleteIngredient(id);
      });
    });
  }

  async openModal(id?: string): Promise<void> {
    this.selectedId = id || null;
    const form = document.getElementById('stock-form') as HTMLFormElement;
    const titleEl = document.getElementById('stock-modal-title');

    if (!form) return;
    form.reset();

    if (id && titleEl) {
      titleEl.textContent = 'Editar Insumo';
      const ing = await this.ingredientService.getIngredientById(id);
      if (ing) {
        (document.getElementById('stock-name') as HTMLInputElement).value = ing.name;
        (document.getElementById('stock-unit') as HTMLSelectElement).value = ing.unit;
        (document.getElementById('stock-current') as HTMLInputElement).value = ing.currentStock.toString();
        (document.getElementById('stock-min') as HTMLInputElement).value = ing.minStock.toString();
        (document.getElementById('stock-cost') as HTMLInputElement).value = ing.costPerUnit.toString();
      }
    } else if (titleEl) {
      titleEl.textContent = 'Nuevo Insumo / Materia Prima';
      (document.getElementById('stock-unit') as HTMLSelectElement).value = 'g';
    }

    document.getElementById('modal-stock')?.classList.add('active');
  }

  closeModal(): void {
    document.getElementById('modal-stock')?.classList.remove('active');
    this.selectedId = null;
  }

  private async handleSubmit(e: Event): Promise<void> {
    e.preventDefault();
    const name = (document.getElementById('stock-name') as HTMLInputElement).value;
    const unit = (document.getElementById('stock-unit') as HTMLSelectElement).value as UnitType;
    const currentStock = parseFloat((document.getElementById('stock-current') as HTMLInputElement).value) || 0;
    const minStock = parseFloat((document.getElementById('stock-min') as HTMLInputElement).value) || 0;
    const costPerUnit = parseFloat((document.getElementById('stock-cost') as HTMLInputElement).value) || 0;

    if (!name.trim()) {
      showToast('El nombre del insumo es obligatorio', 'danger');
      return;
    }

    try {
      await this.ingredientService.saveIngredient({
        id: this.selectedId || undefined,
        name,
        unit,
        currentStock,
        minStock,
        costPerUnit
      });

      showToast(this.selectedId ? 'Insumo actualizado' : 'Insumo registrado con éxito');
      this.closeModal();
      this.load();
    } catch (err: any) {
      showToast(err.message || 'Error al guardar insumo', 'danger');
    }
  }

  private async deleteIngredient(id: string): Promise<void> {
    if (confirm('¿Estás seguro de eliminar este insumo del registro?')) {
      try {
        await this.ingredientService.deleteIngredient(id);
        showToast('Insumo eliminado');
        this.load();
      } catch (err) {
        showToast('Error al eliminar insumo', 'danger');
      }
    }
  }
}
