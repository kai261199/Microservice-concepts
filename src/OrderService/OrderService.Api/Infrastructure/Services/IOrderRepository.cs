using OrderService.Api.Domain.Entities;

namespace OrderService.Api.Infrastructure.Services;

/// <summary>
/// [SCRUTOR] Interface được Scrutor tự động scan và register vào DI container.
/// Scrutor scan assembly → tìm class implement interface → tự động AddScoped().
/// </summary>
public interface IOrderRepository
{
    Task<Order?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<Order> CreateAsync(Order order, CancellationToken ct = default);
    Task UpdateAsync(Order order, CancellationToken ct = default);
}
