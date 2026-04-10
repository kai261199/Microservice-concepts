using MassTransit;
using Microsoft.Extensions.Options;
using PaymentService.Api.Domain.Entities;
using PaymentService.Api.Infrastructure.Data;
using PaymentService.Api.Settings;
using Shared.Contracts.Commands;
using Shared.Contracts.Events;

namespace PaymentService.Api.Consumers;

/// <summary>
/// ╔══════════════════════════════════════════════════════════════════════════════╗
/// ║              PROCESS PAYMENT CONSUMER                                      ║
/// ╠══════════════════════════════════════════════════════════════════════════════╣
/// ║                                                                            ║
/// ║  [ORCHESTRATION] Consumer nhận COMMAND từ Saga (orchestrator).             ║
/// ║  Command ≠ Event:                                                          ║
/// ║    - Event: "OrderCreated" → ai lắng nghe thì nghe (fan-out)              ║
/// ║    - Command: "ProcessPayment" → gửi đến đúng 1 service (point-to-point)  ║
/// ║                                                                            ║
/// ║  [INBOX + IDEMPOTENCY]                                                     ║
/// ║  MassTransit Inbox tự động tracking MessageId.                             ║
/// ║  Nếu command này bị delivery lại (RabbitMQ retry) → Inbox detect trùng    ║
/// ║  → Skip xử lý → Trả về kết quả cũ.                                       ║
/// ║                                                                            ║
/// ║  [OUTBOX]                                                                  ║
/// ║  Khi publish PaymentCompleted/PaymentFailed event,                         ║
/// ║  message được lưu vào OutboxMessage table (cùng transaction với Payment).  ║
/// ║  → Đảm bảo consistency giữa Payment data và event.                        ║
/// ║                                                                            ║
/// ╚══════════════════════════════════════════════════════════════════════════════╝
/// </summary>
public class ProcessPaymentConsumer : IConsumer<ProcessPaymentCommand>
{
    private readonly PaymentDbContext _db;
    private readonly IOptions<PaymentServiceSettings> _settings;
    private readonly ILogger<ProcessPaymentConsumer> _logger;

    public ProcessPaymentConsumer(
        PaymentDbContext db,
        IOptions<PaymentServiceSettings> settings,
        ILogger<ProcessPaymentConsumer> logger)
    {
        _db = db;
        _settings = settings;
        _logger = logger;
    }

    public async Task Consume(ConsumeContext<ProcessPaymentCommand> context)
    {
        var command = context.Message;

        _logger.LogInformation(
            "[CONSUMER] Received ProcessPayment COMMAND for Order {OrderId}. Amount: {Amount}",
            command.OrderId, command.Amount);

        // Simulate payment processing
        var shouldFail = new Random().NextDouble() < _settings.Value.FailureRate;

        var payment = new Payment
        {
            Id = NewId.NextGuid(),
            OrderId = command.OrderId,
            CustomerId = command.CustomerId,
            Amount = command.Amount,
            Status = shouldFail ? PaymentStatus.Failed : PaymentStatus.Completed,
            FailureReason = shouldFail ? "Insufficient funds (simulated)" : null,
            CreatedAt = DateTime.UtcNow
        };

        // Lưu payment vào DB
        _db.Payments.Add(payment);

        // ──────────────────────────────────────────────────────────
        // [OUTBOX] Publish event trong cùng transaction với payment data.
        // Event sẽ được lưu vào OutboxMessage, KHÔNG gửi trực tiếp.
        // ──────────────────────────────────────────────────────────
        if (shouldFail)
        {
            _logger.LogWarning(
                "[CONSUMER] Payment FAILED for Order {OrderId}. Publishing PaymentFailedEvent.",
                command.OrderId);

            await context.Publish(new PaymentFailedEvent
            {
                OrderId = command.OrderId,
                Reason = "Insufficient funds (simulated)"
            });
        }
        else
        {
            _logger.LogInformation(
                "[CONSUMER] Payment SUCCEEDED for Order {OrderId}. Publishing PaymentCompletedEvent.",
                command.OrderId);

            await context.Publish(new PaymentCompletedEvent
            {
                OrderId = command.OrderId,
                PaymentId = payment.Id,
                Amount = payment.Amount,
                PaidAt = payment.CreatedAt
            });
        }

        // SaveChanges = lưu Payment + OutboxMessage trong cùng 1 DB transaction
        await _db.SaveChangesAsync();
    }
}
