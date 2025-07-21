using Xunit;
using Moq;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using ProjectManagementService.Controllers;
using ProjectManagementService.Data;
using ProjectManagementService.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using ProjectmanagementService.Models;
using Task = System.Threading.Tasks.Task;
using Microsoft.EntityFrameworkCore.InMemory;

namespace ProjectManagementService.UnitTests
{
    public class ClientTests
    {
        private ProjectManagementDbContext GetInMemoryDbContext()
        {
            var options = new DbContextOptionsBuilder<ProjectManagementDbContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .Options;

            var dbContext = new ProjectManagementDbContext(options);
            dbContext.Database.EnsureCreated();
            return dbContext;
        }

        private Mock<ILogger<ClientController>> GetLoggerMock()
        {
            // Set up a mock for ILogger to prevent null reference issues
            return new Mock<ILogger<ClientController>>();
        }

        private async Task AddClientsToContext(ProjectManagementDbContext context)
        {
            context.Clients.AddRange(
                new Client { Id = "1", Name = "Client A", Type = ClientType.Company, Email = "a@example.com", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow, Projects = new List<Project>() },
                new Client { Id = "2", Name = "Client B", Type = ClientType.Individual, Email = "b@example.com", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow, Projects = new List<Project>() },
                new Client { Id = "3", Name = "Client C", Type = ClientType.Government, Email = "c@example.com", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow, Projects = new List<Project>() }
            );
            await context.SaveChangesAsync();
        }

        [Fact]
        public async Task GetClients_ReturnsOkResultWithAllClients()
        {
            // Arrange
            using var dbContext = GetInMemoryDbContext();
            await AddClientsToContext(dbContext);
            var loggerMock = GetLoggerMock();
            var controller = new ClientController(dbContext, loggerMock.Object);

            // Act
            var result = await controller.GetClients();

            // Assert
            var actionResult = Assert.IsType<ActionResult<IEnumerable<Client>>>(result);
            var clients = Assert.IsType<List<Client>>(actionResult.Value);
            Assert.Equal(3, clients.Count);
        }

        [Fact]
        public async Task GetClient_ReturnsOkResultWithExistingClient()
        {
            // Arrange
            using var dbContext = GetInMemoryDbContext();
            await AddClientsToContext(dbContext);
            var loggerMock = GetLoggerMock();
            var controller = new ClientController(dbContext, loggerMock.Object);
            var existingId = "1";

            // Act
            var result = await controller.GetClient(existingId);

            // Assert
            var actionResult = Assert.IsType<ActionResult<Client>>(result);
            var client = Assert.IsType<Client>(actionResult.Value);
            Assert.Equal(existingId, client.Id);
        }

        [Fact]
        public async Task GetClient_ReturnsNotFoundResultWhenClientDoesNotExist()
        {
            // Arrange
            using var dbContext = GetInMemoryDbContext();
            var loggerMock = GetLoggerMock();
            var controller = new ClientController(dbContext, loggerMock.Object);
            var nonExistingId = "4";

            // Act
            var result = await controller.GetClient(nonExistingId);

            // Assert
            // When returning NotFound(), result.Result will be NotFoundResult
            Assert.IsType<NotFoundResult>(result.Result);
        }

        [Fact]
        public async Task CreateClient_ReturnsCreatedAtActionResultWithNewClient()
        {
            // Arrange
            using var dbContext = GetInMemoryDbContext();
            var loggerMock = GetLoggerMock();
            var controller = new ClientController(dbContext, loggerMock.Object);
            // Ensure required fields are set
            var newClient = new Client { Name = "New Client", Type = ClientType.Individual, Email = "new@example.com", Projects = new List<Project>() };

            // Act
            var result = await controller.CreateClient(newClient);

            // Assert
            var createdAtActionResult = Assert.IsType<CreatedAtActionResult>(result.Result);
            Assert.Equal(nameof(controller.GetClient), createdAtActionResult.ActionName);
            Assert.NotNull(createdAtActionResult.Value);
            var createdClient = Assert.IsType<Client>(createdAtActionResult.Value);
            Assert.Equal("New Client", createdClient.Name);
            Assert.NotEqual(Guid.Empty.ToString(), createdClient.Id);
            Assert.NotEqual(default(DateTime), createdClient.CreatedAt);
            Assert.NotEqual(default(DateTime), createdClient.UpdatedAt);
            // Verify client is in DB
            var clientInDb = await dbContext.Clients.FindAsync(createdClient.Id);
            Assert.NotNull(clientInDb);
        }

