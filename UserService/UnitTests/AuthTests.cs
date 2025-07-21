using Microsoft.Extensions.Options;
using Moq;
using Microsoft.EntityFrameworkCore;
using UserService.Controllers;
using UserService.Models;
using UserService.Services; // Make sure this is included for IJWTService
using Microsoft.AspNetCore.Mvc;
using System.Threading.Tasks;
using Xunit;
using System; // For Guid

namespace UserService.UnitTests
{
    public class AuthControllerTests
    {
        private UserServiceDbContext GetInMemoryDbContext()
        {
            var options = new DbContextOptionsBuilder<UserServiceDbContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .Options;

            var dbContext = new UserServiceDbContext(options);
            return dbContext;
        }

        [Fact]
        public async Task Register_ReturnsOkResult_WhenUserIsNew()
        {
            // Arrange
            var dbContext = GetInMemoryDbContext();
            var mockJwtSettings = new Mock<IOptions<JWTSettings>>();
            mockJwtSettings.Setup(s => s.Value).Returns(new JWTSettings { SecretKey = "test-secret-key", Issuer = "test-issuer", Audience = "test-audience", ExpiryInMinutes = 30 });

            // Mock the interface IJWTService
            var mockJwtService = new Mock<IJWTService>();

            var controller = new AuthController(dbContext, mockJwtService.Object);

            var newUser = new User
            {
                Name = "Noussa",
                Lastname = "Test",
                Email = "nosnos@gmail.com",
                PhoneNumber = "87654321",
                Cin = "87654321",
                Role = UserRole.TeamMember,
                PasswordHash = "12345678",
                Avatar = "default-avatar.png"
            };

            // Act
            var result = await controller.Register(newUser);
            await dbContext.SaveChangesAsync();

            // Assert
            var okResult = Assert.IsType<OkObjectResult>(result);
            var returnedUser = Assert.IsType<User>(okResult.Value);
            Assert.Equal("nosnos@gmail.com", returnedUser.Email);
        }

        [Fact]
        public async Task Login_ReturnsToken_WhenCredentialsAreValid()
        {
            // Arrange
            var dbContext = GetInMemoryDbContext();

            // Create a user and add to DB
            var password = "12345678";
            var user = new User
            {
                Id = Guid.NewGuid().ToString(),
                Name = "Noussa",
                Lastname = "Test",
                Email = "nosnos@gmail.com",
                PhoneNumber = "87654321",
                Cin = "87654321",
                Role = UserRole.TeamMember,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(password),
                Avatar = "default-avatar.png"
            };
            dbContext.Users.Add(user);
            await dbContext.SaveChangesAsync();

            var mockJwtSettings = new Mock<IOptions<JWTSettings>>();
            mockJwtSettings.Setup(s => s.Value).Returns(new JWTSettings { SecretKey = "test-secret-key", Issuer = "test-issuer", Audience = "test-audience", ExpiryInMinutes = 30 });

            // Mock the interface IJWTService
            var mockJwtService = new Mock<IJWTService>();
            // Now you can setup the method, because it's part of an interface
            mockJwtService.Setup(jwt => jwt.GenerateToken(user.Id, user.Role)).Returns("mocked-jwt-token");

            var controller = new AuthController(dbContext, mockJwtService.Object);

            var loginModel = new LoginModel
            {
                Email = user.Email,
                Password = password
            };

            // Act
            var result = await controller.Login(loginModel);

            // Assert
            var okResult = Assert.IsType<OkObjectResult>(result);
            var tokenResponse = Assert.IsType<TokenResponse>(okResult.Value);
            Assert.Equal("mocked-jwt-token", tokenResponse.Token);
        }

        [Fact]
        public async Task Login_ReturnsUnauthorized_WhenUserNotFound()
        {
            // Arrange
            var dbContext = GetInMemoryDbContext();
            var mockJwtSettings = new Mock<IOptions<JWTSettings>>();
            mockJwtSettings.Setup(s => s.Value).Returns(new JWTSettings { SecretKey = "test-secret-key", Issuer = "test-issuer", Audience = "test-audience", ExpiryInMinutes = 30 });

            // Mock the interface IJWTService
            var mockJwtService = new Mock<IJWTService>();

            var controller = new AuthController(dbContext, mockJwtService.Object);

            var loginModel = new LoginModel
            {
                Email = "notfound@example.com",
                Password = "any"
            };

            // Act
            var result = await controller.Login(loginModel);

            // Assert
            Assert.IsType<UnauthorizedObjectResult>(result);
        }
    }
}