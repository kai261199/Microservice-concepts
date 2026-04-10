namespace OrderService.Api.Domain.Enums;

public enum OrderStatus
{
    /// <summary>Order vừa được tạo, chờ xử lý</summary>
    Pending = 0,

    /// <summary>Đang giữ hàng (stock reservation)</summary>
    StockReserving = 1,

    /// <summary>Hàng đã được giữ, đang thanh toán</summary>
    StockReserved = 2,

    /// <summary>Đang xử lý thanh toán</summary>
    PaymentProcessing = 3,

    /// <summary>Đơn hàng hoàn tất</summary>
    Completed = 4,

    /// <summary>Đơn hàng thất bại</summary>
    Failed = 5,

    /// <summary>Đang hoàn trả (compensating)</summary>
    Compensating = 6
}
