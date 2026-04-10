import { FlowStep } from '../types';

export const HAPPY_PATH_STEPS: FlowStep[] = [
  {
    id: 'creating-order',
    label: 'POST /api/orders',
    concept: 'Minimal API',
    description: 'Client gọi API tạo đơn hàng. MediatR dispatch CreateOrderCommand.',
    service: 'client',
    type: 'action',
  },
  {
    id: 'order-created',
    label: 'OrderCreatedEvent',
    concept: 'Outbox Pattern',
    description:
      'Order được lưu + Event lưu vào OutboxMessage trong CÙNG 1 DB transaction. Background job gửi lên RabbitMQ sau.',
    service: 'order',
    type: 'event',
  },
  {
    id: 'stock-reserving',
    label: 'Send ReserveStockCommand',
    concept: 'Orchestration + Saga',
    description:
      'Saga (orchestrator) nhận event → gửi COMMAND trực tiếp đến InventoryService. Command = point-to-point (orchestration).',
    service: 'saga',
    type: 'command',
  },
  {
    id: 'stock-reserved',
    label: 'StockReservedEvent',
    concept: 'Inbox + Idempotency',
    description:
      'InventoryService trừ stock. Inbox tracking MessageId → nếu command bị retry → KHÔNG trừ stock 2 lần.',
    service: 'inventory',
    type: 'event',
  },
  {
    id: 'payment-processing',
    label: 'Send ProcessPaymentCommand',
    concept: 'Orchestration + Saga',
    description:
      'Saga nhận StockReserved → chuyển trạng thái → gửi COMMAND thanh toán đến PaymentService.',
    service: 'saga',
    type: 'command',
  },
  {
    id: 'payment-completed',
    label: 'PaymentCompletedEvent',
    concept: 'Outbox Pattern',
    description:
      'Payment lưu + Event vào OutboxMessage cùng transaction. Saga nhận event → Completed.',
    service: 'payment',
    type: 'event',
  },
  {
    id: 'completed',
    label: 'OrderCompletedEvent',
    concept: 'Eventual Consistency',
    description:
      'Order status cập nhật Completed. Từ lúc tạo → hoàn tất: data EVENTUALLY CONSISTENT.',
    service: 'order',
    type: 'event',
  },
];

export const FAILURE_PATH_STEPS: FlowStep[] = [
  {
    id: 'creating-order',
    label: 'POST /api/orders',
    concept: 'Minimal API',
    description: 'Client gọi API tạo đơn hàng.',
    service: 'client',
    type: 'action',
  },
  {
    id: 'order-created',
    label: 'OrderCreatedEvent',
    concept: 'Outbox Pattern',
    description: 'Order lưu + Event vào OutboxMessage cùng transaction.',
    service: 'order',
    type: 'event',
  },
  {
    id: 'stock-reserving',
    label: 'Send ReserveStockCommand',
    concept: 'Orchestration',
    description: 'Saga gửi command giữ hàng.',
    service: 'saga',
    type: 'command',
  },
  {
    id: 'stock-reserved',
    label: 'StockReservedEvent',
    concept: 'Inbox + Idempotency',
    description: 'Stock đã trừ thành công.',
    service: 'inventory',
    type: 'event',
  },
  {
    id: 'payment-processing',
    label: 'Send ProcessPaymentCommand',
    concept: 'Orchestration',
    description: 'Saga gửi command thanh toán.',
    service: 'saga',
    type: 'command',
  },
  {
    id: 'payment-failed',
    label: 'PaymentFailedEvent ✗',
    concept: 'Saga - Trigger Compensation',
    description:
      'Thanh toán thất bại! Saga detect lỗi → cần COMPENSATING TRANSACTION để rollback stock.',
    service: 'payment',
    type: 'event',
  },
  {
    id: 'compensating',
    label: 'Send ReleaseStockCommand',
    concept: 'Compensating Transaction',
    description:
      'Saga gửi COMPENSATING command → InventoryService hoàn trả stock. Đây là cách Saga rollback mà KHÔNG dùng 2PC.',
    service: 'saga',
    type: 'compensating',
  },
  {
    id: 'failed',
    label: 'OrderFailedEvent',
    concept: 'Eventual Consistency',
    description:
      'Stock hoàn trả xong → Order status = Failed. Data eventually consistent trở lại.',
    service: 'order',
    type: 'event',
  },
];

export const STOCK_FAIL_STEPS: FlowStep[] = [
  {
    id: 'creating-order',
    label: 'POST /api/orders',
    concept: 'Minimal API',
    description: 'Client gọi API tạo đơn hàng.',
    service: 'client',
    type: 'action',
  },
  {
    id: 'order-created',
    label: 'OrderCreatedEvent',
    concept: 'Outbox Pattern',
    description: 'Order lưu + Event vào OutboxMessage cùng transaction.',
    service: 'order',
    type: 'event',
  },
  {
    id: 'stock-reserving',
    label: 'Send ReserveStockCommand',
    concept: 'Orchestration',
    description: 'Saga gửi command giữ hàng.',
    service: 'saga',
    type: 'command',
  },
  {
    id: 'stock-failed',
    label: 'StockReservationFailedEvent ✗',
    concept: 'Saga - No Compensation Needed',
    description:
      'Không đủ hàng! Vì chưa có bước nào cần rollback (payment chưa chạy), Saga chuyển thẳng sang Failed.',
    service: 'inventory',
    type: 'event',
  },
  {
    id: 'failed',
    label: 'OrderFailedEvent',
    concept: 'Eventual Consistency',
    description: 'Order status = Failed. Không cần compensating vì chưa commit gì.',
    service: 'order',
    type: 'event',
  },
];
