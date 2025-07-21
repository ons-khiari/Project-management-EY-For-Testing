using UserService.Models;

namespace UserService.Services
{
    public interface IJWTService
    {
        string GenerateToken(string userId, UserRole role);
    }
}