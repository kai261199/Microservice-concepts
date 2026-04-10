using MassTransit;
using Microsoft.EntityFrameworkCore;
using OrderService.Api.Domain.Entities;
using OrderService.Api.Saga;

namespace OrderService.Api.Infrastructure.Data;

public class OrderDbContext : DbContext
{
    public OrderDbContext(DbContextOptions<OrderDbContext> options) : base(options) { }

    public DbSet<Order> Orders => Set<Order>();
    public DbSet<OrderItem> OrderItems => Set<OrderItem>();

    // ──────────────────────────────────────────────────────────
    // [SAGA] Bảng lưu trạng thái Saga (Saga persistence)
    // MassTransit cần lưu trạng thái Saga vào DB thay vì in-memory
    // để saga không bị mất khi service restart.
    // ──────────────────────────────────────────────────────────
    public DbSet<OrderSagaState> OrderSagaStates => Set<OrderSagaState>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // ──────────────────────────────────────────────────────────
        // [OUTBOX PATTERN] Cấu hình Outbox tables
        // MassTransit EF Outbox tạo 3 bảng:
        //   - InboxState:    tracking message đã nhận (Inbox/Idempotency)
        //   - OutboxState:   tracking message đã gửi
        //   - OutboxMessage: lưu message chờ gửi
        //
        // OUTBOX: Khi publish event, message được lưu vào OutboxMessage
        // trong cùng transaction với business data → KHÔNG MẤT EVENT.
        // Sau đó background job sẽ gửi message lên RabbitMQ.
        //
        // INBOX: Khi nhận message, MessageId được lưu vào InboxState.
        // Nếu message trùng MessageId → skip → KHÔNG XỬ LÝ TRÙNG.
        // ──────────────────────────────────────────────────────────
        modelBuilder.AddInboxStateEntity();
        modelBuilder.AddOutboxStateEntity();
        modelBuilder.AddOutboxMessageEntity();

        // Order entity config
        modelBuilder.Entity<Order>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Status).HasConversion<string>();
            entity.Property(e => e.TotalAmount).HasPrecision(18, 2);
            entity.HasMany(e => e.Items).WithOne(e => e.Order).HasForeignKey(e => e.OrderId);
        });

        modelBuilder.Entity<OrderItem>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.UnitPrice).HasPrecision(18, 2);
        });

        // [SAGA] Config Saga state entity
        modelBuilder.Entity<OrderSagaState>(entity =>
        {
            entity.HasKey(e => e.CorrelationId);
            entity.Property(e => e.CurrentState).HasMaxLength(64);
            entity.Property(e => e.TotalAmount).HasPrecision(18, 2);
        });
    }
}
