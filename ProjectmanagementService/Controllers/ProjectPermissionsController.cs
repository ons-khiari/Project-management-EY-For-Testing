using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ProjectmanagementService.DTO;
using ProjectmanagementService.Models;
using ProjectManagementService.Data;

namespace ProjectmanagementService.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class PermissionsController : ControllerBase
    {
        private readonly ProjectManagementDbContext _context;

        public PermissionsController(ProjectManagementDbContext context)
        {
            _context = context;
        }

        /// Assigns or updates permissions for a specific user on a given project.
        /// If permissions already exist for the user and project, they will be replaced.
        [HttpPost("assign")]
        public async Task<IActionResult> AssignPermissions([FromBody] AssignPermissionsRequest request)
        {
            // 1. Basic input validation
            if (request == null)
            {
                return BadRequest("Request body cannot be null.");
            }

            if (string.IsNullOrEmpty(request.ProjectId))
            {
                return BadRequest("ProjectId is required.");
            }

            if (string.IsNullOrEmpty(request.UserId))
            {
                return BadRequest("UserId is required.");
            }

            if (request.Permissions == null || !request.Permissions.Any())
            {
                return BadRequest("At least one permission must be provided.");
            }

            // 2. Validate if Project exists in the database
            var projectExists = await _context.Projects.AnyAsync(p => p.Id == request.ProjectId);
            if (!projectExists)
            {
                return NotFound($"Project with ID '{request.ProjectId}' not found.");
            }

            // User existence validation is skipped as the User entity is managed by a separate service.
            // The UserId is treated as an external identifier.

            // 3. Check if the ProjectMemberPermission already exists for this user and project
            var memberPermission = await _context.ProjectMemberPermissions
                .Include(pmp => pmp.Permissions) // Eagerly load existing permissions
                .FirstOrDefaultAsync(pmp => pmp.ProjectId == request.ProjectId && pmp.UserId == request.UserId);

            // 4. Handle existing or new ProjectMemberPermission
            if (memberPermission == null)
            {
                // Create new ProjectMemberPermission if it doesn't exist
                memberPermission = new ProjectMemberPermission
                {
                    ProjectId = request.ProjectId,
                    UserId = request.UserId
                };
                _context.ProjectMemberPermissions.Add(memberPermission);
            }
            else
            {
                // Clear existing permissions to update with new ones
                // This approach ensures that old permissions are removed before new ones are added
                _context.ProjectPermissions.RemoveRange(memberPermission.Permissions);
                memberPermission.Permissions.Clear(); // Clear the in-memory collection as well
            }

            // 5. Add the new permissions, ensuring uniqueness
            foreach (var permissionName in request.Permissions.Distinct())
            {
                memberPermission.Permissions.Add(new ProjectPermission
                {
                    Name = permissionName,
                    // ProjectMemberPermission will be set by EF Core due to the relationship
                    // if memberPermission is newly added, or it's already linked if existing.
                });
            }

            try
            {
                // 6. Save changes to the database
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateException ex)
            {
                // Log the exception (e.g., using a logger)
                Console.Error.WriteLine($"Error saving permissions: {ex.Message}");
                // Provide a more generic error message to the client
                return StatusCode(500, "An error occurred while saving permissions. Please try again.");
            }

            return Ok(new { success = true, message = "Permissions assigned successfully." });
        }

        [HttpGet("by-project-and-user")]
        public async Task<IActionResult> GetPermissionsByProjectAndUser([FromQuery] string projectId, [FromQuery] string userId)
        {
            if (string.IsNullOrEmpty(projectId))
                return BadRequest("ProjectId is required.");
            if (string.IsNullOrEmpty(userId))
                return BadRequest("UserId is required.");

            var memberPermission = await _context.ProjectMemberPermissions
                .Where(pmp => pmp.ProjectId == projectId && pmp.UserId == userId)
                .Include(pmp => pmp.Permissions)
                .FirstOrDefaultAsync();

            if (memberPermission == null)
                return NotFound("No permissions found for the given user and project.");

            var result = new
            {
                ProjectId = memberPermission.ProjectId,
                UserId = memberPermission.UserId,
                Permissions = memberPermission.Permissions.Select(p => p.Name).ToList()
            };

            return Ok(result);
        }

        [HttpGet("by-project/{projectId}")]
        public async Task<IActionResult> GetPermissionsByProject(string projectId)
        {
            if (string.IsNullOrEmpty(projectId))
                return BadRequest("ProjectId is required.");

            var permissions = await _context.ProjectMemberPermissions
                .Where(pmp => pmp.ProjectId == projectId)
                .Include(pmp => pmp.Permissions)
                .Select(pmp => new
                {
                    pmp.UserId,
                    Permissions = pmp.Permissions.Select(p => p.Name).ToList()
                })
                .ToListAsync();

            return Ok(permissions);
        }

        [HttpGet("by-user/{userId}")]
        public async Task<IActionResult> GetPermissionsByUser(string userId)
        {
            if (string.IsNullOrEmpty(userId))
                return BadRequest("UserId is required.");

            var permissions = await _context.ProjectMemberPermissions
                .Where(pmp => pmp.UserId == userId)
                .Include(pmp => pmp.Permissions)
                .Select(pmp => new
                {
                    pmp.ProjectId,
                    Permissions = pmp.Permissions.Select(p => p.Name).ToList()
                })
                .ToListAsync();

            return Ok(permissions);
        }
    }
}