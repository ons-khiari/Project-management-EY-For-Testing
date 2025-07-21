using ProjectManagementService.Data;
using ProjectmanagementService.Models;

namespace ProjectmanagementService.Services
{
    public class ActivityLogger
    {
        private readonly ProjectManagementDbContext _context;

        public ActivityLogger(ProjectManagementDbContext context)
        {
            _context = context;
        }

        public async System.Threading.Tasks.Task LogAsync(Guid projectId, string action, string description, string performedBy, string? performedTo = null)
        {
            var activity = new ProjectActivity
            {
                Id = Guid.NewGuid(),
                ProjectId = projectId.ToString(),
                Action = action,
                Description = description,
                PerformedBy = performedBy,
                PerformedTo = performedTo ?? string.Empty,
                Timestamp = DateTime.UtcNow
            };

            _context.ProjectActivities.Add(activity);
            await _context.SaveChangesAsync();
        }
    }
}
