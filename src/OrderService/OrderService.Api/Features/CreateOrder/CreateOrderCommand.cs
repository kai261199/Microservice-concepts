using MediatR;
using Shared.Contracts.Events;

namespace OrderService.Api.Features.CreateOrder;

/// <summary>
/// [MEDIATR] Command object - đại diện cho ý định "tạo đơn hàng".
/// MediatR dùng pattern CQRS: tách Command (write) và Query (read).
/// </summary>
public record CreateOrderCommand : IRequest<CreateOrderResult>
{
    public Guid CustomerId { get; init; }
    public List<OrderItemDto> Items { get; init; } = new();
}

public record CreateOrderResult
{
    public Guid OrderId { get; init; }
    public string Status { get; init; } = string.Empty;
}
