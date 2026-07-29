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

    const modalOverlay = document.getElementById('modal-product');
    modalOverlay?.addEventListener('click', (e) => {
      if (e.target === modalOverlay) this.closeModal();
    });

    // Evento de previsualización de foto
    const fileInput = document.getElementById('product-image-file') as HTMLInputElement;
    const previewImg = document.getElementById('product-image-preview') as HTMLImageElement;
    const placeholderSpan = document.getElementById('product-image-placeholder');

    fileInput?.addEventListener('change', (e) => {
      const target = e.target as HTMLInputElement;
      const file = target.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (evt) => {
          if (previewImg && placeholderSpan) {
            previewImg.src = evt.target?.result as string;
            previewImg.style.display = 'block';
            placeholderSpan.style.display = 'none';
          }
        };
        reader.readAsDataURL(file);
      }
    });
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
      <div class="glass-card catalog-card" style="display: flex; flex-direction: column; overflow: hidden; padding: 0; min-height: 310px; transition: var(--transition-smooth);">
        ${product.image ? `
        <div style="width: 100%; height: 140px; overflow: hidden; border-bottom: 1px solid var(--border-glass); background: #000; position: relative;">
          <img src="${product.image}" alt="${product.name}" style="width: 100%; height: 100%; object-fit: cover; transition: transform 0.4s ease;" onmouseover="this.style.transform='scale(1.06)'" onmouseout="this.style.transform='scale(1)'">
        </div>
        ` : `
        <div style="width: 100%; height: 90px; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, rgba(236, 72, 153, 0.05) 0%, rgba(19, 27, 46, 0.15) 100%); border-bottom: 1px solid var(--border-glass);">
          <span style="font-size: 1.8rem; filter: opacity(0.75);">🧁</span>
        </div>
        `}
        <div style="padding: 15px; display: flex; flex-direction: column; flex-grow: 1; gap: 8px;">
          <div class="catalog-card-header" style="margin: 0; padding: 0; display: flex; justify-content: space-between; align-items: center;">
            <span class="catalog-card-badge">${product.category || 'Sin Categoría'}</span>
            <span class="catalog-card-price">${formatMoney(product.price)}</span>
          </div>
          <h3 class="catalog-card-title" style="margin: 0; font-size: 1.05rem; font-weight: 700; color: var(--text-primary);">${product.name}</h3>
          <p class="catalog-card-desc" style="margin: 0; font-size: 0.85rem; color: var(--text-secondary); line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; height: 38px; flex-grow: 1;">${product.description || 'Sin descripción'}</p>
          <div class="catalog-card-footer" style="margin-top: 8px; padding: 0; display: flex; gap: 8px; justify-content: flex-end;">
            <button class="btn btn-secondary btn-sm edit-product-btn" data-id="${product.id}" style="padding: 4px 10px; font-size: 0.75rem;">Editar</button>
            <button class="btn btn-danger btn-sm delete-product-btn" data-id="${product.id}" style="padding: 4px 10px; font-size: 0.75rem;">Borrar</button>
          </div>
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
    const previewImg = document.getElementById('product-image-preview') as HTMLImageElement;
    const placeholderSpan = document.getElementById('product-image-placeholder');
    const fileInput = document.getElementById('product-image-file') as HTMLInputElement;

    if (!form) return;
    form.reset();
    if (fileInput) fileInput.value = '';
    if (previewImg) {
      previewImg.src = '';
      previewImg.style.display = 'none';
    }
    if (placeholderSpan) placeholderSpan.style.display = 'block';

    const idInput = document.getElementById('product-id') as HTMLInputElement;
    if (idInput) idInput.value = id || '';

    if (id && title) {
      title.textContent = 'Editar Producto';
      const prod = await this.productService.getProductById(id);
      if (prod) {
        (document.getElementById('product-name') as HTMLInputElement).value = prod.name;
        (document.getElementById('product-price') as HTMLInputElement).value = prod.price.toString();
        (document.getElementById('product-cost') as HTMLInputElement).value = prod.cost.toString();
        (document.getElementById('product-category') as HTMLInputElement).value = prod.category || '';
        (document.getElementById('product-description') as HTMLTextAreaElement).value = prod.description || '';
        if (prod.image && previewImg && placeholderSpan) {
          previewImg.src = prod.image;
          previewImg.style.display = 'block';
          placeholderSpan.style.display = 'none';
        }
      }
    } else if (title) {
      title.textContent = 'Agregar Producto';
    }

    document.getElementById('modal-product')?.classList.add('active');
    setTimeout(() => {
      (document.getElementById('product-name') as HTMLInputElement)?.focus();
    }, 50);
  }

  closeModal(): void {
    document.getElementById('modal-product')?.classList.remove('active');
    this.selectedProductId = null;
  }

  private async handleFormSubmit(e: Event): Promise<void> {
    e.preventDefault();
    const name = (document.getElementById('product-name') as HTMLInputElement).value.trim();
    const price = parseFloat((document.getElementById('product-price') as HTMLInputElement).value) || 0;
    const cost = parseFloat((document.getElementById('product-cost') as HTMLInputElement).value) || 0;
    const category = (document.getElementById('product-category') as HTMLInputElement).value.trim();
    const description = (document.getElementById('product-description') as HTMLTextAreaElement).value.trim();
    const previewImg = document.getElementById('product-image-preview') as HTMLImageElement;
    
    if (!name) {
      showToast('El nombre del producto es obligatorio', 'danger');
      return;
    }
    
    // Si la vista previa tiene una imagen cargada en base64
    const imageBase64 = previewImg && previewImg.src.startsWith('data:') ? previewImg.src : undefined;

    try {
      // Si estamos editando y no seleccionamos nueva foto, mantener la foto existente
      const existingProduct = this.selectedProductId ? await this.productService.getProductById(this.selectedProductId) : null;
      const finalImage = imageBase64 || existingProduct?.image;

      await this.productService.saveProduct({
        id: this.selectedProductId || '',
        name,
        price,
        cost,
        category,
        description,
        available: true,
        image: finalImage
      } as any);
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
