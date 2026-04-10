namespace Shared.Contracts.Events;

/// <summary>
/// [CHOREOGRAPHY] Event phát ra khi Order được tạo.
/// Các service khác lắng nghe event này để phản ứng (choreography).
/// </summary>
public record OrderCreatedEvent
{
    public Guid OrderId { get; init; }
    public Guid CustomerId { get; init; }
    public List<OrderItemDto> Items { get; init; } = new();
    public decimal TotalAmount { get; init; }
    public DateTime CreatedAt { get; init; }
}

/// <summary>
/// [SAGA] Event khi Order đã hoàn tất (stock reserved + payment done).
/// </summary>
public record OrderCompletedEvent
{
    public Guid OrderId { get; init; }
    public DateTime CompletedAt { get; init; }
}

/// <summary>
/// [SAGA] Event khi Order thất bại (compensating transaction đã chạy).
/// </summary>
public record OrderFailedEvent
{
    public Guid OrderId { get; init; }
    public string Reason { get; init; } = string.Empty;
    public DateTime FailedAt { get; init; }
}

public record OrderItemDto
{
    public Guid ProductId { get; init; }
    public string ProductName { get; init; } = string.Empty;
    public int Quantity { get; init; }
    public decimal UnitPrice { get; init; }
}
