using Xunit;
using Moq;
using Microsoft.EntityFrameworkCore;
using UserService.Controllers;
using UserService.Models;
using Microsoft.AspNetCore.Mvc;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using UserService.DTO;
using System;

namespace UserService.UnitTests
{
    public class UserServiceTests
    {
        private UserServiceDbContext GetInMemoryDbContext()
        {
            var options = new DbContextOptionsBuilder<UserServiceDbContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .Options;

            var dbContext = new UserServiceDbContext(options);
            dbContext.Database.EnsureCreated(); // Ensure the database is created
            return dbContext;
        }

        private async Task AddUsersToContext(UserServiceDbContext context)
        {
            context.Users.AddRange(
                new User { Id = "1", Name = "Alice", Email = "alice@example.com", Role = UserRole.TeamMember, Avatar = "avatar1.png", Cin = "cin1", Lastname = "A", PhoneNumber = "123", PasswordHash = "hash1" },
                new User { Id = "2", Name = "Bob", Email = "bob@example.com", Role = UserRole.Admin, Avatar = "avatar2.png", Cin = "cin2", Lastname = "B", PhoneNumber = "456", PasswordHash = "hash2" },
                new User { Id = "3", Name = "Charlie", Email = "charlie@example.com", Role = UserRole.ProjectManager, Avatar = "avatar3.png", Cin = "cin3", Lastname = "C", PhoneNumber = "789", PasswordHash = "hash3" }
            );
            await context.SaveChangesAsync();
        }

        [Fact]
        public async Task GetUsers_ReturnsOkResultWithAllUsers()
        {
            // Arrange
            using var dbContext = GetInMemoryDbContext();
            await AddUsersToContext(dbContext);
            var controller = new UserController(dbContext);

            // Act
            var result = await controller.GetUsers();

            // Assert
            var okResult = Assert.IsType<OkObjectResult>(result);
            var users = Assert.IsType<List<User>>(okResult.Value);
            Assert.Equal(3, users.Count);
        }

        [Fact]
        public async Task GetUser_ReturnsOkResultWithExistingUser()
        {
            // Arrange
            using var dbContext = GetInMemoryDbContext();
            await AddUsersToContext(dbContext);
            var controller = new UserController(dbContext);
            var existingId = "1";

            // Act
            var result = await controller.GetUser(existingId);

            // Assert
            var okResult = Assert.IsType<OkObjectResult>(result);
            var user = Assert.IsType<User>(okResult.Value);
            Assert.Equal(existingId, user.Id);
        }

        [Fact]
        public async Task GetUser_ReturnsNotFoundResultWhenUserDoesNotExist()
        {
            // Arrange
            using var dbContext = GetInMemoryDbContext();
            var controller = new UserController(dbContext);
            var nonExistingId = "4";

            // Act
            var result = await controller.GetUser(nonExistingId);

            // Assert
            var notFoundResult = Assert.IsType<NotFoundObjectResult>(result);
            Assert.Equal("User not found", notFoundResult.Value);
        }

        [Fact]
        public async Task UpdateUserRole_ReturnsOkResultWithUpdatedUser()
        {
            // Arrange
            using var dbContext = GetInMemoryDbContext();
            await AddUsersToContext(dbContext);
            var controller = new UserController(dbContext);
            var existingId = "1";
            var updatedRoleRequest = new UpdateUserRoleRequest { Role = "Admin" };

            // Act
            var result = await controller.UpdateUserRole(existingId, updatedRoleRequest);

            // Assert
            var okResult = Assert.IsType<OkObjectResult>(result);
            var updatedUser = Assert.IsType<User>(okResult.Value);
            Assert.Equal(UserRole.Admin, updatedUser.Role);

            // Verify the update in the database
            var userInDb = await dbContext.Users.FindAsync(existingId);
            Assert.Equal(UserRole.Admin, userInDb.Role);
        }

        [Fact]
        public async Task UpdateUserRole_ReturnsBadRequestWhenRoleIsMissing()
        {
            // Arrange
            using var dbContext = GetInMemoryDbContext();
            var controller = new UserController(dbContext);
            var existingId = "1";
            var updatedRoleRequest = new UpdateUserRoleRequest { Role = null };

            // Act
            var result = await controller.UpdateUserRole(existingId, updatedRoleRequest);

            // Assert
            Assert.IsType<BadRequestObjectResult>(result);
            var badRequestResult = Assert.IsType<BadRequestObjectResult>(result);
            Assert.Equal("Role is required.", badRequestResult.Value);
        }

        [Fact]
        public async Task UpdateUserRole_ReturnsNotFoundWhenUserDoesNotExist()
        {
            // Arrange
            using var dbContext = GetInMemoryDbContext();
            var controller = new UserController(dbContext);
            var nonExistingId = "4";
            var updatedRoleRequest = new UpdateUserRoleRequest { Role = "Admin" };

            // Act
            var result = await controller.UpdateUserRole(nonExistingId, updatedRoleRequest);

            // Assert
            var notFoundResult = Assert.IsType<NotFoundObjectResult>(result);
            Assert.Equal("User not found", notFoundResult.Value);
        }

        [Fact]
        public async Task UpdateUserRole_ReturnsBadRequestWhenRoleIsInvalid()
        {
            // Arrange
            using var dbContext = GetInMemoryDbContext();
            await AddUsersToContext(dbContext);
            var controller = new UserController(dbContext);
            var existingId = "1";
            var updatedRoleRequest = new UpdateUserRoleRequest { Role = "InvalidRole" };

            // Act
            var result = await controller.UpdateUserRole(existingId, updatedRoleRequest);

            // Assert
            var badRequestResult = Assert.IsType<BadRequestObjectResult>(result);
            Assert.Equal("Invalid role specified.", badRequestResult.Value);
        }

        [Fact]
        public async Task DeleteUser_ReturnsOkResultWhenUserIsDeleted()
        {
            // Arrange
            using var dbContext = GetInMemoryDbContext();
            await AddUsersToContext(dbContext);
            var controller = new UserController(dbContext);
            var existingId = "1";

            // Act
            var result = await controller.DeleteUser(existingId);

            // Assert
            var okResult = Assert.IsType<OkObjectResult>(result);
            Assert.Equal("User deleted successfully", okResult.Value);

            // Verify the user is deleted from the database
            var userInDb = await dbContext.Users.FindAsync(existingId);
            Assert.Null(userInDb);
        }

        [Fact]
        public async Task DeleteUser_ReturnsNotFoundWhenUserDoesNotExist()
        {
            // Arrange
            using var dbContext = GetInMemoryDbContext();
            var controller = new UserController(dbContext);
            var nonExistingId = "4";

            // Act
            var result = await controller.DeleteUser(nonExistingId);

            // Assert
            var notFoundResult = Assert.IsType<NotFoundObjectResult>(result);
            Assert.Equal("User not found", notFoundResult.Value);
        }
    }
}