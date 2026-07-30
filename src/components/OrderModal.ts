import { ProductService } from '../services/ProductService';
import { CustomerService } from '../services/CustomerService';
import { OrderService } from '../services/OrderService';
import { formatMoney } from '../utils/formatters';
import { showToast } from '../components/Toast';
import { OrderItem } from '../models/Order';

export class OrderModal {
  private productService = new ProductService();
  private customerService = new CustomerService();
  private orderService = new OrderService();

  private selectedOrderId: string | null = null;
  private selectedProducts: Map<string, number> = new Map(); // productId -> quantity
  private onReloadParent: () => void = () => {};

  init(onReloadParent: () => void): void {
    this.onReloadParent = onReloadParent;
    document.getElementById('close-order-modal')?.addEventListener('click', () => this.close());
    document.getElementById('btn-cancel-order')?.addEventListener('click', () => this.close());
    document.getElementById('order-delivery-fee')?.addEventListener('input', () => this.updateTotalsSummary());
    document.getElementById('order-form')?.addEventListener('submit', (e) => this.handleSubmit(e));

    const dateInput = document.getElementById('order-delivery-date') as HTMLInputElement;
    const timeInput = document.getElementById('order-delivery-time') as HTMLInputElement;
    dateInput?.addEventListener('change', () => {
      if (dateInput.value) {
        timeInput.disabled = false;
        if (!timeInput.value) {
          timeInput.value = '12:00';
        }
      } else {
        timeInput.disabled = true;
        timeInput.value = '';
      }
    });
  }

  async open(orderId?: string): Promise<void> {
    this.selectedOrderId = orderId || null;
    this.selectedProducts.clear();
    const form = document.getElementById('order-form') as HTMLFormElement;
    form?.reset();

    const dateInput = document.getElementById('order-delivery-date') as HTMLInputElement;
    const timeInput = document.getElementById('order-delivery-time') as HTMLInputElement;
    if (dateInput) dateInput.value = '';
    if (timeInput) {
      timeInput.value = '';
      timeInput.disabled = true;
    }

    await this.populateClientsDropdown();
    await this.populateProductsSelector();

    if (orderId) {
      const order = await this.orderService.getOrderById(orderId);
      if (order) this.loadOrderIntoForm(order);
    } else {
      (document.getElementById('order-delivery-fee') as HTMLInputElement).value = '0';
      (document.getElementById('order-payment-status') as HTMLSelectElement).value = 'unpaid';
      this.updateTotalsSummary();
    }

    document.getElementById('modal-order')?.classList.add('active');
  }

  close(): void {
    document.getElementById('modal-order')?.classList.remove('active');
    this.selectedOrderId = null;
  }

  private async populateClientsDropdown(selectedId?: string): Promise<void> {
    const select = document.getElementById('order-client-select') as HTMLSelectElement;
    if (!select) return;

    const customers = await this.customerService.getAllCustomers();
    if (customers.length === 0) {
      select.innerHTML = '<option value="" disabled selected>Debes registrar al menos un cliente</option>';
      return;
    }

    select.innerHTML = '<option value="" disabled selected>Selecciona un cliente...</option>' +
      customers.map(c => `<option value="${c.id}">${c.name}</option>`).join('');

    if (selectedId) select.value = selectedId;
  }

  private async populateProductsSelector(): Promise<void> {
    const container = document.getElementById('order-products-selector');
    if (!container) return;

    const products = await this.productService.getAllProducts();
    const activeProducts = products.filter(p => p.available);

    if (activeProducts.length === 0) {
      container.innerHTML = '<div style="color:var(--text-muted);">No hay productos disponibles en el menú.</div>';
      return;
    }

    container.innerHTML = activeProducts.map(p => `
      <div class="builder-product-item">
        <div class="builder-product-info">
          <span class="builder-product-name">${p.name}</span>
          <span class="builder-product-price">${formatMoney(p.price)}</span>
        </div>
        <div class="qty-counter">
          <button type="button" class="qty-btn dec-qty" data-id="${p.id}">-</button>
          <span class="qty-val" id="builder-qty-${p.id}">0</span>
          <button type="button" class="qty-btn inc-qty" data-id="${p.id}">+</button>
        </div>
      </div>
    `).join('');

    this.bindQuantityButtons();
  }

  private bindQuantityButtons(): void {
    document.querySelectorAll('.inc-qty').forEach(btn => {
      btn.addEventListener('click', () => this.adjustQty(btn.getAttribute('data-id') || '', 1));
    });
    document.querySelectorAll('.dec-qty').forEach(btn => {
      btn.addEventListener('click', () => this.adjustQty(btn.getAttribute('data-id') || '', -1));
    });
  }

  private adjustQty(prodId: string, amount: number): void {
    const current = this.selectedProducts.get(prodId) || 0;
    const next = current + amount;

    if (next <= 0) {
      this.selectedProducts.delete(prodId);
    } else {
      this.selectedProducts.set(prodId, next);
    }

    const span = document.getElementById(`builder-qty-${prodId}`);
    if (span) span.textContent = (next <= 0 ? 0 : next).toString();

    this.updateTotalsSummary();
  }

