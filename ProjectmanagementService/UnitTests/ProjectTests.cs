using Xunit;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Mvc;
using ProjectManagementService.Controllers;
using ProjectManagementService.Data;
using ProjectManagementService.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using ProjectmanagementService.Models;
using Task = System.Threading.Tasks.Task;
using ProjectmanagementService.Services;
using ProjectManagementService.Services;

namespace ProjectManagementService.UnitTests
{
   public class ProjectTests
   {
        private readonly DbContextOptions<ProjectManagementDbContext> _dbOptions;
        private readonly KafkaProducerService _fakeKafkaProducer;

        public ProjectTests()
        {
            _dbOptions = new DbContextOptionsBuilder<ProjectManagementDbContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .Options;
            _fakeKafkaProducer = new FakeKafkaProducerService();
        }

        private Project CreateValidProject(string id = "P1") => new Project {
            Id = id,
            Title = "Project 1",
            ClientId = "C1",
            CreatedBy = "U1",
            Description = "desc",
            ProgressColor = "green",
            ProjectManager = "U2",
            Members = new List<string>(),
            StartDate = DateTime.UtcNow,
            EndDate = DateTime.UtcNow.AddDays(30)
        };

        [Fact]
        public async Task GetProjects_ReturnsAllProjects()
        {
            using (var context = new ProjectManagementDbContext(_dbOptions))
            {
                context.Clients.Add(new Client { Id = "C1", Name = "Client 1", Email = "client1@email.com" });
                context.Projects.Add(CreateValidProject("P1"));
                context.Projects.Add(CreateValidProject("P2"));
                await context.SaveChangesAsync();
                var controller = new ProjectController(context, new NoopActivityLogger(), _fakeKafkaProducer, null);
                var result = await controller.GetProjects();
                var okResult = Assert.IsType<ActionResult<IEnumerable<Project>>>(result);
                Assert.Equal(2, okResult.Value.Count());
            }
        }

        [Fact]
        public async Task GetProject_ReturnsProject_WhenFound()
        {
            using (var context = new ProjectManagementDbContext(_dbOptions))
            {
                context.Clients.Add(new Client { Id = "C1", Name = "Client 1", Email = "client1@email.com" });
                context.Projects.Add(CreateValidProject("P1"));
                await context.SaveChangesAsync();
                var controller = new ProjectController(context, new NoopActivityLogger(), _fakeKafkaProducer, null);
                var result = await controller.GetProject("P1");
                var okResult = Assert.IsType<ActionResult<Project>>(result);
                Assert.Equal("P1", okResult.Value.Id);
            }
        }

        [Fact]
        public async Task GetProject_ReturnsNotFound_WhenNotFound()
        {
            using (var context = new ProjectManagementDbContext(_dbOptions))
            {
                var controller = new ProjectController(context, new NoopActivityLogger(), _fakeKafkaProducer, null);
                var result = await controller.GetProject("P999");
                Assert.IsType<NotFoundResult>(result.Result);
            }
        }

        [Fact]
        public async Task UpdateProject_ReturnsNoContent_WhenValid()
        {
            using (var context = new ProjectManagementDbContext(_dbOptions))
            {
                context.Clients.Add(new Client { Id = "C1", Name = "Client 1", Email = "client1@email.com" });
                context.Projects.Add(CreateValidProject("P1"));
                await context.SaveChangesAsync();
                var controller = new ProjectController(context, new NoopActivityLogger(), _fakeKafkaProducer, null);
                var updatedProject = CreateValidProject("P1");
                updatedProject.Title = "Updated Project";
                var result = await controller.UpdateProject("P1", updatedProject);
                Assert.IsType<NoContentResult>(result);
            }
        }

        [Fact]
        public async Task UpdateProject_ReturnsNotFound_WhenProjectNotFound()
        {
            using (var context = new ProjectManagementDbContext(_dbOptions))
            {
                var controller = new ProjectController(context, new NoopActivityLogger(), _fakeKafkaProducer, null);
                var updatedProject = CreateValidProject("P999");
                var result = await controller.UpdateProject("P999", updatedProject);
                Assert.IsType<NotFoundResult>(result);
            }
        }

        [Fact]
        public async Task DeleteProject_ReturnsNoContent_WhenValid()
        {
            using (var context = new ProjectManagementDbContext(_dbOptions))
            {
                context.Clients.Add(new Client { Id = "C1", Name = "Client 1", Email = "client1@email.com" });
                context.Projects.Add(CreateValidProject("P1"));
                await context.SaveChangesAsync();
                var controller = new ProjectController(context, new NoopActivityLogger(), _fakeKafkaProducer, null);
                var result = await controller.DeleteProject("P1");
                Assert.IsType<NoContentResult>(result);
            }
        }

        [Fact]
        public async Task DeleteProject_ReturnsNotFound_WhenProjectNotFound()
        {
            using (var context = new ProjectManagementDbContext(_dbOptions))
            {
                var controller = new ProjectController(context, new NoopActivityLogger(), _fakeKafkaProducer, null);
                var result = await controller.DeleteProject("P999");
                Assert.IsType<NotFoundResult>(result);
            }
        }
    }

    public class NoopActivityLogger : ActivityLogger
    {
        public NoopActivityLogger() : base(null) { }
        public Task LogAsync(Guid projectId, string action, string description, string userId) => Task.CompletedTask;
    }
}