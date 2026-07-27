import { ProductService } from '../services/ProductService';
import { formatMoney } from '../utils/formatters';
import { showToast } from '../components/Toast';

export class CatalogPage {
  private productService = new ProductService();
  private selectedProductId: string | null = null;

  init(): void {
    document.getElementById('catalog-new-product-btn')?.addEventListener('click', () => this.openModal());
    document.getElementById('close-product-modal')?.addEventListener('click', () => this.closeModal());
    document.getElementById('btn-cancel-product')?.addEventListener('click', () => this.closeModal());
    document.getElementById('product-form')?.addEventListener('submit', (e) => this.handleFormSubmit(e));
  }

  async load(): Promise<void> {
    const grid = document.getElementById('catalog-grid');
    if (!grid) return;
    grid.innerHTML = '<div class="empty-state">Cargando catálogo...</div>';

    try {
      const products = await this.productService.getAllProducts();
      if (products.length === 0) {
        this.renderEmptyState(grid);
        return;
      }
      this.renderProductsList(grid, products);
    } catch (err) {
      grid.innerHTML = '<div class="empty-state">Error al cargar productos.</div>';
    }
  }

  private renderEmptyState(grid: HTMLElement): void {
    grid.innerHTML = `
      <div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
        <h3>El catálogo está vacío</h3>
        <p>Registra tus platos y bebidas haciendo clic en "+ Nuevo Producto".</p>
      </div>
    `;
  }

  private renderProductsList(grid: HTMLElement, products: any[]): void {
    grid.innerHTML = products.map(product => `
      <div class="glass-card catalog-card">
        <div class="catalog-card-header">
          <span class="catalog-card-badge">${product.category || 'Sin Categoría'}</span>
          <span class="catalog-card-price">${formatMoney(product.price)}</span>
        </div>
        <h3 class="catalog-card-title">${product.name}</h3>
        <p class="catalog-card-desc">${product.description || 'Sin descripción'}</p>
        <div class="catalog-card-footer">
          <button class="btn btn-secondary btn-sm edit-product-btn" data-id="${product.id}">Editar</button>
          <button class="btn btn-danger btn-sm delete-product-btn" data-id="${product.id}">Borrar</button>
        </div>
      </div>
    `).join('');

    this.bindActionButtons();
  }

  private bindActionButtons(): void {
    document.querySelectorAll('.edit-product-btn').forEach(btn => {
      btn.addEventListener('click', () => this.openModal(btn.getAttribute('data-id') || undefined));
    });
    document.querySelectorAll('.delete-product-btn').forEach(btn => {
      btn.addEventListener('click', () => this.deleteProduct(btn.getAttribute('data-id') || ''));
    });
  }

  async openModal(id?: string): Promise<void> {
    this.selectedProductId = id || null;
    const form = document.getElementById('product-form') as HTMLFormElement;
    const title = document.getElementById('product-modal-title');
    if (!form) return;
    form.reset();

    const idInput = document.getElementById('product-id') as HTMLInputElement;
    if (idInput) idInput.value = id || '';

    if (id && title) {
      title.textContent = 'Editar Producto';
      const prod = await this.productService.getProductById(id);
      if (prod) {
        (document.getElementById('product-name') as HTMLInputElement).value = prod.name;
        (document.getElementById('product-price') as HTMLInputElement).value = prod.price.toString();
        (document.getElementById('product-category') as HTMLInputElement).value = prod.category || '';
        (document.getElementById('product-description') as HTMLTextAreaElement).value = prod.description || '';
      }
    } else if (title) {
      title.textContent = 'Agregar Producto';
    }

    document.getElementById('modal-product')?.classList.add('active');
  }

  closeModal(): void {
    document.getElementById('modal-product')?.classList.remove('active');
    this.selectedProductId = null;
  }

  private async handleFormSubmit(e: Event): Promise<void> {
    e.preventDefault();
    const name = (document.getElementById('product-name') as HTMLInputElement).value;
    const price = parseFloat((document.getElementById('product-price') as HTMLInputElement).value) || 0;
    const category = (document.getElementById('product-category') as HTMLInputElement).value;
    const description = (document.getElementById('product-description') as HTMLTextAreaElement).value;

    try {
      await this.productService.saveProduct({
        id: this.selectedProductId || '',
        name,
        price,
        cost: this.selectedProductId ? (await this.productService.getProductById(this.selectedProductId))?.cost || 0 : 0, // Keep or default cost to 0 (cost can be edited later if we add cost input, let's keep it clean)
        category,
        description,
        available: true
      });
      showToast(this.selectedProductId ? 'Producto actualizado' : 'Producto agregado al catálogo');
      this.closeModal();
      this.load();
    } catch (err: any) {
      showToast(err.message || 'Error al guardar producto', 'danger');
    }
  }

  private async deleteProduct(id: string): Promise<void> {
    if (confirm('¿Estás seguro de que deseas eliminar este producto?')) {
      try {
        await this.productService.deleteProduct(id);
        showToast('Producto eliminado del menú');
        this.load();
      } catch (err) {
        showToast('Error al eliminar producto', 'danger');
      }
    }
  }
}
