using MassTransit;
using OrderService.Api.Domain.Enums;
using OrderService.Api.Infrastructure.Data;
using Shared.Contracts.Commands;
using Shared.Contracts.Events;
using Microsoft.EntityFrameworkCore;

namespace OrderService.Api.Saga;

/// <summary>
/// ╔══════════════════════════════════════════════════════════════════════════════╗
/// ║                    ORDER SAGA STATE MACHINE (ORCHESTRATOR)                  ║
/// ╠══════════════════════════════════════════════════════════════════════════════╣
/// ║                                                                            ║
/// ║  [ORCHESTRATION vs CHOREOGRAPHY]                                           ║
/// ║                                                                            ║
/// ║  CHOREOGRAPHY: Các service tự phản ứng với event, không ai điều phối.      ║
/// ║    OrderCreated → InventoryService tự lắng nghe → ReserveStock             ║
/// ║    StockReserved → PaymentService tự lắng nghe → ProcessPayment            ║
/// ║    → Đơn giản nhưng khó theo dõi flow khi nhiều service.                   ║
/// ║                                                                            ║
/// ║  ORCHESTRATION: Có 1 Saga/Orchestrator điều phối toàn bộ flow.             ║
/// ║    Saga nhận OrderCreated → GỬI COMMAND ReserveStock cho Inventory         ║
/// ║    Saga nhận StockReserved → GỬI COMMAND ProcessPayment cho Payment        ║
/// ║    Saga nhận PaymentFailed → GỬI COMMAND ReleaseStock (compensating)       ║
/// ║    → Rõ ràng, dễ theo dõi, dễ handle lỗi.                                 ║
/// ║                                                                            ║
/// ║  [SAGA PATTERN]                                                            ║
/// ║  Saga = chuỗi local transactions, mỗi service xử lý 1 bước.              ║
/// ║  Nếu 1 bước fail → chạy compensating transactions để rollback.             ║
/// ║  Khác với 2PC (2-Phase Commit) vì KHÔNG lock resource.                     ║
/// ║                                                                            ║
/// ║  Flow:                                                                     ║
/// ║  ┌──────────┐    ┌──────────────┐    ┌─────────────────┐    ┌───────────┐  ║
/// ║  │ Pending  │───►│StockReserving│───►│PaymentProcessing│───►│ Completed │  ║
/// ║  └──────────┘    └──────┬───────┘    └────────┬────────┘    └───────────┘  ║
/// ║                         │ fail                │ fail                        ║
/// ║                         ▼                     ▼                             ║
/// ║                    ┌─────────┐          ┌──────────────┐                   ║
/// ║                    │ Failed  │          │ Compensating │──► Failed          ║
/// ║                    └─────────┘          └──────────────┘                   ║
/// ║                                         (Release Stock)                    ║
/// ║                                                                            ║
/// ╚══════════════════════════════════════════════════════════════════════════════╝
/// </summary>
public class OrderSagaStateMachine : MassTransitStateMachine<OrderSagaState>
{
    // ── Các State của Saga ──
    public State StockReserving { get; private set; } = null!;
    public State PaymentProcessing { get; private set; } = null!;
    public State Completed { get; private set; } = null!;
    public State Failed { get; private set; } = null!;
    public State Compensating { get; private set; } = null!;

    // ── Các Event mà Saga lắng nghe ──
    public Event<OrderCreatedEvent> OrderCreated { get; private set; } = null!;
    public Event<StockReservedEvent> StockReserved { get; private set; } = null!;
    public Event<StockReservationFailedEvent> StockReservationFailed { get; private set; } = null!;
    public Event<PaymentCompletedEvent> PaymentCompleted { get; private set; } = null!;
    public Event<PaymentFailedEvent> PaymentFailed { get; private set; } = null!;
    public Event<StockReleasedEvent> StockReleased { get; private set; } = null!;

