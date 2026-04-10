using MassTransit;

namespace OrderService.Api.Saga;

/// <summary>
/// [SAGA] State class - lưu trạng thái hiện tại của Saga instance.
/// Mỗi Order sẽ có 1 SagaState riêng, được persist vào SQL Server.
///
/// CorrelationId = OrderId, dùng để MassTransit biết event nào thuộc saga nào.
/// </summary>
public class OrderSagaState : SagaStateMachineInstance
{
    /// <summary>
    /// ID dùng để correlate (liên kết) các event lại với nhau.
    /// Tất cả event trong 1 order flow đều có cùng CorrelationId = OrderId.
    /// </summary>
    public Guid CorrelationId { get; set; }

    /// <summary>
    /// Trạng thái hiện tại của Saga (e.g., "StockReserving", "PaymentProcessing").
    /// MassTransit tự động cập nhật khi chuyển state.
    /// </summary>
    public string CurrentState { get; set; } = string.Empty;

    // Dữ liệu cần lưu qua các bước của Saga
    public Guid CustomerId { get; set; }
    public decimal TotalAmount { get; set; }
    public DateTime CreatedAt { get; set; }
    public string? FailureReason { get; set; }
}
