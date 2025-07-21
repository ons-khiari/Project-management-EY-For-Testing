using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ProjectManagementService.Data;
using ProjectmanagementService.Models;
using ProjectmanagementService.DTO;
using ProjectManagementService.Services;

namespace ProjectManagementService.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class SubTasksController : ControllerBase
    {
        private readonly ProjectManagementDbContext _context;
        private readonly KafkaProducerService _kafkaProducer;

        public SubTasksController(ProjectManagementDbContext context, KafkaProducerService kafkaProducer)
        {
            _kafkaProducer = kafkaProducer;
            _context = context;
        }

        // GET: api/SubTasks
        [HttpGet]
        public async Task<ActionResult<IEnumerable<SubTask>>> GetSubTasks()
        {
            return await _context.SubTasks.ToListAsync();
        }

        // GET: api/SubTasks/{id}
        [HttpGet("{id}")]
        public async Task<ActionResult<SubTask>> GetSubTask(string id)
        {
            var subTask = await _context.SubTasks.FindAsync(id);

            if (subTask == null)
                return NotFound();

            return subTask;
        }

        // GET: api/SubTasks/by-task/{taskId}
        [HttpGet("by-task/{taskId}")]
        public async Task<ActionResult<IEnumerable<SubTask>>> GetSubTasksByTaskId(string taskId)
        {
            return await _context.SubTasks
                .Where(st => st.TaskId == taskId)
                .ToListAsync();
        }

        // POST: api/SubTasks
        [HttpPost]
        public async Task<ActionResult<SubTask>> CreateSubTask(SubTask subTask)
        {
            if (!await _context.Tasks.AnyAsync(t => t.Id == subTask.TaskId))
                return BadRequest("Task does not exist.");

            subTask.Id = Guid.NewGuid().ToString();
            subTask.CreatedAt = DateTime.UtcNow;

            _context.SubTasks.Add(subTask);
            await _context.SaveChangesAsync();

            // Notify assignee
            var notification = new UserNotificationMessage
            {
                EventType = "SubTaskCreated",
                UserId = subTask.Assignee,
                ProjectId = null, // Optional: set if available
                Message = $"You have been assigned a new subtask: \"{subTask.Description}\""
            };

            await _kafkaProducer.ProduceNotificationAsync(notification);

            return CreatedAtAction(nameof(GetSubTask), new { id = subTask.Id }, subTask);
        }

        // PUT: api/SubTasks/{id}
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateSubTask(string id, SubTask updatedSubTask)
        {
            if (id != updatedSubTask.Id)
                return BadRequest();

            var subTask = await _context.SubTasks.FindAsync(id);
            if (subTask == null)
                return NotFound();

            subTask.Description = updatedSubTask.Description;
            subTask.IsCompleted = updatedSubTask.IsCompleted;
            subTask.Assignee = updatedSubTask.Assignee;
            subTask.UpdatedAt = DateTime.UtcNow;

            _context.Entry(subTask).State = EntityState.Modified;

            try
            {
                await _context.SaveChangesAsync();

                // Notify assignee
                var notification = new UserNotificationMessage
                {
                    EventType = "SubTaskUpdated",
                    UserId = subTask.Assignee,
                    ProjectId = null,
                    Message = $"Your subtask \"{subTask.Description}\" has been updated."
                };

                await _kafkaProducer.ProduceNotificationAsync(notification);
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!_context.SubTasks.Any(st => st.Id == id))
                    return NotFound();
                throw;
            }

            return NoContent();
        }

        // DELETE: api/SubTasks/{id}
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteSubTask(string id)
        {
            var subTask = await _context.SubTasks.FindAsync(id);
            if (subTask == null)
                return NotFound();

            var assignee = subTask.Assignee;
            var description = subTask.Description;

            _context.SubTasks.Remove(subTask);
            await _context.SaveChangesAsync();

            // Notify assignee
            var notification = new UserNotificationMessage
            {
                EventType = "SubTaskDeleted",
                UserId = assignee,
                ProjectId = null,
                Message = $"Your subtask \"{description}\" has been deleted."
            };

            await _kafkaProducer.ProduceNotificationAsync(notification);

            return NoContent();
        }
    }
}
