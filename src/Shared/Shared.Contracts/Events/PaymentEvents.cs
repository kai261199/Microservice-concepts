namespace Shared.Contracts.Events;

/// <summary>
/// [CHOREOGRAPHY] PaymentService phát ra khi thanh toán thành công.
/// </summary>
public record PaymentCompletedEvent
{
    public Guid OrderId { get; init; }
    public Guid PaymentId { get; init; }
    public decimal Amount { get; init; }
    public DateTime PaidAt { get; init; }
}

/// <summary>
/// [SAGA - COMPENSATING] PaymentService phát ra khi thanh toán thất bại.
/// Saga sẽ phát lệnh hoàn trả stock (compensating action).
/// </summary>
public record PaymentFailedEvent
{
    public Guid OrderId { get; init; }
    public string Reason { get; init; } = string.Empty;
}
