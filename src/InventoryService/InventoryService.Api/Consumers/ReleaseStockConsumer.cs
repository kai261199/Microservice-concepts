using MassTransit;
using Microsoft.EntityFrameworkCore;
using InventoryService.Api.Infrastructure.Data;
using Shared.Contracts.Commands;
using Shared.Contracts.Events;

namespace InventoryService.Api.Consumers;

/// <summary>
/// ╔══════════════════════════════════════════════════════════════════════════════╗
/// ║              RELEASE STOCK CONSUMER (COMPENSATING TRANSACTION)             ║
/// ╠══════════════════════════════════════════════════════════════════════════════╣
/// ║                                                                            ║
/// ║  [SAGA - COMPENSATING TRANSACTION]                                         ║
/// ║  Đây là handler cho compensating action.                                  ║
/// ║                                                                            ║
/// ║  Khi Payment thất bại, Saga gửi ReleaseStock command đến đây.             ║
/// ║  Consumer sẽ:                                                             ║
/// ║    1. Tìm tất cả reservation của order                                    ║
/// ║    2. Hoàn trả stock cho từng product                                     ║
/// ║    3. Đánh dấu reservation là released                                    ║
/// ║    4. Publish StockReleasedEvent → Saga biết compensation xong            ║
/// ║                                                                            ║
/// ║  Đây là khác biệt giữa SAGA và 2PC (Two-Phase Commit):                   ║
/// ║    - 2PC: Lock tất cả resource → commit hoặc rollback                     ║
/// ║    - SAGA: Mỗi service commit ngay → nếu fail thì chạy compensating      ║
/// ║    → SAGA không lock → hiệu suất tốt hơn nhưng phức tạp hơn.            ║
/// ║                                                                            ║
/// ╚══════════════════════════════════════════════════════════════════════════════╝
/// </summary>
public class ReleaseStockConsumer : IConsumer<ReleaseStockCommand>
{
    private readonly InventoryDbContext _db;
    private readonly ILogger<ReleaseStockConsumer> _logger;

    public ReleaseStockConsumer(InventoryDbContext db, ILogger<ReleaseStockConsumer> logger)
    {
        _db = db;
        _logger = logger;
    }

    public async Task Consume(ConsumeContext<ReleaseStockCommand> context)
    {
        var command = context.Message;

        _logger.LogWarning(
            "[COMPENSATING] Received ReleaseStock command for Order {OrderId}. Rolling back stock...",
            command.OrderId);

        // Tìm tất cả reservation chưa release
        var reservations = await _db.StockReservations
            .Where(r => r.OrderId == command.OrderId && !r.IsReleased)
            .ToListAsync();

        foreach (var reservation in reservations)
        {
            var product = await _db.Products.FirstOrDefaultAsync(p => p.Id == reservation.ProductId);
            if (product is not null)
            {
                // Hoàn trả stock
                product.StockQuantity += reservation.Quantity;
                reservation.IsReleased = true;

                _logger.LogWarning(
                    "[COMPENSATING] Released {Qty} x {Product}. Stock restored to {Stock}",
                    reservation.Quantity, product.Name, product.StockQuantity);
            }
        }

        // [OUTBOX] Publish compensating event trong cùng transaction
        await context.Publish(new StockReleasedEvent
        {
            OrderId = command.OrderId,
            ReleasedAt = DateTime.UtcNow
        });

        await _db.SaveChangesAsync();

        _logger.LogWarning(
            "[COMPENSATING] Stock released for Order {OrderId}. Compensating transaction complete.",
            command.OrderId);
    }
}
