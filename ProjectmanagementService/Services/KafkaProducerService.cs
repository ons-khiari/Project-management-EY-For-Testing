using Confluent.Kafka;
using System.Text.Json;
using ProjectmanagementService.DTO;

namespace ProjectManagementService.Services
{
    public class KafkaProducerService : IDisposable
    {
        private readonly IProducer<Null, string> _producer;

        public KafkaProducerService()
        {
            var kafkaBootstrapServers = Environment.GetEnvironmentVariable("KAFKA_BOOTSTRAP_SERVERS") ?? "kafka:9092";

            var config = new ProducerConfig
            {
                BootstrapServers = kafkaBootstrapServers,
                Acks = Acks.All, // Ensure delivery
                EnableIdempotence = true // Prevent duplicate messages
            };

            _producer = new ProducerBuilder<Null, string>(config).Build();
        }

        public virtual async Task ProduceNotificationAsync(UserNotificationMessage notification)
        {
            try
            {
                string topic = "user-notifications";
                string jsonMessage = JsonSerializer.Serialize(notification);

                var result = await _producer.ProduceAsync(topic, new Message<Null, string> { Value = jsonMessage });

                Console.WriteLine($"Kafka - Sent message to topic '{result.TopicPartition.Topic}' at offset {result.Offset}");
            }
            catch (ProduceException<Null, string> ex)
            {
                Console.WriteLine($"Kafka - Failed to send message: {ex.Error.Reason}");
            }
        }

        public void Dispose()
        {
            _producer?.Dispose();
        }
    }
}
