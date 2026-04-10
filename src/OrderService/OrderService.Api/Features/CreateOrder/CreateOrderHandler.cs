using MassTransit;
using MediatR;
using OrderService.Api.Domain.Entities;
using OrderService.Api.Domain.Enums;
using OrderService.Api.Infrastructure.Data;
using Shared.Contracts.Events;

namespace OrderService.Api.Features.CreateOrder;

/// <summary>
/// [MEDIATR] Handler xử lý CreateOrderCommand.
/// MediatR tìm handler theo convention: IRequestHandler{TRequest, TResponse}.
///
/// [OUTBOX] Lưu ý: publishEndpoint.Publish() ở đây sẽ KHÔNG gửi trực tiếp lên RabbitMQ.
/// Nhờ Outbox pattern, message được lưu vào bảng OutboxMessage cùng transaction với Order.
/// Background delivery service sẽ gửi message lên RabbitMQ sau đó.
/// → Đảm bảo KHÔNG MẤT EVENT ngay cả khi RabbitMQ down tại thời điểm publish.
/// </summary>
public class CreateOrderHandler : IRequestHandler<CreateOrderCommand, CreateOrderResult>
{
    private readonly OrderDbContext _db;
    private readonly IPublishEndpoint _publishEndpoint;
    private readonly ILogger<CreateOrderHandler> _logger;

    public CreateOrderHandler(
        OrderDbContext db,
        IPublishEndpoint publishEndpoint,
        ILogger<CreateOrderHandler> logger)
    {
        _db = db;
        _publishEndpoint = publishEndpoint;
        _logger = logger;
    }

    public async Task<CreateOrderResult> Handle(CreateOrderCommand request, CancellationToken cancellationToken)
    {
        // 1. Tạo Order entity
        var order = new Order
        {
            Id = NewId.NextGuid(), // MassTransit sequential GUID
            CustomerId = request.CustomerId,
            Status = OrderStatus.Pending,
            TotalAmount = request.Items.Sum(i => i.Quantity * i.UnitPrice),
            CreatedAt = DateTime.UtcNow,
            Items = request.Items.Select(i => new OrderItem
            {
                Id = NewId.NextGuid(),
                ProductId = i.ProductId,
                ProductName = i.ProductName,
                Quantity = i.Quantity,
                UnitPrice = i.UnitPrice
            }).ToList()
        };

        // 2. Lưu Order vào DB
        _db.Orders.Add(order);

        // ──────────────────────────────────────────────────────────
        // [OUTBOX PATTERN + EVENTUAL CONSISTENCY]
        // Publish event trong cùng DbContext transaction.
        // Event sẽ được lưu vào bảng OutboxMessage (không gửi trực tiếp).
        // Sau khi SaveChanges thành công → background job gửi lên RabbitMQ.
        //
        // Tại sao cần Outbox?
        // - Nếu publish trực tiếp lên RabbitMQ rồi SaveChanges fail → message đã gửi nhưng data chưa lưu
        // - Nếu SaveChanges trước rồi publish fail → data đã lưu nhưng message chưa gửi
        // - Outbox giải quyết bằng cách lưu message + data trong CÙNG 1 transaction
        // ──────────────────────────────────────────────────────────
        await _publishEndpoint.Publish(new OrderCreatedEvent
        {
            OrderId = order.Id,
            CustomerId = order.CustomerId,
            Items = request.Items,
            TotalAmount = order.TotalAmount,
            CreatedAt = order.CreatedAt
        }, cancellationToken);

        // 3. SaveChanges = lưu Order + OutboxMessage trong cùng 1 transaction
        await _db.SaveChangesAsync(cancellationToken);

        _logger.LogInformation(
            "[OUTBOX] Order {OrderId} created. Event saved to OutboxMessage table (NOT sent to RabbitMQ yet).",
            order.Id);

        return new CreateOrderResult
        {
            OrderId = order.Id,
            Status = order.Status.ToString()
        };
    }
}
