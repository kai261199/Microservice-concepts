import {
  CreateOrderRequest,
  CreateOrderResult,
  OrderResult,
  Product,
  Payment,
  StockReservation,
} from '../types';

const ORDER_API = 'http://localhost:5001';
const PAYMENT_API = 'http://localhost:5036';
const INVENTORY_API = 'http://localhost:5003';

export async function createOrder(request: CreateOrderRequest): Promise<CreateOrderResult> {
  const res = await fetch(`${ORDER_API}/api/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  if (!res.ok) throw new Error(`Create order failed: ${res.status}`);
  return res.json();
}

export async function getOrder(orderId: string): Promise<OrderResult> {
  const res = await fetch(`${ORDER_API}/api/orders/${orderId}`);
  if (!res.ok) throw new Error(`Get order failed: ${res.status}`);
  return res.json();
}

export async function getProducts(): Promise<Product[]> {
  const res = await fetch(`${INVENTORY_API}/api/inventory/products`);
  if (!res.ok) throw new Error(`Get products failed: ${res.status}`);
  return res.json();
}

export async function getPaymentByOrder(orderId: string): Promise<Payment | null> {
  const res = await fetch(`${PAYMENT_API}/api/payments/order/${orderId}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Get payment failed: ${res.status}`);
  return res.json();
}

export async function getReservations(orderId: string): Promise<StockReservation[]> {
  const res = await fetch(`${INVENTORY_API}/api/inventory/reservations/${orderId}`);
  if (!res.ok) throw new Error(`Get reservations failed: ${res.status}`);
  return res.json();
}
