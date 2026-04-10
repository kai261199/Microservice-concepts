namespace Shared.Contracts.Commands;

/// <summary>
/// [ORCHESTRATION] Saga gửi command này đến InventoryService để giữ hàng.
/// Command = điều phối trực tiếp (orchestration), khác với Event = phát ra ai nghe thì nghe (choreography).
/// </summary>
public record ReserveStockCommand
{
    public Guid OrderId { get; init; }
    public List<ReserveStockItem> Items { get; init; } = new();
}

public record ReserveStockItem
{
    public Guid ProductId { get; init; }
    public int Quantity { get; init; }
}

/// <summary>
/// [SAGA - COMPENSATING] Saga gửi command này để hoàn trả stock khi payment thất bại.
/// Đây là "compensating transaction" trong Saga pattern.
/// </summary>
public record ReleaseStockCommand
{
    public Guid OrderId { get; init; }
}

/// <summary>
/// [ORCHESTRATION] Saga gửi command này đến PaymentService để xử lý thanh toán.
/// </summary>
public record ProcessPaymentCommand
{
    public Guid OrderId { get; init; }
    public Guid CustomerId { get; init; }
    public decimal Amount { get; init; }
}
