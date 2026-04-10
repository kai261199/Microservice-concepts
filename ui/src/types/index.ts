export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
}

export interface CreateOrderRequest {
  customerId: string;
  items: OrderItem[];
}

export interface CreateOrderResult {
  orderId: string;
  status: string;
}

export interface OrderResult {
  orderId: string;
  customerId: string;
  status: string;
  totalAmount: number;
  failureReason: string | null;
  createdAt: string;
  updatedAt: string | null;
  items: OrderItem[];
}

export interface Product {
  id: string;
  name: string;
  stockQuantity: number;
  price: number;
}

export interface Payment {
  id: string;
  orderId: string;
  customerId: string;
  amount: number;
  status: string;
  failureReason: string | null;
  createdAt: string;
}

export interface StockReservation {
  id: string;
  orderId: string;
  productId: string;
  quantity: number;
  isReleased: boolean;
  createdAt: string;
}

export type SagaStep =
  | 'idle'
  | 'creating-order'
  | 'order-created'
  | 'stock-reserving'
  | 'stock-reserved'
  | 'stock-failed'
  | 'payment-processing'
  | 'payment-completed'
  | 'payment-failed'
  | 'compensating'
  | 'completed'
  | 'failed';

export interface FlowStep {
  id: SagaStep;
  label: string;
  concept: string;
  description: string;
  service: 'client' | 'order' | 'inventory' | 'payment' | 'saga';
  type: 'command' | 'event' | 'action' | 'compensating';
}
