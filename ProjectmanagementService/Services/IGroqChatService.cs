namespace ProjectmanagementService.Services
{
    public interface IGroqChatService
    {
        Task<string> GetResponseAsync(string message);
    }
}
