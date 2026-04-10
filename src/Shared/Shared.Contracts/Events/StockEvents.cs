namespace Shared.Contracts.Events;

/// <summary>
/// [CHOREOGRAPHY] InventoryService phát ra khi đã giữ hàng thành công.
/// </summary>
public record StockReservedEvent
{
    public Guid OrderId { get; init; }
    public DateTime ReservedAt { get; init; }
}

/// <summary>
/// [SAGA - COMPENSATING] InventoryService phát ra khi không đủ hàng.
/// Saga sẽ chuyển sang trạng thái Failed.
/// </summary>
public record StockReservationFailedEvent
{
    public Guid OrderId { get; init; }
    public string Reason { get; init; } = string.Empty;
}

/// <summary>
/// [SAGA - COMPENSATING] Event khi stock đã được trả lại (rollback).
/// </summary>
public record StockReleasedEvent
{
    public Guid OrderId { get; init; }
    public DateTime ReleasedAt { get; init; }
}
