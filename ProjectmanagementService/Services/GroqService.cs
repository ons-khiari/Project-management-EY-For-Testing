using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;

namespace ProjectmanagementService.Services
{
    public class GroqService
    {
        private readonly IConfiguration _config;
        private readonly HttpClient _httpClient;

        public GroqService(IConfiguration config)
        {
            _config = config;
            _httpClient = new HttpClient();
        }

        public async Task<string> GenerateAIResponse(string prompt)
        {
            var apiKey = _config["Groq:ApiKey"];
            _httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);

            var requestData = new
            {
                model = "llama3-8b-8192",
                messages = new[]
                {
                new { role = "system", content = "You are a helpful assistant for project management." },
                new { role = "user", content = prompt }
            }
            };

            var content = new StringContent(JsonSerializer.Serialize(requestData), Encoding.UTF8, "application/json");
            var response = await _httpClient.PostAsync("https://api.groq.com/openai/v1/chat/completions", content);

            if (!response.IsSuccessStatusCode)
            {
                var error = await response.Content.ReadAsStringAsync();
                throw new Exception($"Groq API failed: {error}");
            }

            var result = await response.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(result);
            return doc.RootElement.GetProperty("choices")[0].GetProperty("message").GetProperty("content").GetString();
        }
    }
}