  private async updateTotalsSummary(): Promise<void> {
    const list = document.getElementById('builder-summary-list');
    if (!list) return;

    const products = await this.productService.getAllProducts();
    let subtotal = 0;
    const rows: string[] = [];

    this.selectedProducts.forEach((qty, id) => {
      const prod = products.find(p => p.id === id);
      if (prod) {
        subtotal += prod.price * qty;
        rows.push(`
          <div class="builder-summary-row">
            <span class="item-qty-name">${qty}x ${prod.name}</span>
            <span>${formatMoney(prod.price * qty)}</span>
          </div>
        `);
      }
    });

    list.innerHTML = rows.length === 0 ? '<p style="color:var(--text-muted); font-size:0.85rem; text-align:center; margin:auto;">No has seleccionado productos.</p>' : rows.join('');
    
    const delivery = parseFloat((document.getElementById('order-delivery-fee') as HTMLInputElement).value) || 0;
    
    (document.getElementById('builder-subtotal') as HTMLElement).textContent = formatMoney(subtotal);
    (document.getElementById('builder-delivery') as HTMLElement).textContent = formatMoney(delivery);
    (document.getElementById('builder-grand-total') as HTMLElement).textContent = formatMoney(subtotal + delivery);
  }

  private loadOrderIntoForm(order: any): void {
    (document.getElementById('order-client-select') as HTMLSelectElement).value = order.customerId;
    (document.getElementById('order-delivery-fee') as HTMLInputElement).value = order.deliveryFee.toString();
    (document.getElementById('order-payment-status') as HTMLSelectElement).value = order.paymentStatus;
    (document.getElementById('order-notes') as HTMLInputElement).value = order.notes || '';

    const dateInput = document.getElementById('order-delivery-date') as HTMLInputElement;
    const timeInput = document.getElementById('order-delivery-time') as HTMLInputElement;
    if (order.deliveryAt) {
      const parts = order.deliveryAt.split('T');
      if (dateInput) dateInput.value = parts[0] || '';
      if (timeInput) {
        timeInput.value = parts[1] || '';
        timeInput.disabled = false;
      }
    } else {
      if (dateInput) dateInput.value = '';
      if (timeInput) {
        timeInput.value = '';
        timeInput.disabled = true;
      }
    }

    order.products.forEach((item: any) => {
      this.selectedProducts.set(item.productId, item.quantity);
      const span = document.getElementById(`builder-qty-${item.productId}`);
      if (span) span.textContent = item.quantity.toString();
    });

    this.updateTotalsSummary();
  }

  private async handleSubmit(e: Event): Promise<void> {
    e.preventDefault();

    if (this.selectedProducts.size === 0) {
      alert('Debes seleccionar al menos 1 producto con cantidad mayor a 0.');
      return;
    }

    const customerId = (document.getElementById('order-client-select') as HTMLSelectElement).value;
    if (!customerId) {
      alert('Debes seleccionar un cliente.');
      return;
    }

    try {
      const deliveryFee = parseFloat((document.getElementById('order-delivery-fee') as HTMLInputElement).value) || 0;
      const paymentStatus = (document.getElementById('order-payment-status') as HTMLSelectElement).value as 'paid' | 'unpaid';
      const notes = (document.getElementById('order-notes') as HTMLInputElement).value;
      const dateVal = (document.getElementById('order-delivery-date') as HTMLInputElement).value;
      const timeVal = (document.getElementById('order-delivery-time') as HTMLInputElement).value;
      const deliveryAt = dateVal ? `${dateVal}T${timeVal || '12:00'}` : undefined;

      const products = await this.productService.getAllProducts();

      const items: OrderItem[] = [];
      this.selectedProducts.forEach((qty, id) => {
        const prod = products.find(p => p.id === id);
        if (prod) {
          items.push({ productId: prod.id, name: prod.name, price: prod.price, quantity: qty });
        }
      });

      if (this.selectedOrderId) {
        // Update mode
        const existing = await this.orderService.getOrderById(this.selectedOrderId);
        if (existing) {
          const subtotal = items.reduce((sum, i) => sum + (i.price * i.quantity), 0);
          await this.orderService.updateOrder({
            ...existing,
            customerId,
            products: items,
            subtotal,
            total: subtotal + deliveryFee,
            deliveryFee,
            paymentStatus,
            notes,
            deliveryAt
          });
        }
      } else {
        // Create mode
        await this.orderService.createOrder({
          customerId,
          items,
          discount: 0,
          deliveryFee,
          paymentMethod: 'efectivo',
          paymentStatus,
          notes,
          deliveryAt
        });
      }

      showToast(this.selectedOrderId ? 'Pedido actualizado con éxito' : 'Pedido registrado con éxito');
      this.close();
      this.onReloadParent();
    } catch (err: any) {
      showToast(err.message || 'Error al procesar pedido', 'danger');
    }
  }

  async quickAddClientTrigger(clientsPage: any): Promise<void> {
    clientsPage.init((newClientId: string) => {
      this.populateClientsDropdown(newClientId);
    });
    clientsPage.openModal(undefined, true);
  }
}
