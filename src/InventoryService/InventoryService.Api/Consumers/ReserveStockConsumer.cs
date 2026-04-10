using MassTransit;
using Microsoft.EntityFrameworkCore;
using InventoryService.Api.Domain.Entities;
using InventoryService.Api.Infrastructure.Data;
using Shared.Contracts.Commands;
using Shared.Contracts.Events;

namespace InventoryService.Api.Consumers;

/// <summary>
/// ╔══════════════════════════════════════════════════════════════════════════════╗
/// ║              RESERVE STOCK CONSUMER                                        ║
/// ╠══════════════════════════════════════════════════════════════════════════════╣
/// ║                                                                            ║
/// ║  [ORCHESTRATION] Nhận COMMAND từ Saga để giữ hàng.                        ║
/// ║  Command đến từ queue "reserve-stock" (point-to-point).                   ║
/// ║                                                                            ║
/// ║  [INBOX + IDEMPOTENCY]                                                     ║
/// ║  Nếu RabbitMQ retry gửi cùng command → Inbox detect MessageId trùng       ║
/// ║  → Skip → Không xử lý lại → Không trừ stock 2 lần.                       ║
/// ║                                                                            ║
/// ║  Đây là lý do IDEMPOTENCY quan trọng: nếu không có Inbox,                ║
/// ║  1 command bị retry có thể trừ stock nhiều lần → SAI DATA.                ║
/// ║                                                                            ║
/// ║  [OUTBOX]                                                                  ║
/// ║  Khi publish StockReserved/StockReservationFailed event,                  ║
/// ║  message lưu vào OutboxMessage (cùng transaction với stock update).        ║
/// ║  → Nếu stock đã trừ nhưng publish fail → Outbox retry → event vẫn gửi.   ║
/// ║                                                                            ║
/// ╚══════════════════════════════════════════════════════════════════════════════╝
/// </summary>
public class ReserveStockConsumer : IConsumer<ReserveStockCommand>
{
    private readonly InventoryDbContext _db;
    private readonly ILogger<ReserveStockConsumer> _logger;

    public ReserveStockConsumer(InventoryDbContext db, ILogger<ReserveStockConsumer> logger)
    {
        _db = db;
        _logger = logger;
    }

    public async Task Consume(ConsumeContext<ReserveStockCommand> context)
    {
        var command = context.Message;

        _logger.LogInformation(
            "[CONSUMER] Received ReserveStock COMMAND for Order {OrderId}. Items: {Count}",
            command.OrderId, command.Items.Count);

        // Kiểm tra tất cả sản phẩm có đủ stock không
        foreach (var item in command.Items)
        {
            var product = await _db.Products.FirstOrDefaultAsync(p => p.Id == item.ProductId);

            if (product is null)
            {
                _logger.LogWarning("[CONSUMER] Product {ProductId} not found!", item.ProductId);

                await context.Publish(new StockReservationFailedEvent
                {
                    OrderId = command.OrderId,
                    Reason = $"Product {item.ProductId} not found"
                });

                await _db.SaveChangesAsync();
                return;
            }

            if (product.StockQuantity < item.Quantity)
            {
                _logger.LogWarning(
                    "[CONSUMER] Insufficient stock for {Product}. Available: {Available}, Requested: {Requested}",
                    product.Name, product.StockQuantity, item.Quantity);

                await context.Publish(new StockReservationFailedEvent
                {
                    OrderId = command.OrderId,
                    Reason = $"Insufficient stock for {product.Name}. Available: {product.StockQuantity}, Requested: {item.Quantity}"
                });

                await _db.SaveChangesAsync();
                return;
            }
        }

        // ──────────────────────────────────────────────────────────
        // Trừ stock + tạo reservation record (cho compensating)
        // ──────────────────────────────────────────────────────────
        foreach (var item in command.Items)
        {
            var product = await _db.Products.FirstAsync(p => p.Id == item.ProductId);
            product.StockQuantity -= item.Quantity;

            _db.StockReservations.Add(new StockReservation
            {
                Id = NewId.NextGuid(),
                OrderId = command.OrderId,
                ProductId = item.ProductId,
                Quantity = item.Quantity,
                IsReleased = false,
                CreatedAt = DateTime.UtcNow
            });

            _logger.LogInformation(
                "[CONSUMER] Reserved {Qty} x {Product}. Remaining stock: {Remaining}",
                item.Quantity, product.Name, product.StockQuantity);
        }

        // [OUTBOX] Publish event trong cùng transaction
        await context.Publish(new StockReservedEvent
        {
            OrderId = command.OrderId,
            ReservedAt = DateTime.UtcNow
        });

        // SaveChanges = stock update + reservation + OutboxMessage
        await _db.SaveChangesAsync();

        _logger.LogInformation("[CONSUMER] Stock reserved successfully for Order {OrderId}", command.OrderId);
    }
}
