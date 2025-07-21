using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ProjectmanagementService.DTO;
using ProjectmanagementService.Models;
using ProjectmanagementService.Services;
using ProjectManagementService.Data;
using ProjectManagementService.Services;

namespace ProjectmanagementService.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class TaskController : ControllerBase
    {
        private readonly ProjectManagementDbContext _context;
        private readonly DeliverableService _deliverableService;
        private readonly KafkaProducerService _kafkaProducer;

        public TaskController(ProjectManagementDbContext context, DeliverableService deliverableService, KafkaProducerService kafkaProducer)
        {
            _kafkaProducer = kafkaProducer;
            _context = context;
            _deliverableService = deliverableService;
        }

        // GET: /Task  
        [HttpGet]
        public async System.Threading.Tasks.Task<ActionResult<IEnumerable<ProjectmanagementService.Models.Task>>> GetTasks()
        {
            return await _context.Tasks.ToListAsync();
        }

        // GET: /Task/{id}  
        [HttpGet("{id}")]
        public async System.Threading.Tasks.Task<ActionResult<ProjectmanagementService.Models.Task>> GetTask(string id)
        {
            var task = await _context.Tasks.FindAsync(id);

            if (task == null)
            {
                return NotFound();
            }

            return task;
        }

        // POST: /Task  
        [HttpPost]
        public async Task<ActionResult<ProjectmanagementService.Models.Task>> CreateTask(ProjectmanagementService.Models.Task task)
        {
            _context.Tasks.Add(task);
            await _context.SaveChangesAsync();

            // Notify the assignee
            var notification = new UserNotificationMessage
            {
                EventType = "TaskCreated",
                UserId = task.Assignee,
                ProjectId = task.ProjectId,
                Message = $"You have been assigned a new task: \"{task.Text}\""
            };

            await _kafkaProducer.ProduceNotificationAsync(notification);

            return CreatedAtAction(nameof(GetTask), new { id = task.Id }, task);
        }

        // PUT: /Task/{id}  
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateTask(string id, ProjectmanagementService.Models.Task updatedTask)
        {
            if (id != updatedTask.Id)
                return BadRequest();

            _context.Entry(updatedTask).State = EntityState.Modified;

            try
            {
                await _context.SaveChangesAsync();

                // Notify the assignee
                var notification = new UserNotificationMessage
                {
                    EventType = "TaskUpdated",
                    UserId = updatedTask.Assignee,
                    ProjectId = updatedTask.ProjectId,
                    Message = $"Task \"{updatedTask.Text}\" assigned to you has been updated."
                };

                await _kafkaProducer.ProduceNotificationAsync(notification);
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!TaskExists(id))
                    return NotFound();
                else
                    throw;
            }

            return NoContent();
        }

        // DELETE: /Task/{id}  
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteTask(string id)
        {
            var task = await _context.Tasks.FindAsync(id);
            if (task == null)
                return NotFound();

            var assignee = task.Assignee;
            var text = task.Text;
            var projectId = task.ProjectId;

            _context.Tasks.Remove(task);
            await _context.SaveChangesAsync();

            // Notify the assignee
            var notification = new UserNotificationMessage
            {
                EventType = "TaskDeleted",
                UserId = assignee,
                ProjectId = projectId,
                Message = $"Task \"{text}\" assigned to you has been deleted."
            };

            await _kafkaProducer.ProduceNotificationAsync(notification);

            return NoContent();
        }

        private bool TaskExists(string id)
        {
            return _context.Tasks.Any(t => t.Id == id);
        }

        // PUT: api/Task/{id}/status
        [HttpPut("{id}/status")]
        public async Task<IActionResult> UpdateTaskStatus(string id, [FromBody] string newStatus)
        {
            try
            {
                var task = await _context.Tasks.FirstOrDefaultAsync(t => t.Id == id);
                if (task == null)
                {
                    return NotFound("Task not found");
                }

                task.Status = newStatus;
                await _context.SaveChangesAsync();

                if (!string.IsNullOrEmpty(task.DeliverableId))
                {
                    await _deliverableService.RecalculateDeliverableStatusAsync(task.DeliverableId);
                }

                return Ok(new { message = "Task status updated successfully." });
            }
            catch (Exception ex)
            {
                return BadRequest($"Error: {ex.Message}");
            }
        }

        // GET: api/Task/team-member/{teamMemberId}/summary
        [HttpGet("team-member/{teamMemberId}/summary")]
        public async Task<IActionResult> GetTaskSummaryForTeamMember(string teamMemberId)
        {
            var tasks = await _context.Tasks
                .Where(t => t.Assignee == teamMemberId)
                .ToListAsync();

            if (tasks == null || tasks.Count == 0)
            {
                return NotFound("No tasks found for the specified team member.");
            }

            var totalTasks = tasks.Count;
            var doneTasks = tasks.Count(t => t.Status.ToLower() == "done");

            var result = new
            {
                TeamMemberId = teamMemberId,
                TotalTasks = totalTasks,
                DoneTasks = doneTasks
            };

            return Ok(result);
        }

        // GET: api/Task/team-member/{teamMemberId}/priority
        // GET: api/Task/team-member/{teamMemberId}/priority
        [HttpGet("team-member/{teamMemberId}/priority")]
        public async Task<IActionResult> GetTasksByPriorityForTeamMember(string teamMemberId)
        {
            // Step 1: Fetch tasks assigned to the team member
            var tasks = await _context.Tasks
                .Where(t => t.Assignee == teamMemberId)
                .ToListAsync();

            if (tasks == null || tasks.Count == 0)
            {
                return NotFound("No tasks found for the specified team member.");
            }

            // Step 2: Filter by status "ToDo" and "In-Progress"
            var filteredTasks = tasks
                .Where(t => t.Status != null &&
                       (t.Status.Equals("ToDo", StringComparison.OrdinalIgnoreCase) ||
                        t.Status.Equals("In-Progress", StringComparison.OrdinalIgnoreCase)))
                .ToList();

            if (filteredTasks.Count == 0)
            {
                return NotFound("No tasks with status 'ToDo' or 'In-Progress' found for this team member.");
            }

            // Step 3: Group the filtered tasks by priority
            var groupedTasks = new
            {
                High = filteredTasks
                    .Where(t => t.Priority != null && t.Priority.Equals("High", StringComparison.OrdinalIgnoreCase))
                    .ToList(),
                Medium = filteredTasks
                    .Where(t => t.Priority != null && t.Priority.Equals("Medium", StringComparison.OrdinalIgnoreCase))
                    .ToList(),
                Low = filteredTasks
                    .Where(t => t.Priority != null && t.Priority.Equals("Low", StringComparison.OrdinalIgnoreCase))
                    .ToList()
            };

            return Ok(groupedTasks);
        }

        // GET: api/Task/priority
        [HttpGet("priority")]
        public async Task<IActionResult> GetTasksGroupedByPriority()
        {
            var tasks = await _context.Tasks.ToListAsync();

            var validPriorities = new[] { "high", "medium", "low" };

            var groupedTasks = tasks
                .Where(t => t.Priority != null && validPriorities.Contains(t.Priority.ToLower()))
                .GroupBy(t => t.Priority.ToLower())
                .ToDictionary(g => char.ToUpper(g.Key[0]) + g.Key.Substring(1), g => g.ToList());

            return Ok(groupedTasks);
        }

        // GET: api/Task/project-manager/{userId}/tasks-by-priority
        [HttpGet("project-manager/{userId}/tasks-by-priority")]
        public async Task<IActionResult> GetTasksByProjectManagerGroupedByPriority(string userId)
        {
            var projectIds = await _context.Projects
                .Where(p => p.ProjectManager == userId)
                .Select(p => p.Id)
                .ToListAsync();

            if (projectIds == null || projectIds.Count == 0)
            {
                return NotFound("No projects found for this project manager.");
            }

            var tasks = await _context.Tasks
                .Where(t => projectIds.Contains(t.ProjectId) && !string.IsNullOrEmpty(t.Priority))
                .ToListAsync();

            var grouped = tasks
                .GroupBy(t => t.Priority.ToLower())
                .ToDictionary(
                    g => char.ToUpper(g.Key[0]) + g.Key.Substring(1),
                    g => g.ToList()
                );

            // Ensure keys "High", "Medium", "Low" exist even if empty:
            var result = new Dictionary<string, List<Models.Task>>();
            foreach (var priority in new[] { "High", "Medium", "Low" })
            {
                result[priority] = grouped.ContainsKey(priority) ? grouped[priority] : new List<Models.Task>();
            }

            return Ok(result);
        }

        // GET: api/Task/assignee/{userId}
        [HttpGet("assignee/{userId}")]
        public async Task<IActionResult> GetTasksByAssignee(string userId)
        {
            var tasks = await _context.Tasks
                .Where(t => t.Assignee == userId)
                .ToListAsync();

            if (tasks == null || tasks.Count == 0)
            {
                return NotFound("No tasks assigned to this user.");
            }

            return Ok(tasks);
        }

        // GET: api/Task/project-manager/{userId}/all
        [HttpGet("project-manager/{userId}/all")]
        public async Task<IActionResult> GetAllTasksByProjectManager(string userId)
        {
            var projectIds = await _context.Projects
                .Where(p => p.ProjectManager == userId)
                .Select(p => p.Id)
                .ToListAsync();

            if (projectIds == null || projectIds.Count == 0)
            {
                return NotFound("No projects found for this project manager.");
            }

            var tasks = await _context.Tasks
                .Where(t => projectIds.Contains(t.ProjectId))
                .ToListAsync();

            if (tasks == null || tasks.Count == 0)
            {
                return NotFound("No tasks found for this project manager.");
            }

            return Ok(tasks);
        }
    }
}
