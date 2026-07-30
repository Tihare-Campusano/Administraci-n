export interface OrderItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
}

export interface Order {
  id: string;
  orderNumber: number;
  customerId: string;
  products: OrderItem[];
  subtotal: number;
  discount: number;
  deliveryFee: number;
  total: number;
  paymentMethod: string;
  paymentStatus: 'paid' | 'unpaid';
  status: 'pending' | 'completed' | 'cancelled';
  notes: string;
  deliveryAt?: string;
  createdAt: string;
  completedAt?: string;
  updatedAt: string;
  deleted?: boolean;
}
