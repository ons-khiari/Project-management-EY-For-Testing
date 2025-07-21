using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ProjectManagementService.Data;
using ProjectmanagementService.Models;
using ProjectManagementService.Models;
using ProjectmanagementService.Services;
using System.Linq;
using ProjectManagementService.Services;
using ProjectmanagementService.DTO;

namespace ProjectManagementService.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class DeliverableController : ControllerBase
    {
        private readonly ProjectManagementDbContext _context;
        private readonly KafkaProducerService _kafkaProducer;
        private readonly DeliverableService _deliverableService;

        public DeliverableController(ProjectManagementDbContext context, DeliverableService deliverableService,KafkaProducerService kafkaProducer)
        {
            _kafkaProducer = kafkaProducer;
            _context = context;
            _deliverableService = deliverableService;
        }

        // GET: api/Deliverable
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Deliverable>>> GetDeliverables()
        {
            return await _context.Deliverables
                .Include(d => d.Project)
                .Include(d => d.DeliverablePhase)
                .Include(d => d.Client)
                .Include(d => d.Tasks)
                .ToListAsync();
        }

        // GET: api/Deliverable/{id}
        [HttpGet("{id}")]
        public async Task<ActionResult<Deliverable>> GetDeliverable(string id)
        {
            var deliverable = await _context.Deliverables
                .Include(d => d.Project)
                .Include(d => d.DeliverablePhase)
                .Include(d => d.Client)
                .Include(d => d.Tasks)
                .FirstOrDefaultAsync(d => d.Id == id);

            if (deliverable == null)
                return NotFound();

            return deliverable;
        }

        // POST: api/Deliverable
        [HttpPost]
        public async Task<ActionResult<Deliverable>> CreateDeliverable(Deliverable deliverable)
        {
            var project = await _context.Projects.FindAsync(deliverable.ProjectId);
            if (project == null)
                return NotFound($"Project with ID '{deliverable.ProjectId}' not found.");

            var phase = await _context.DeliverablePhases.FindAsync(deliverable.DeliverablePhaseId);
            if (phase == null)
                return NotFound($"DeliverablePhase with ID '{deliverable.DeliverablePhaseId}' not found.");

            Client? client = null;
            if (!string.IsNullOrEmpty(deliverable.ClientId))
            {
                client = await _context.Clients.FindAsync(deliverable.ClientId);
                if (client == null)
                    return NotFound($"Client with ID '{deliverable.ClientId}' not found.");
            }

            deliverable.Id = string.IsNullOrWhiteSpace(deliverable.Id) ? Guid.NewGuid().ToString() : deliverable.Id;
            deliverable.Project = project;
            deliverable.DeliverablePhase = phase;
            deliverable.Client = client;

            _context.Deliverables.Add(deliverable);
            await _context.SaveChangesAsync();

            // Notify assignees
            foreach (var userId in deliverable.Assignee)
            {
                var notification = new UserNotificationMessage
                {
                    EventType = "DeliverableCreated",
                    UserId = userId,
                    ProjectId = deliverable.ProjectId,
                    Message = $"You have been assigned a new deliverable: \"{deliverable.Title}\"."
                };
                await _kafkaProducer.ProduceNotificationAsync(notification);
            }

            return CreatedAtAction(nameof(GetDeliverable), new { id = deliverable.Id }, deliverable);
        }

        // PUT: api/Deliverable/{id}
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateDeliverable(string id, Deliverable updatedDeliverable)
        {
            if (id != updatedDeliverable.Id)
                return BadRequest("Mismatched ID.");

            var existing = await _context.Deliverables.FindAsync(id);
            if (existing == null)
                return NotFound();

            existing.Title = updatedDeliverable.Title;
            existing.Description = updatedDeliverable.Description;
            existing.Link = updatedDeliverable.Link;
            existing.Priority = updatedDeliverable.Priority;
            existing.PriorityNumber = updatedDeliverable.PriorityNumber;
            existing.Date = updatedDeliverable.Date;
            existing.Status = updatedDeliverable.Status;
            existing.Assignee = updatedDeliverable.Assignee;
            existing.Tasks = updatedDeliverable.Tasks;

            if (existing.ProjectId != updatedDeliverable.ProjectId)
            {
                var project = await _context.Projects.FindAsync(updatedDeliverable.ProjectId);
                if (project == null)
                    return NotFound($"Project with ID '{updatedDeliverable.ProjectId}' not found.");
                existing.ProjectId = updatedDeliverable.ProjectId;
                existing.Project = project;
            }

            if (existing.DeliverablePhaseId != updatedDeliverable.DeliverablePhaseId)
            {
                var phase = await _context.DeliverablePhases.FindAsync(updatedDeliverable.DeliverablePhaseId);
                if (phase == null)
                    return NotFound($"DeliverablePhase with ID '{updatedDeliverable.DeliverablePhaseId}' not found.");
                existing.DeliverablePhaseId = updatedDeliverable.DeliverablePhaseId;
                existing.DeliverablePhase = phase;
            }

            if (existing.ClientId != updatedDeliverable.ClientId)
            {
                if (!string.IsNullOrEmpty(updatedDeliverable.ClientId))
                {
                    var client = await _context.Clients.FindAsync(updatedDeliverable.ClientId);
                    if (client == null)
                        return NotFound($"Client with ID '{updatedDeliverable.ClientId}' not found.");
                    existing.ClientId = updatedDeliverable.ClientId;
                    existing.Client = client;
                }
                else
                {
                    existing.ClientId = null;
                    existing.Client = null;
                }
            }

            await _context.SaveChangesAsync();

            // Notify assignees
            foreach (var userId in updatedDeliverable.Assignee)
            {
                var notification = new UserNotificationMessage
                {
                    EventType = "DeliverableUpdated",
                    UserId = userId,
                    ProjectId = updatedDeliverable.ProjectId,
                    Message = $"Deliverable \"{updatedDeliverable.Title}\" has been updated."
                };
                await _kafkaProducer.ProduceNotificationAsync(notification);
            }

            return NoContent();
        }

        // DELETE: api/Deliverable/{id}
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteDeliverable(string id)
        {
            var deliverable = await _context.Deliverables.FindAsync(id);
            if (deliverable == null)
                return NotFound();

            string title = deliverable.Title;
            string projectId = deliverable.ProjectId;
            var assignees = deliverable.Assignee;

            _context.Deliverables.Remove(deliverable);
            await _context.SaveChangesAsync();

            // Notify assignees
            foreach (var userId in assignees)
            {
                var notification = new UserNotificationMessage
                {
                    EventType = "DeliverableDeleted",
                    UserId = userId,
                    ProjectId = projectId,
                    Message = $"Deliverable \"{title}\" assigned to you has been deleted."
                };
                await _kafkaProducer.ProduceNotificationAsync(notification);
            }

            return NoContent();
        }

        // PUT: api/Deliverable/{id}/status
        [HttpPut("{id}/status")]
        public async Task<IActionResult> UpdateStatus(string id, [FromBody] string newStatus)
        {
            try
            {
                // Call the service to update the deliverable status and phase status
                await _deliverableService.UpdateDeliverableStatusAsync(id, newStatus);
                return Ok(new { message = "Status updated successfully" });
            }
            catch (Exception ex)
            {
                return BadRequest($"Error: {ex.Message}");
            }
        }

        // GET: api/Deliverable/by-user/{userId}
        [HttpGet("by-user/{userId}")]
        public async Task<ActionResult<IEnumerable<Deliverable>>> GetDeliverablesByUserId(string userId)
        {
            var deliverables = await _context.Deliverables
                .Include(d => d.Project)
                .Include(d => d.DeliverablePhase)
                .Include(d => d.Client)
                .Include(d => d.Tasks)
                .ToListAsync(); // Fetch all and then filter in memory

            var userDeliverables = deliverables
                .Where(d => d.Assignee != null && d.Assignee.Contains(userId)) // Use Contains only in memory
                .ToList();

            if (!userDeliverables.Any())
            {
                return NotFound($"No deliverables found for user with ID '{userId}'.");
            }

            return Ok(userDeliverables);
        }


        // GET: api/Deliverable/managed-by/{userId}
        [HttpGet("managed-by/{userId}")]
        public async Task<ActionResult<IEnumerable<Deliverable>>> GetDeliverablesManagedBy(string userId)
        {
            var projectsManaged = await _context.Projects
                .Where(p => p.ProjectManager == userId)
                .Select(p => p.Id)
                .ToListAsync();

            if (!projectsManaged.Any())
                return NotFound("No projects found for this project manager.");

            var deliverables = await _context.Deliverables
                .Include(d => d.Project)
                .Include(d => d.DeliverablePhase)
                .Include(d => d.Client)
                .Include(d => d.Tasks)
                .Where(d => projectsManaged.Contains(d.ProjectId))
                .ToListAsync();

            return deliverables;
        }

        // GET: api/Deliverable/{id}/task-summary
        [HttpGet("{id}/task-summary")]
        public async Task<ActionResult<object>> GetTaskSummary(string id)
        {
            var deliverable = await _context.Deliverables
                .Include(d => d.Tasks)
                .FirstOrDefaultAsync(d => d.Id == id);

            if (deliverable == null)
                return NotFound($"Deliverable with ID '{id}' not found.");

            var allTasksCount = deliverable.Tasks?.Count ?? 0;
            var doneTasksCount = deliverable.Tasks?.Count(t => t.Status.ToLower() == "done") ?? 0;

            return Ok(new
            {
                DeliverableId = id,
                AllTasks = allTasksCount,
                DoneTasks = doneTasksCount
            });
        }

        [HttpPost("task-summaries")]
        public async Task<IActionResult> GetTaskSummaries([FromBody] List<string> deliverableIds)
        {
            var summaries = await _context.Deliverables
                .Where(d => deliverableIds.Contains(d.Id))
                .Select(d => new
                {
                    d.Id,
                    DoneTasks = d.Tasks.Count(t => t.Status == "Done"),
                    AllTasks = d.Tasks.Count()
                })
                .ToDictionaryAsync(d => d.Id, d => new { d.DoneTasks, d.AllTasks });

            return Ok(summaries);
        }
    }
}
