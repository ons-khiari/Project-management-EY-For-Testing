using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ProjectManagementService.Data;
using ProjectmanagementService.Models;
using ProjectManagementService.Services;
using ProjectmanagementService.DTO;

namespace ProjectManagementService.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class CommentController : ControllerBase
    {
        private readonly ProjectManagementDbContext _context;
        private readonly KafkaProducerService _kafkaProducer;

        public CommentController(ProjectManagementDbContext context, KafkaProducerService kafkaProducer)
        {
            _kafkaProducer = kafkaProducer;
            _context = context;
        }

        // GET: api/Comments
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Comment>>> GetComments()
        {
            return await _context.Comments.ToListAsync();
        }

        // GET: api/Comments/{id}
        [HttpGet("{id}")]
        public async Task<ActionResult<Comment>> GetComment(string id)
        {
            var comment = await _context.Comments.FindAsync(id);

            if (comment == null)
                return NotFound();

            return comment;
        }

        // GET: api/Comments/by-task/{taskId}
        [HttpGet("by-task/{taskId}")]
        public async Task<ActionResult<IEnumerable<Comment>>> GetCommentsByTaskId(string taskId)
        {
            return await _context.Comments
                .Where(c => c.TaskId == taskId)
                .OrderByDescending(c => c.CreatedAt)
                .ToListAsync();
        }

        // POST: api/Comments
        [HttpPost]
        public async Task<ActionResult<Comment>> CreateComment(Comment comment)
        {
            var task = await _context.Tasks.FindAsync(comment.TaskId);
            if (task == null)
                return BadRequest("Task does not exist.");

            comment.Id = Guid.NewGuid().ToString();
            comment.CreatedAt = DateTime.UtcNow;

            _context.Comments.Add(comment);
            await _context.SaveChangesAsync();

            // Notify assignee
            var notification = new UserNotificationMessage
            {
                EventType = "CommentCreated",
                UserId = task.Assignee,
                ProjectId = task.ProjectId,
                Message = $"A new comment was added to your task: \"{task.Text}\""
            };

            await _kafkaProducer.ProduceNotificationAsync(notification);

            return CreatedAtAction(nameof(GetComment), new { id = comment.Id }, comment);
        }


        // PUT: api/Comments/{id}
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateComment(string id, Comment updatedComment)
        {
            if (id != updatedComment.Id)
                return BadRequest();

            var comment = await _context.Comments.FindAsync(id);
            if (comment == null)
                return NotFound();

            var task = await _context.Tasks.FindAsync(comment.TaskId);
            if (task == null)
                return BadRequest("Associated task not found.");

            comment.Description = updatedComment.Description;
            comment.Assignee = updatedComment.Assignee;
            comment.UpdatedAt = DateTime.UtcNow;

            _context.Entry(comment).State = EntityState.Modified;

            try
            {
                await _context.SaveChangesAsync();

                // Notify assignee
                var notification = new UserNotificationMessage
                {
                    EventType = "CommentUpdated",
                    UserId = task.Assignee,
                    ProjectId = task.ProjectId,
                    Message = $"A comment on your task \"{task.Text}\" has been updated."
                };

                await _kafkaProducer.ProduceNotificationAsync(notification);
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!_context.Comments.Any(c => c.Id == id))
                    return NotFound();
                throw;
            }

            return NoContent();
        }

        // DELETE: api/Comments/{id}
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteComment(string id)
        {
            var comment = await _context.Comments.FindAsync(id);
            if (comment == null)
                return NotFound();

            var task = await _context.Tasks.FindAsync(comment.TaskId);
            if (task == null)
                return BadRequest("Associated task not found.");

            _context.Comments.Remove(comment);
            await _context.SaveChangesAsync();

            // Notify assignee
            var notification = new UserNotificationMessage
            {
                EventType = "CommentDeleted",
                UserId = task.Assignee,
                ProjectId = task.ProjectId,
                Message = $"A comment was removed from your task: \"{task.Text}\""
            };

            await _kafkaProducer.ProduceNotificationAsync(notification);

            return NoContent();
        }
    }
}