        [Fact]
        public async Task CreateClient_ReturnsBadRequestForInvalidClientType()
        {
            // Arrange
            using var dbContext = GetInMemoryDbContext();
            var loggerMock = GetLoggerMock();
            var controller = new ClientController(dbContext, loggerMock.Object);

            // Create a client with a Type set to an explicit invalid string
            var invalidClient = new Client { Name = "Invalid Type Client", Type = (ClientType)(-1), Email = "invalidtype@example.com", Projects = new List<Project>() };

            // Act
            var result = await controller.CreateClient(invalidClient);

            // Assert
            Assert.IsType<BadRequestObjectResult>(result.Result);
            var badRequestResult = Assert.IsType<BadRequestObjectResult>(result.Result);
            Assert.Equal("Invalid client type.", badRequestResult.Value);
        }

        [Fact]
        public async Task UpdateClient_ReturnsNoContentResultOnSuccessfulUpdate()
        {
            // Arrange
            using var dbContext = GetInMemoryDbContext();
            await AddClientsToContext(dbContext);
            var loggerMock = GetLoggerMock();
            var controller = new ClientController(dbContext, loggerMock.Object);
            var existingId = "1";
            // Retrieve the client first to ensure all its properties are tracked by EF Core
            var clientToUpdate = await dbContext.Clients.AsNoTracking().FirstOrDefaultAsync(c => c.Id == existingId);
            Assert.NotNull(clientToUpdate); // Ensure the client exists

            // Modify some properties
            clientToUpdate.Name = "Updated Client Name";
            clientToUpdate.Email = "updated@example.com";
            clientToUpdate.Type = ClientType.Company; // Make sure the type is valid

            // Act
            // Pass the modified client object
            var result = await controller.UpdateClient(existingId, clientToUpdate);

            // Assert
            Assert.IsType<NoContentResult>(result);

            // Verify that the client was updated in the database
            var clientInDb = await dbContext.Clients.AsNoTracking().FirstOrDefaultAsync(c => c.Id == existingId);
            Assert.NotNull(clientInDb);
            Assert.Equal("Updated Client Name", clientInDb.Name);
            Assert.Equal("updated@example.com", clientInDb.Email);
            Assert.Equal(ClientType.Company, clientInDb.Type);
            // Check that UpdatedAt is greater than CreatedAt (if CreatedAt is distinct from the update operation)
            // This is tricky with UtcNow in tests, but it should be different unless called instantly.
            // A more robust check might involve capturing initial CreatedAt and comparing.
        }


        [Fact]
        public async Task UpdateClient_ReturnsNotFoundResultWhenClientDoesNotExist()
        {
            // Arrange
            using var dbContext = GetInMemoryDbContext();
            var loggerMock = GetLoggerMock();
            var controller = new ClientController(dbContext, loggerMock.Object);
            var nonExistingId = "4";
            // Create a valid client object to pass, even if the ID doesn't exist in DB
            var updatedClient = new Client { Id = nonExistingId, Name = "Non Existent", Type = ClientType.Individual, Email = "nonexistent@example.com" };

            // Act
            var result = await controller.UpdateClient(nonExistingId, updatedClient);

            // Assert
            Assert.IsType<NotFoundResult>(result);
        }

        [Fact]
        public async Task DeleteClient_ReturnsNoContentResultOnSuccessfulDeletion()
        {
            // Arrange
            using var dbContext = GetInMemoryDbContext();
            await AddClientsToContext(dbContext);
            var loggerMock = GetLoggerMock();
            var controller = new ClientController(dbContext, loggerMock.Object);
            var existingId = "1";

            // Act
            var result = await controller.DeleteClient(existingId);

            // Assert
            Assert.IsType<NoContentResult>(result);

            // Verify that the client was deleted from the database
            var clientInDb = await dbContext.Clients.FindAsync(existingId);
            Assert.Null(clientInDb);
        }

        [Fact]
        public async Task DeleteClient_ReturnsNotFoundResultWhenClientDoesNotExist()
        {
            // Arrange
            using var dbContext = GetInMemoryDbContext();
            var loggerMock = GetLoggerMock();
            var controller = new ClientController(dbContext, loggerMock.Object);
            var nonExistingId = "4";

            // Act
            var result = await controller.DeleteClient(nonExistingId);

            // Assert
            Assert.IsType<NotFoundResult>(result);
        }
    }
}