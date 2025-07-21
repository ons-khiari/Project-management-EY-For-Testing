using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;

namespace ProjectmanagementService.Services
{
    public class GroqChatService : IGroqChatService
    {
        private readonly HttpClient _httpClient;
        private readonly IConfiguration _config;

        public GroqChatService(HttpClient httpClient, IConfiguration config)
        {
            _httpClient = httpClient;
            _config = config;
        }

        public async Task<string> GetResponseAsync(string message)
        {
            var apiKey = _config["Groq:ApiKey"];
            _httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);

            var requestBody = new
            {
                model = "llama3-8b-8192",
                messages = new[]
                {
                new { role = "user", content = message }
            }
            };

            var content = new StringContent(JsonSerializer.Serialize(requestBody), Encoding.UTF8, "application/json");

            var response = await _httpClient.PostAsync("https://api.groq.com/openai/v1/chat/completions", content);
            response.EnsureSuccessStatusCode();

            var responseString = await response.Content.ReadAsStringAsync();
            using var json = JsonDocument.Parse(responseString);

            return json.RootElement
                .GetProperty("choices")[0]
                .GetProperty("message")
                .GetProperty("content")
                .GetString() ?? "";
        }
    }
}
