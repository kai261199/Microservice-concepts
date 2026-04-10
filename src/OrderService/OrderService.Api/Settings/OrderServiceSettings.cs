namespace OrderService.Api.Settings;

/// <summary>
/// [OPTIONS PATTERN] Cấu hình cho OrderService, bind từ appsettings.json.
/// Options Pattern giúp quản lý configuration theo strongly-typed class thay vì magic string.
/// </summary>
public class OrderServiceSettings
{
    public const string SectionName = "OrderService";

    public string ServiceName { get; set; } = "OrderService";
    public int MaxRetryAttempts { get; set; } = 3;
    public int SagaTimeoutMinutes { get; set; } = 30;
}

public class RabbitMqSettings
{
    public const string SectionName = "RabbitMq";

    public string Host { get; set; } = "localhost";
    public int Port { get; set; } = 5672;
    public string Username { get; set; } = "guest";
    public string Password { get; set; } = "guest";
}