    public OrderSagaStateMachine()
    {
        // State được lưu dưới dạng string trong DB
        InstanceState(x => x.CurrentState);

        // ══════════════════════════════════════════════════════════
        // Event correlation: MassTransit dùng CorrelationId (= OrderId)
        // để biết event thuộc Saga instance nào.
        // ══════════════════════════════════════════════════════════
        Event(() => OrderCreated, x => x.CorrelateById(ctx => ctx.Message.OrderId));
        Event(() => StockReserved, x => x.CorrelateById(ctx => ctx.Message.OrderId));
        Event(() => StockReservationFailed, x => x.CorrelateById(ctx => ctx.Message.OrderId));
        Event(() => PaymentCompleted, x => x.CorrelateById(ctx => ctx.Message.OrderId));
        Event(() => PaymentFailed, x => x.CorrelateById(ctx => ctx.Message.OrderId));
        Event(() => StockReleased, x => x.CorrelateById(ctx => ctx.Message.OrderId));

        // ══════════════════════════════════════════════════════════
        // BƯỚC 1: Khi nhận OrderCreatedEvent → Bắt đầu Saga
        // Gửi COMMAND (orchestration) đến InventoryService để giữ hàng.
        // ══════════════════════════════════════════════════════════
        Initially(
            When(OrderCreated)
                .Then(context =>
                {
                    // Lưu data vào Saga state để dùng cho các bước sau
                    context.Saga.CustomerId = context.Message.CustomerId;
                    context.Saga.TotalAmount = context.Message.TotalAmount;
                    context.Saga.CreatedAt = context.Message.CreatedAt;

                    LogSagaTransition(context, "Initial", "StockReserving",
                        "Sending ReserveStock COMMAND to InventoryService");
                })
                // [ORCHESTRATION] Gửi command trực tiếp đến InventoryService
                .Send(new Uri("queue:ReserveStock"), context => new ReserveStockCommand
                {
                    OrderId = context.Saga.CorrelationId,
                    Items = context.Message.Items.Select(i => new ReserveStockItem
                    {
                        ProductId = i.ProductId,
                        Quantity = i.Quantity
                    }).ToList()
                })
                .TransitionTo(StockReserving)
        );

        // ══════════════════════════════════════════════════════════
        // BƯỚC 2a: Stock đã reserved thành công → Gửi command thanh toán
        // ══════════════════════════════════════════════════════════
        During(StockReserving,
            When(StockReserved)
                .Then(context =>
                {
                    LogSagaTransition(context, "StockReserving", "PaymentProcessing",
                        "Stock reserved! Sending ProcessPayment COMMAND to PaymentService");
                })
                // [ORCHESTRATION] Gửi command đến PaymentService
                .Send(new Uri("queue:ProcessPayment"), context => new ProcessPaymentCommand
                {
                    OrderId = context.Saga.CorrelationId,
                    CustomerId = context.Saga.CustomerId,
                    Amount = context.Saga.TotalAmount
                })
                .TransitionTo(PaymentProcessing),

            // ══════════════════════════════════════════════════════════
            // BƯỚC 2b: Stock reservation FAILED → Order thất bại
            // Không cần compensating vì chưa có gì cần rollback.
            // ══════════════════════════════════════════════════════════
            When(StockReservationFailed)
                .Then(context =>
                {
                    context.Saga.FailureReason = context.Message.Reason;
                    LogSagaTransition(context, "StockReserving", "Failed",
                        $"Stock reservation failed: {context.Message.Reason}");
                })
                .Publish(context => new OrderFailedEvent
                {
                    OrderId = context.Saga.CorrelationId,
                    Reason = context.Message.Reason,
                    FailedAt = DateTime.UtcNow
                })
                .TransitionTo(Failed)
        );

        // ══════════════════════════════════════════════════════════
        // BƯỚC 3a: Payment thành công → Order hoàn tất!
        // [EVENTUAL CONSISTENCY] Tại thời điểm này:
        //   - OrderService: status = Completed
        //   - InventoryService: stock đã bị trừ
        //   - PaymentService: payment đã recorded
        //   → Dữ liệu EVENTUALLY CONSISTENT (nhất quán cuối cùng)
        // ══════════════════════════════════════════════════════════
        During(PaymentProcessing,
            When(PaymentCompleted)
                .Then(context =>
                {
                    LogSagaTransition(context, "PaymentProcessing", "Completed",
                        "Payment successful! Order completed.");
                })
                .Publish(context => new OrderCompletedEvent
                {
                    OrderId = context.Saga.CorrelationId,
                    CompletedAt = DateTime.UtcNow
                })
                .TransitionTo(Completed),

            // ══════════════════════════════════════════════════════════
            // BƯỚC 3b: Payment FAILED → Cần COMPENSATING TRANSACTION
            // [SAGA COMPENSATING] Phải rollback stock reservation!
            // Gửi ReleaseStock command để hoàn trả hàng đã giữ.
            // ══════════════════════════════════════════════════════════
            When(PaymentFailed)
                .Then(context =>
                {
                    context.Saga.FailureReason = context.Message.Reason;
                    LogSagaTransition(context, "PaymentProcessing", "Compensating",
                        $"Payment failed: {context.Message.Reason}. Sending ReleaseStock COMPENSATING command!");
                })
                // [COMPENSATING TRANSACTION] Gửi command hoàn trả stock
                .Send(new Uri("queue:ReleaseStock"), context => new ReleaseStockCommand
                {
                    OrderId = context.Saga.CorrelationId
                })
                .TransitionTo(Compensating)
        );

        // ══════════════════════════════════════════════════════════
        // BƯỚC 4: Stock đã được release (compensating done) → Failed
        // ══════════════════════════════════════════════════════════
        During(Compensating,
            When(StockReleased)
                .Then(context =>
                {
                    LogSagaTransition(context, "Compensating", "Failed",
                        "Stock released (compensation complete). Order marked as Failed.");
                })
                .Publish(context => new OrderFailedEvent
                {
                    OrderId = context.Saga.CorrelationId,
                    Reason = context.Saga.FailureReason ?? "Payment failed, stock released",
                    FailedAt = DateTime.UtcNow
                })
                .TransitionTo(Failed)
        );
    }

    private static void LogSagaTransition<T>(
        BehaviorContext<OrderSagaState, T> context,
        string from,
        string to,
        string message) where T : class
    {
        // Log ra console để dễ theo dõi khi học
        Console.WriteLine();
        Console.WriteLine($"═══════════════════════════════════════════════════════");
        Console.WriteLine($"  [SAGA] Order: {context.Saga.CorrelationId}");
        Console.WriteLine($"  [SAGA] Transition: {from} → {to}");
        Console.WriteLine($"  [SAGA] {message}");
        Console.WriteLine($"═══════════════════════════════════════════════════════");
        Console.WriteLine();
    }
}
