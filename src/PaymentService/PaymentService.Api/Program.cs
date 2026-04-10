using MassTransit;
using Microsoft.EntityFrameworkCore;
using PaymentService.Api.Endpoints;
using PaymentService.Api.Infrastructure.Data;
using PaymentService.Api.Settings;

var builder = WebApplication.CreateBuilder(args);

// [OPTIONS PATTERN]
builder.Services.Configure<PaymentServiceSettings>(
    builder.Configuration.GetSection(PaymentServiceSettings.SectionName));
builder.Services.Configure<RabbitMqSettings>(
    builder.Configuration.GetSection(RabbitMqSettings.SectionName));

var rabbitConfig = builder.Configuration.GetSection(RabbitMqSettings.SectionName).Get<RabbitMqSettings>()
    ?? new RabbitMqSettings();

// EF Core
builder.Services.AddDbContext<PaymentDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("PaymentDb")));

// [MEDIATR]
builder.Services.AddMediatR(cfg => cfg.RegisterServicesFromAssemblyContaining<Program>());

// [MASSTRANSIT + RABBITMQ + OUTBOX + INBOX]
builder.Services.AddMassTransit(x =>
{
    x.AddConsumers(typeof(Program).Assembly);

    // [OUTBOX + INBOX] Cấu hình tương tự OrderService
    x.AddEntityFrameworkOutbox<PaymentDbContext>(o =>
    {
        o.UseSqlServer();
        o.QueryDelay = TimeSpan.FromSeconds(5);
        o.DuplicateDetectionWindow = TimeSpan.FromMinutes(5);
    });

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

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<PaymentDbContext>();
    await db.Database.MigrateAsync();
}

app.UseCors();
app.UseSwagger();
app.UseSwaggerUI();
app.MapPaymentEndpoints();
app.Run();
