namespace PaymentService.Api.Settings;

public class PaymentServiceSettings
{
    public const string SectionName = "PaymentService";

    public string ServiceName { get; set; } = "PaymentService";
    
    /// <summary>
    /// Simulate: tỷ lệ thanh toán thất bại (0.0 - 1.0).
    /// Set > 0 để test Saga compensating transaction.
    /// </summary>
    public double FailureRate { get; set; } = 0.0;
}

public class RabbitMqSettings
{
    public const string SectionName = "RabbitMq";

    public string Host { get; set; } = "localhost";
    public int Port { get; set; } = 5672;
    public string Username { get; set; } = "guest";
    public string Password { get; set; } = "guest";
}
