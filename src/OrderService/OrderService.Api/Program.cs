using MassTransit;
using Microsoft.EntityFrameworkCore;
using OrderService.Api.Endpoints;
using OrderService.Api.Infrastructure.Data;
using OrderService.Api.Infrastructure.Services;
using OrderService.Api.Saga;
using OrderService.Api.Settings;

var builder = WebApplication.CreateBuilder(args);

// ══════════════════════════════════════════════════════════════════
// [OPTIONS PATTERN] Bind configuration từ appsettings.json
// Thay vì dùng Configuration["RabbitMq:Host"] (magic string),
// ta dùng strongly-typed class → compile-time safety.
// ══════════════════════════════════════════════════════════════════
builder.Services.Configure<OrderServiceSettings>(
    builder.Configuration.GetSection(OrderServiceSettings.SectionName));
builder.Services.Configure<RabbitMqSettings>(
    builder.Configuration.GetSection(RabbitMqSettings.SectionName));

var rabbitConfig = builder.Configuration.GetSection(RabbitMqSettings.SectionName).Get<RabbitMqSettings>()
    ?? new RabbitMqSettings();

// ══════════════════════════════════════════════════════════════════
// EF Core + SQL Server
// ══════════════════════════════════════════════════════════════════
builder.Services.AddDbContext<OrderDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("OrderDb")));

// ══════════════════════════════════════════════════════════════════
// [SCRUTOR] Tự động scan & register tất cả services trong assembly
// Scrutor tìm tất cả class implement interface có suffix "Repository"
// và tự động đăng ký vào DI container. Không cần viết từng dòng AddScoped.
//
// Ví dụ: OrderRepository implements IOrderRepository
//   → Scrutor tự đăng ký: AddScoped<IOrderRepository, OrderRepository>()
// ══════════════════════════════════════════════════════════════════
builder.Services.Scan(scan => scan
    .FromAssemblyOf<Program>()
    .AddClasses(classes => classes.Where(type => type.Name.EndsWith("Repository")))
    .AsImplementedInterfaces()
    .WithScopedLifetime()
);

// ══════════════════════════════════════════════════════════════════
// [MEDIATR] Đăng ký MediatR - tự scan tất cả Handler trong assembly
// ══════════════════════════════════════════════════════════════════
builder.Services.AddMediatR(cfg => cfg.RegisterServicesFromAssemblyContaining<Program>());

// ══════════════════════════════════════════════════════════════════
// [MASSTRANSIT + RABBITMQ + SAGA + OUTBOX + INBOX]
// Đây là phần cấu hình quan trọng nhất, kết hợp nhiều pattern.
// ══════════════════════════════════════════════════════════════════
builder.Services.AddMassTransit(x =>
{
    // Đăng ký tất cả consumers trong assembly
    x.AddConsumers(typeof(Program).Assembly);

    // ──────────────────────────────────────────────────────────
    // [SAGA] Đăng ký Saga State Machine
    // MassTransit quản lý Saga lifecycle: tạo, cập nhật, hoàn tất.
    // EntityFrameworkRepository = lưu Saga state vào SQL Server.
    // ──────────────────────────────────────────────────────────
    x.AddSagaStateMachine<OrderSagaStateMachine, OrderSagaState>()
        .EntityFrameworkRepository(r =>
        {
            r.ExistingDbContext<OrderDbContext>();
            r.UseSqlServer();
        });

    // ──────────────────────────────────────────────────────────
    // [OUTBOX + INBOX PATTERN]
    // AddEntityFrameworkOutbox() bật cả Outbox lẫn Inbox:
    //
    // OUTBOX (không mất event):
    //   Khi consumer/saga Publish() hoặc Send() message,
    //   message được lưu vào bảng OutboxMessage trong cùng DB transaction.
    //   Background thread đọc OutboxMessage → gửi lên RabbitMQ.
    //   → Nếu RabbitMQ down → message vẫn nằm trong DB → retry sau.
    //
    // INBOX (không xử lý trùng = Idempotency):
    //   Khi nhận message, MassTransit lưu MessageId vào bảng InboxState.
    //   Nếu cùng MessageId đến lần 2 → skip (đã xử lý rồi).
    //   → Đảm bảo idempotency ngay cả khi RabbitMQ delivery lại message.
    //
    // QueryDelay: thời gian giữa mỗi lần quét OutboxMessage table.
    // ──────────────────────────────────────────────────────────
    x.AddEntityFrameworkOutbox<OrderDbContext>(o =>
    {
        o.UseSqlServer();
        o.QueryDelay = TimeSpan.FromSeconds(5);
        o.DuplicateDetectionWindow = TimeSpan.FromMinutes(5);
    });

    // Cấu hình RabbitMQ transport
    x.UsingRabbitMq((context, cfg) =>
    {
        cfg.Host(rabbitConfig.Host, (ushort)rabbitConfig.Port, "/", h =>
        {
            h.Username(rabbitConfig.Username);
            h.Password(rabbitConfig.Password);
        });

        cfg.ConfigureEndpoints(context);
    });
});

builder.Services.AddCors(options => options.AddDefaultPolicy(p => p.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader()));
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

// Auto migrate database on startup
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<OrderDbContext>();
    await db.Database.MigrateAsync();
}

app.UseCors();
app.UseSwagger();
app.UseSwaggerUI();

// [MINIMAL API] Map endpoints
app.MapOrderEndpoints();

app.Run();
