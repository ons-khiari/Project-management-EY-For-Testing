using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using UserService.DTO;
using UserService.Models;
using UserService.Services;

namespace UserService.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class UserController : ControllerBase
    {
        private readonly UserServiceDbContext _context;

        public UserController(UserServiceDbContext context)
        {
            _context = context;
        }

        // GET: api/user
        [HttpGet]
        public async Task<IActionResult> GetUsers()
        {
            var users = await _context.Users.ToListAsync();
            return Ok(users);
        }

        // GET: api/user/{id}
        [HttpGet("{id}")]
        public async Task<IActionResult> GetUser(string id)
        {
            var user = await _context.Users.FindAsync(id);
            if (user == null)
            {
                return NotFound("User not found");
            }
            return Ok(user);
        }

        // PATCH: api/user/update/{id}
        [HttpPatch("update/{id}")]
        public async Task<IActionResult> UpdateUserRole(string id, [FromBody] UpdateUserRoleRequest updatedUser)
        {
            if (updatedUser == null || string.IsNullOrEmpty(updatedUser.Role))
            {
                return BadRequest("Role is required.");
            }

            var user = await _context.Users.FindAsync(id);
            if (user == null)
            {
                return NotFound("User not found");
            }

            // Parse the string role to the UserRole enum
            if (!Enum.TryParse<UserRole>(updatedUser.Role, true, out var parsedRole))
            {
                return BadRequest("Invalid role specified.");
            }

            // Update the role
            user.Role = parsedRole;

            _context.Users.Update(user);
            await _context.SaveChangesAsync();

            return Ok(user);
        }


        // DELETE: api/user/delete/{id}
        [HttpDelete("delete/{id}")]
        public async Task<IActionResult> DeleteUser(string id)
        {
            var user = await _context.Users.FindAsync(id);
            if (user == null)
            {
                return NotFound("User not found");
            }

            _context.Users.Remove(user);
            await _context.SaveChangesAsync();

            return Ok("User deleted successfully");
        }

        // GET: api/user/team-members
        [HttpGet("team-members")]
        public async Task<IActionResult> GetTeamMembers()
        {
            var teamMembers = await _context.Users
                .Where(u => u.Role == UserRole.TeamMember)
                .ToListAsync();

            return Ok(teamMembers);
        }

    }
}
