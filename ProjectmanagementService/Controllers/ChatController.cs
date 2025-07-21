using Microsoft.AspNetCore.Mvc;
using ProjectmanagementService.DTO;
using ProjectmanagementService.Services;

namespace ProjectManagementService.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ChatController : ControllerBase
    {
        private readonly IGroqChatService _chatService;

        public ChatController(IGroqChatService chatService)
        {
            _chatService = chatService;
        }

        [HttpPost("ask")]
        public async Task<IActionResult> Ask([FromBody] ChatRequestDto request)
        {
            if (string.IsNullOrWhiteSpace(request.Message))
                return BadRequest("Message is required.");

            var reply = await _chatService.GetResponseAsync(request.Message);
            return Ok(new ChatResponseDto { Response = reply });
        }
    }
}