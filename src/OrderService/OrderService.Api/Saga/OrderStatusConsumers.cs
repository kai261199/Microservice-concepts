using MassTransit;
using Microsoft.EntityFrameworkCore;
using OrderService.Api.Domain.Enums;
using OrderService.Api.Infrastructure.Data;
using Shared.Contracts.Events;

namespace OrderService.Api.Saga;

/// <summary>
/// [CHOREOGRAPHY] Consumer lắng nghe OrderCompletedEvent để cập nhật Order status.
/// Đây là ví dụ về CHOREOGRAPHY: consumer tự phản ứng với event.
///
/// [EVENTUAL CONSISTENCY] Order status ban đầu = Pending.
/// Sau khi Saga hoàn tất (có thể vài giây) → status mới = Completed.
/// Trong khoảng thời gian Pending → Completed, data CHƯA consistent.
/// → Đây là "Eventual Consistency" (nhất quán cuối cùng).
/// </summary>
public class OrderCompletedConsumer : IConsumer<OrderCompletedEvent>
{
    private readonly OrderDbContext _db;
    private readonly ILogger<OrderCompletedConsumer> _logger;

    public OrderCompletedConsumer(OrderDbContext db, ILogger<OrderCompletedConsumer> logger)
    {
        _db = db;
        _logger = logger;
    }

    public async Task Consume(ConsumeContext<OrderCompletedEvent> context)
    {
        var order = await _db.Orders.FirstOrDefaultAsync(o => o.Id == context.Message.OrderId);
        if (order is null) return;

        order.Status = OrderStatus.Completed;
        order.UpdatedAt = context.Message.CompletedAt;
        await _db.SaveChangesAsync();

        _logger.LogInformation(
            "[EVENTUAL CONSISTENCY] Order {OrderId} status updated to Completed. " +
            "Data is now consistent across all services.",
            order.Id);
    }
}

/// <summary>
/// [CHOREOGRAPHY] Consumer lắng nghe OrderFailedEvent để cập nhật Order status.
/// </summary>
public class OrderFailedConsumer : IConsumer<OrderFailedEvent>
{
    private readonly OrderDbContext _db;
    private readonly ILogger<OrderFailedConsumer> _logger;

    public OrderFailedConsumer(OrderDbContext db, ILogger<OrderFailedConsumer> logger)
    {
        _db = db;
        _logger = logger;
    }

    public async Task Consume(ConsumeContext<OrderFailedEvent> context)
    {
        var order = await _db.Orders.FirstOrDefaultAsync(o => o.Id == context.Message.OrderId);
        if (order is null) return;

        order.Status = OrderStatus.Failed;
        order.FailureReason = context.Message.Reason;
        order.UpdatedAt = context.Message.FailedAt;
        await _db.SaveChangesAsync();

        _logger.LogInformation(
            "[EVENTUAL CONSISTENCY] Order {OrderId} status updated to Failed. Reason: {Reason}",
            order.Id, context.Message.Reason);
    }
}

/// <summary>
/// [EVENTUAL CONSISTENCY] Cập nhật Order.Status khi stock reserved thành công.
/// Nếu thiếu consumer này → Order.Status luôn là Pending → polling UI không bao giờ thấy tiến triển.
/// </summary>
public class StockReservedStatusConsumer : IConsumer<StockReservedEvent>
{
    private readonly OrderDbContext _db;
    private readonly ILogger<StockReservedStatusConsumer> _logger;

    public StockReservedStatusConsumer(OrderDbContext db, ILogger<StockReservedStatusConsumer> logger)
    {
        _db = db;
        _logger = logger;
    }

    public async Task Consume(ConsumeContext<StockReservedEvent> context)
    {
        var order = await _db.Orders.FirstOrDefaultAsync(o => o.Id == context.Message.OrderId);
        if (order is null || order.Status == OrderStatus.Completed || order.Status == OrderStatus.Failed) return;

        order.Status = OrderStatus.PaymentProcessing;
        order.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        _logger.LogInformation(
            "[EVENTUAL CONSISTENCY] Order {OrderId} → PaymentProcessing (stock reserved OK).",
            order.Id);
    }
}

/// <summary>
/// [EVENTUAL CONSISTENCY] Cập nhật Order.Status khi đang compensate (stock released).
/// </summary>
public class StockReleasedStatusConsumer : IConsumer<StockReleasedEvent>
{
    private readonly OrderDbContext _db;
    private readonly ILogger<StockReleasedStatusConsumer> _logger;

    public StockReleasedStatusConsumer(OrderDbContext db, ILogger<StockReleasedStatusConsumer> logger)
    {
        _db = db;
        _logger = logger;
    }

    public async Task Consume(ConsumeContext<StockReleasedEvent> context)
    {
        var order = await _db.Orders.FirstOrDefaultAsync(o => o.Id == context.Message.OrderId);
        if (order is null || order.Status == OrderStatus.Completed || order.Status == OrderStatus.Failed) return;

        order.Status = OrderStatus.Compensating;
        order.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        _logger.LogInformation(
            "[EVENTUAL CONSISTENCY] Order {OrderId} → Compensating (stock released).",
            order.Id);
    }
}
