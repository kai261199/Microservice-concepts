using Microsoft.EntityFrameworkCore;
using PaymentService.Api.Infrastructure.Data;

namespace PaymentService.Api.Endpoints;

public static class PaymentEndpoints
{
    public static void MapPaymentEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/payments").WithTags("Payments");

        group.MapGet("/order/{orderId:guid}", async (Guid orderId, PaymentDbContext db) =>
        {
            var payment = await db.Payments
                .FirstOrDefaultAsync(p => p.OrderId == orderId);
            return payment is not null ? Results.Ok(payment) : Results.NotFound();
        })
        .WithName("GetPaymentByOrder")
        .WithSummary("Xem payment theo OrderId");
    }
}
