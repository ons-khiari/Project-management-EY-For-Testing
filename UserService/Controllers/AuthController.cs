using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using UserService.Models;
using UserService.Services;

namespace UserService.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AuthController : ControllerBase
    {
        private readonly UserServiceDbContext _context;
        private readonly IJWTService _jwtService;

        public AuthController(UserServiceDbContext context, IJWTService jwtService)
        {
            _context = context;
            _jwtService = jwtService;
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginModel model)
        {
            // Find the user by email
            var user = await _context.Users
                                      .FirstOrDefaultAsync(u => u.Email == model.Email);

            if (user == null || !BCrypt.Net.BCrypt.Verify(model.Password, user.PasswordHash))
            {
                return Unauthorized("Invalid login attempt");
            }

            // Generate the token
            var token = _jwtService.GenerateToken(user.Id, user.Role);

            // Return the token in response
            return Ok(new TokenResponse { Token = token });
        }


        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] User user)
        {
            // Check if the user already exists by Email
            if (await _context.Users.AnyAsync(u => u.Email == user.Email))
            {
                return BadRequest("User already exists");
            }

            // Hash the password before saving
            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(user.PasswordHash);

            // Save user to the database
            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            return Ok(user);  // Return the user object (excluding password) for confirmation
        }

    }
}
