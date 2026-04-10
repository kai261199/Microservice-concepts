using MediatR;
using OrderService.Api.Features.CreateOrder;
using OrderService.Api.Features.GetOrder;

namespace OrderService.Api.Endpoints;

/// <summary>
/// [MINIMAL API] Endpoints cho OrderService.
/// Minimal API = lightweight, không cần Controller.
/// </summary>
public static class OrderEndpoints
{
    public static void MapOrderEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/orders").WithTags("Orders");

        // POST /api/orders - Tạo đơn hàng mới
        group.MapPost("/", async (CreateOrderCommand command, IMediator mediator) =>
        {
            var result = await mediator.Send(command);
            return Results.Created($"/api/orders/{result.OrderId}", result);
        })
        .WithName("CreateOrder")
        .WithSummary("Tạo đơn hàng mới → Trigger Saga flow");

        // GET /api/orders/{id} - Xem đơn hàng (theo dõi trạng thái Saga)
        group.MapGet("/{id:guid}", async (Guid id, IMediator mediator) =>
        {
            var result = await mediator.Send(new GetOrderQuery(id));
            return result is not null ? Results.Ok(result) : Results.NotFound();
        })
        .WithName("GetOrder")
        .WithSummary("Xem đơn hàng - Status sẽ thay đổi theo Saga flow (Eventual Consistency)");
    }
}
