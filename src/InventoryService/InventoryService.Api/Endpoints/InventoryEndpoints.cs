using Microsoft.EntityFrameworkCore;
using InventoryService.Api.Infrastructure.Data;

namespace InventoryService.Api.Endpoints;

public static class InventoryEndpoints
{
    public static void MapInventoryEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/inventory").WithTags("Inventory");

        group.MapGet("/products", async (InventoryDbContext db) =>
        {
            var products = await db.Products.ToListAsync();
            return Results.Ok(products);
        })
        .WithName("GetProducts")
        .WithSummary("Xem tất cả sản phẩm và stock");

        group.MapGet("/products/{id:guid}", async (Guid id, InventoryDbContext db) =>
        {
            var product = await db.Products.FindAsync(id);
            return product is not null ? Results.Ok(product) : Results.NotFound();
        })
        .WithName("GetProduct");

        group.MapGet("/reservations/{orderId:guid}", async (Guid orderId, InventoryDbContext db) =>
        {
            var reservations = await db.StockReservations
                .Where(r => r.OrderId == orderId)
                .ToListAsync();
            return Results.Ok(reservations);
        })
        .WithName("GetReservationsByOrder")
        .WithSummary("Xem stock reservations theo Order - dùng để verify compensating transaction");
    }
}
