using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ProjectManagementService.Data;
using ProjectmanagementService.Models;
using Task = System.Threading.Tasks.Task;
using ProjectmanagementService.DTO;
using ProjectManagementService.Services;

namespace ProjectManagementService.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class DeliverablePhaseController : ControllerBase
    {
        private readonly ProjectManagementDbContext _context;
        private readonly KafkaProducerService _kafkaProducer;

        public DeliverablePhaseController(ProjectManagementDbContext context, KafkaProducerService kafkaProducer)
        {
            _context = context;
            _kafkaProducer = kafkaProducer;
        }

        private async Task UpdateProjectProgressAsync(string projectId)
        {
            var project = await _context.Projects
                .Include(p => p.DeliverablePhases)
                .FirstOrDefaultAsync(p => p.Id == projectId);

            if (project == null || project.DeliverablePhases == null || !project.DeliverablePhases.Any())
                return;

            int totalPhases = project.DeliverablePhases.Count;
            int completedPhases = project.DeliverablePhases.Count(p => p.Status.ToLower() == "done");

            project.Progress = (int)((double)completedPhases / totalPhases * 100);
            project.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
        }

        // GET: api/DeliverablePhase
        [HttpGet]
        public async Task<ActionResult<IEnumerable<DeliverablePhase>>> GetDeliverablePhases()
        {
            return await _context.DeliverablePhases
                .Include(dp => dp.Deliverables)
                .Include(dp => dp.Project)
                .ToListAsync();
        }

        // GET: api/DeliverablePhase/{id}
        [HttpGet("{id}")]
        public async Task<ActionResult<DeliverablePhase>> GetDeliverablePhase(string id)
        {
            var phase = await _context.DeliverablePhases
                .Include(dp => dp.Deliverables)
                .Include(dp => dp.Project)
                .FirstOrDefaultAsync(dp => dp.Id == id);

            if (phase == null)
                return NotFound();

            return phase;
        }

        // POST: api/DeliverablePhase
        [HttpPost]
        public async Task<ActionResult<DeliverablePhase>> CreateDeliverablePhase(DeliverablePhase phase)
        {
            if (string.IsNullOrWhiteSpace(phase.Title) || string.IsNullOrWhiteSpace(phase.ProjectId))
                return BadRequest("Title and ProjectId are required.");

            var project = await _context.Projects.FindAsync(phase.ProjectId);
            if (project == null)
                return NotFound($"Project with ID '{phase.ProjectId}' not found.");

            phase.Id = string.IsNullOrWhiteSpace(phase.Id) ? Guid.NewGuid().ToString() : phase.Id;
            phase.Project = project;

            _context.DeliverablePhases.Add(phase);
            await _context.SaveChangesAsync();
            await UpdateProjectProgressAsync(phase.ProjectId);

            // Notify team members
            if (project.Members != null)
            {
                foreach (var userId in project.Members)
                {
                    var notification = new UserNotificationMessage
                    {
                        EventType = "DeliverablePhaseCreated",
                        UserId = userId,
                        ProjectId = project.Id,
                        Message = $"A new phase \"{phase.Title}\" has been added to the project \"{project.Title}\"."
                    };

                    await _kafkaProducer.ProduceNotificationAsync(notification);
                }
            }

            // Notify project manager
            if (!string.IsNullOrEmpty(project.ProjectManager))
            {
                var managerNotification = new UserNotificationMessage
                {
                    EventType = "DeliverablePhaseCreatedManager",
                    UserId = project.ProjectManager,
                    ProjectId = project.Id,
                    Message = $"As manager, you should know a new phase \"{phase.Title}\" was added to your project \"{project.Title}\"."
                };

                await _kafkaProducer.ProduceNotificationAsync(managerNotification);
            }

            return CreatedAtAction(nameof(GetDeliverablePhase), new { id = phase.Id }, phase);
        }

        // PUT: api/DeliverablePhase/{id}
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateDeliverablePhase(string id, DeliverablePhase updatedPhase)
        {
            if (id != updatedPhase.Id)
                return BadRequest("Mismatched ID");

            var existing = await _context.DeliverablePhases.FindAsync(id);
            if (existing == null)
                return NotFound();

            existing.Title = updatedPhase.Title;
            existing.StartDate = updatedPhase.StartDate;
            existing.EndDate = updatedPhase.EndDate;
            existing.Color = updatedPhase.Color;
            existing.Status = updatedPhase.Status;
            existing.ProjectId = updatedPhase.ProjectId;

            await _context.SaveChangesAsync();
            await UpdateProjectProgressAsync(existing.ProjectId);

            // Send notification to all users in the related project
            var project = await _context.Projects.FindAsync(existing.ProjectId);
            if (project != null)
            {
                // Notify team members
                if (project.Members != null)
                {
                    foreach (var userId in project.Members)
                    {
                        var notification = new UserNotificationMessage
                        {
                            EventType = "DeliverablePhaseUpdated",
                            UserId = userId,
                            ProjectId = project.Id,
                            Message = $"The phase \"{existing.Title}\" in project \"{project.Title}\" has been updated."
                        };

                        await _kafkaProducer.ProduceNotificationAsync(notification);
                    }
                }

                // Notify project manager
                if (!string.IsNullOrEmpty(project.ProjectManager))
                {
                    var managerNotification = new UserNotificationMessage
                    {
                        EventType = "DeliverablePhaseUpdatedManager",
                        UserId = project.ProjectManager,
                        ProjectId = project.Id,
                        Message = $"A phase \"{existing.Title}\" in your project \"{project.Title}\" has been updated."
                    };

                    await _kafkaProducer.ProduceNotificationAsync(managerNotification);
                }
            }

            return NoContent();
        }

        // DELETE: api/DeliverablePhase/{id}
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteDeliverablePhase(string id)
        {
            var phase = await _context.DeliverablePhases.FindAsync(id);
            if (phase == null)
                return NotFound();

            var project = await _context.Projects.FindAsync(phase.ProjectId);
            if (project == null)
                return NotFound($"Project with ID '{phase.ProjectId}' not found.");

            string phaseTitle = phase.Title; // Save before deletion

            _context.DeliverablePhases.Remove(phase);
            await _context.SaveChangesAsync();
            await UpdateProjectProgressAsync(phase.ProjectId);

            // Notify all members
            if (project.Members != null)
            {
                foreach (var userId in project.Members)
                {
                    var notification = new UserNotificationMessage
                    {
                        EventType = "DeliverablePhaseDeleted",
                        UserId = userId,
                        ProjectId = project.Id,
                        Message = $"The phase \"{phaseTitle}\" in project \"{project.Title}\" has been deleted."
                    };

                    await _kafkaProducer.ProduceNotificationAsync(notification);
                }
            }

            // Notify project manager
            if (!string.IsNullOrEmpty(project.ProjectManager))
            {
                var managerNotification = new UserNotificationMessage
                {
                    EventType = "DeliverablePhaseDeletedManager",
                    UserId = project.ProjectManager,
                    ProjectId = project.Id,
                    Message = $"The phase \"{phaseTitle}\" in your project \"{project.Title}\" has been deleted."
                };

                await _kafkaProducer.ProduceNotificationAsync(managerNotification);
            }

            return NoContent();
        }

        // GET: api/DeliverablePhase/Stats/{projectId}
        [HttpGet("Stats/{projectId}")]
        public async Task<ActionResult<object>> GetPhaseStatsByProjectId(string projectId)
        {
            var phases = await _context.DeliverablePhases
                .Where(p => p.ProjectId == projectId)
                .ToListAsync();

            if (phases == null || phases.Count == 0)
                return NotFound("No deliverable phases found for this project.");

            int total = phases.Count;
            int completed = phases.Count(p => p.Status.ToLower() == "done");

            return Ok(new { total, completed });
        }

        [HttpGet("ByProject/{projectId}")]
        public async Task<ActionResult<IEnumerable<DeliverablePhase>>> GetPhasesByProjectId(string projectId)
        {
            var phases = await _context.DeliverablePhases
                .Where(p => p.ProjectId == projectId)
                .Include(p => p.Deliverables)
                .ToListAsync();

            var result = phases.Select(p => new
            {
                p.Id,
                p.Title,
                p.StartDate,
                p.EndDate,
                p.Color,
                p.Status,
                p.ProjectId,
                deliverableCount = p.Deliverables.Count,
                completedDeliverables = p.Deliverables.Count(d => d.Status.ToLower() == "done")
            });

            return Ok(result);
        }

    }
}
