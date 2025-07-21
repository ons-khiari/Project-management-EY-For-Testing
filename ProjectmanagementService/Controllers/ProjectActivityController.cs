using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ProjectManagementService.Data;
using ProjectmanagementService.Models;

namespace ProjectmanagementService.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ProjectActivityController : ControllerBase
    {
        private readonly ProjectManagementDbContext _context;

        public ProjectActivityController(ProjectManagementDbContext context)
        {
            _context = context;
        }

        // GET: api/ProjectActivity/{projectId}  
        [HttpGet("{projectId}")]
        public async Task<IActionResult> GetActivities(string projectId)
        {
            if (!Guid.TryParse(projectId, out var parsedProjectId))
            {
                return BadRequest("Invalid projectId format.");
            }

            var activities = await _context.ProjectActivities
                .Where(a => a.ProjectId == parsedProjectId.ToString())
                .OrderByDescending(a => a.Timestamp)
                .ToListAsync();

            return Ok(activities);
        }

        // POST: api/ProjectActivity  
        [HttpPost]
        public async Task<IActionResult> CreateActivity([FromBody] ProjectActivity activity)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            activity.Id = Guid.NewGuid();
            activity.Timestamp = DateTime.UtcNow;

            _context.ProjectActivities.Add(activity);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetActivities), new { projectId = activity.ProjectId }, activity);
        }
    }
}
