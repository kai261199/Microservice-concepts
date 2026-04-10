namespace InventoryService.Api.Settings;

public class InventoryServiceSettings
{
    public const string SectionName = "InventoryService";
    public string ServiceName { get; set; } = "InventoryService";
}

public class RabbitMqSettings
{
    public const string SectionName = "RabbitMq";
    public string Host { get; set; } = "localhost";
    public int Port { get; set; } = 5672;
    public string Username { get; set; } = "guest";
    public string Password { get; set; } = "guest";
}
