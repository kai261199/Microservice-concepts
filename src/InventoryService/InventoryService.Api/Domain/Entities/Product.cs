namespace InventoryService.Api.Domain.Entities;

public class Product
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public int StockQuantity { get; set; }
    public decimal Price { get; set; }
}

/// <summary>
/// Tracking stock reservation cho mỗi order.
/// Dùng khi cần ReleaseStock (compensating transaction).
/// </summary>
public class StockReservation
{
    public Guid Id { get; set; }
    public Guid OrderId { get; set; }
    public Guid ProductId { get; set; }
    public int Quantity { get; set; }
    public bool IsReleased { get; set; }
    public DateTime CreatedAt { get; set; }
}
