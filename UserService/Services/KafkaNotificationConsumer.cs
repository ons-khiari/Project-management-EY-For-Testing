using Confluent.Kafka;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.DependencyInjection;
using System.Text.Json;
using UserService.Models;
using UserService.DTO;
using UserService;

public class KafkaNotificationConsumer : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<KafkaNotificationConsumer> _logger;
    private IConsumer<Ignore, string>? _consumer;

    public KafkaNotificationConsumer(IServiceScopeFactory scopeFactory, ILogger<KafkaNotificationConsumer> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override Task ExecuteAsync(CancellationToken stoppingToken)
    {
        return Task.Run(() =>
        {
            var config = new ConsumerConfig
            {
                BootstrapServers = "kafka:9092",
                GroupId = "user-service-group",
                AutoOffsetReset = AutoOffsetReset.Earliest
            };

            _consumer = new ConsumerBuilder<Ignore, string>(config).Build();
            _consumer.Subscribe("user-notifications");
            _logger.LogInformation("Kafka consumer started and subscribed to 'user-notifications'");

            try
            {
                while (!stoppingToken.IsCancellationRequested)
                {
                    try
                    {
                        var result = _consumer.Consume(stoppingToken);
                        _logger.LogInformation("Consumed message: " + result.Message.Value);

                        var notification = JsonSerializer.Deserialize<UserNotificationMessage>(result.Message.Value);

                        if (notification != null)
                        {
                            using var scope = _scopeFactory.CreateScope();
                            var dbContext = scope.ServiceProvider.GetRequiredService<UserServiceDbContext>();

                            var entity = new Notification
                            {
                                UserId = notification.UserId,
                                ProjectId = notification.ProjectId,
                                Message = notification.Message,
                                EventType = notification.EventType
                            };

                            dbContext.Notifications.Add(entity);
                            dbContext.SaveChanges(); // No need to await in background thread
                        }
                    }
                    catch (ConsumeException ex)
                    {
                        _logger.LogError("Kafka consume error: " + ex.Error.Reason);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError("Error handling Kafka message: " + ex.Message);
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError("Kafka background service failed to start: " + ex.Message);
            }

            return;
        });
    }

    public override void Dispose()
    {
        _consumer?.Close();
        _consumer?.Dispose();
        base.Dispose();
    }
}
