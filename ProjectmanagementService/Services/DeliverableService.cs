using Microsoft.EntityFrameworkCore;
using ProjectmanagementService.Models;
using ProjectManagementService.Data;
using Task = System.Threading.Tasks.Task;

namespace ProjectmanagementService.Services
{
    public class DeliverableService
    {
        private readonly ProjectManagementDbContext _context;

        public DeliverableService(ProjectManagementDbContext context)
        {
            _context = context;
        }

        private async Task UpdateProjectProgressAsync(string projectId)
        {
            var project = await _context.Projects
                .Include(p => p.DeliverablePhases)
                .FirstOrDefaultAsync(p => p.Id == projectId);

            if (project == null || project.DeliverablePhases == null || !project.DeliverablePhases.Any())
                return;

            int totalPhases = project.DeliverablePhases.Count;
            int completedPhases = project.DeliverablePhases.Count(p => p.Status?.ToLower() == "done");

            project.Progress = (int)((double)completedPhases / totalPhases * 100);
            project.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
        }

        public async Task UpdateDeliverableStatusAsync(string deliverableId, string newStatus)
        {
            var deliverable = await _context.Deliverables
                .Include(d => d.DeliverablePhase)
                .Include(d => d.Tasks)
                .FirstOrDefaultAsync(d => d.Id == deliverableId);

            if (deliverable == null)
                throw new Exception("Deliverable not found");

            // Set deliverable status
            deliverable.Status = newStatus;

            // Optional: propagate to tasks
            foreach (var task in deliverable.Tasks)
            {
                task.Status = newStatus;
            }

            await _context.SaveChangesAsync();

            // Recalculate deliverable and phase statuses if needed
            await UpdateTaskStatuses(deliverable);
            await RecalculatePhaseStatus(deliverable.DeliverablePhaseId);
        }

        private async Task UpdateTaskStatuses(Deliverable deliverable)
        {
            var tasks = await _context.Tasks
                .Where(t => t.DeliverableId == deliverable.Id)
                .ToListAsync();

            if (tasks.Count == 0) return;

            var taskStatuses = tasks.Select(t => t.Status?.ToLower()).ToList();

            string newDeliverableStatus;

            if (taskStatuses.All(s => s == "done"))
            {
                newDeliverableStatus = "done";
            }
            else if (taskStatuses.All(s => s == "todo"))
            {
                newDeliverableStatus = "todo";
            }
            else
            {
                newDeliverableStatus = "in-progress";
            }

            if (deliverable.Status != newDeliverableStatus)
            {
                deliverable.Status = newDeliverableStatus;
                await _context.SaveChangesAsync();
            }
        }

        private async Task RecalculatePhaseStatus(string phaseId)
        {
            var deliverables = await _context.Deliverables
                .Where(d => d.DeliverablePhaseId == phaseId)
                .ToListAsync();

            if (deliverables.Count == 0) return; // Exit early if there are no deliverables

            var statuses = deliverables.Select(d => d.Status?.ToLower()).ToList();

            string newStatus;

            // Update phase status based on deliverables' statuses
            if (statuses.All(s => s == "done"))
            {
                newStatus = "done"; // All deliverables are done
            }
            else if (statuses.All(s => s == "todo"))
            {
                newStatus = "todo"; // All deliverables are to do
            }
            else if (statuses.All(s => s == "in-progress"))
            {
                newStatus = "in-progress"; // All deliverables are in progress
            }
            else if (statuses.Contains("done") && statuses.Contains("todo") && !statuses.Contains("in-progress"))
            {
                newStatus = "in-progress"; // If there are done and todo, the phase is "todo"
            }
            else
            {
                newStatus = "in-progress"; // Default to "in progress" for mixed statuses
            }

            // Update the phase status in the database
            var phase = await _context.DeliverablePhases.FindAsync(phaseId);
            if (phase != null)
            {
                phase.Status = newStatus;
                await _context.SaveChangesAsync(); // Save changes to the phase status
                if (!string.IsNullOrEmpty(phase.ProjectId))
                {
                    await UpdateProjectProgressAsync(phase.ProjectId);
                }
            }
        }

        public async Task RecalculateDeliverableStatusAsync(string deliverableId)
        {
            var deliverable = await _context.Deliverables
                .Include(d => d.Tasks)
                .FirstOrDefaultAsync(d => d.Id == deliverableId);

            if (deliverable == null) throw new Exception("Deliverable not found");

            var statuses = deliverable.Tasks.Select(t => t.Status?.ToLower()).ToList();

            string newStatus;
            if (statuses.All(s => s == "done"))
            {
                newStatus = "done";
            }
            else if (statuses.All(s => s == "todo"))
            {
                newStatus = "todo";
            }
            else
            {
                newStatus = "in-progress";
            }

            if (deliverable.Status != newStatus)
            {
                deliverable.Status = newStatus;
                await _context.SaveChangesAsync();
            }

            // Update phase and project
            if (!string.IsNullOrEmpty(deliverable.DeliverablePhaseId))
            {
                await RecalculatePhaseStatus(deliverable.DeliverablePhaseId);
            }
        }
    }
}
