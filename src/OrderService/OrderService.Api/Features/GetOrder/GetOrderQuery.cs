using MediatR;

namespace OrderService.Api.Features.GetOrder;

/// <summary>
/// [MEDIATR] Query object - đại diện cho ý định "xem đơn hàng".
/// Tách biệt với Command (CQRS pattern).
/// </summary>
public record GetOrderQuery(Guid OrderId) : IRequest<GetOrderResult?>;

public record GetOrderResult
{
    public Guid OrderId { get; init; }
    public Guid CustomerId { get; init; }
    public string Status { get; init; } = string.Empty;
    public decimal TotalAmount { get; init; }
    public string? FailureReason { get; init; }
    public DateTime CreatedAt { get; init; }
    public DateTime? UpdatedAt { get; init; }
    public List<GetOrderItemResult> Items { get; init; } = new();
}

public record GetOrderItemResult
{
    public Guid ProductId { get; init; }
    public string ProductName { get; init; } = string.Empty;
    public int Quantity { get; init; }
    public decimal UnitPrice { get; init; }
}
