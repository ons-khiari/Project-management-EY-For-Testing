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
using Task = System.Threading.Tasks.Task;
using ProjectmanagementService.Models;
using ProjectManagementService.Services;

namespace ProjectManagementService.UnitTests
{
    public class DeliverablePhaseTests
    {
        private readonly DbContextOptions<ProjectManagementDbContext> _dbOptions;
        private readonly KafkaProducerService _fakeKafkaProducer;

        public DeliverablePhaseTests()
        {
            _dbOptions = new DbContextOptionsBuilder<ProjectManagementDbContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .Options;
            _fakeKafkaProducer = new FakeKafkaProducerService();
        }

        [Fact]
        public async Task GetDeliverablePhases_ReturnsAllPhases()
        {
            using (var context = new ProjectManagementDbContext(_dbOptions))
            {
                var project = new Project {
                    Id = "P1",
                    Title = "Project 1",
                    ClientId = "C1",
                    CreatedBy = "U1",
                    Description = "desc",
                    ProgressColor = "green",
                    ProjectManager = "U2"
                };
                context.Projects.Add(project);
                context.DeliverablePhases.Add(new DeliverablePhase { Id = "DP1", Title = "Phase 1", ProjectId = "P1", Status = "todo", StartDate = DateTime.UtcNow, EndDate = DateTime.UtcNow.AddDays(1), Color = "red" });
                context.DeliverablePhases.Add(new DeliverablePhase { Id = "DP2", Title = "Phase 2", ProjectId = "P1", Status = "done", StartDate = DateTime.UtcNow, EndDate = DateTime.UtcNow.AddDays(2), Color = "blue" });
                await context.SaveChangesAsync();
                var controller = new DeliverablePhaseController(context, _fakeKafkaProducer);
                var result = await controller.GetDeliverablePhases();
                var okResult = Assert.IsType<ActionResult<IEnumerable<DeliverablePhase>>>(result);
                Assert.Equal(2, okResult.Value.Count());
            }
        }

        [Fact]
        public async Task GetDeliverablePhase_ReturnsPhase_WhenFound()
        {
            using (var context = new ProjectManagementDbContext(_dbOptions))
            {
                var project = new Project {
                    Id = "P1",
                    Title = "Project 1",
                    ClientId = "C1",
                    CreatedBy = "U1",
                    Description = "desc",
                    ProgressColor = "green",
                    ProjectManager = "U2"
                };
                var phase = new DeliverablePhase { Id = "DP1", Title = "Phase 1", ProjectId = "P1", Status = "todo", StartDate = DateTime.UtcNow, EndDate = DateTime.UtcNow.AddDays(1), Color = "red" };
                context.Projects.Add(project);
                context.DeliverablePhases.Add(phase);
                await context.SaveChangesAsync();
                var controller = new DeliverablePhaseController(context, _fakeKafkaProducer);
                var result = await controller.GetDeliverablePhase("DP1");
                var okResult = Assert.IsType<ActionResult<DeliverablePhase>>(result);
                Assert.Equal("DP1", okResult.Value.Id);
            }
        }

        [Fact]
        public async Task GetDeliverablePhase_ReturnsNotFound_WhenNotFound()
        {
            using (var context = new ProjectManagementDbContext(_dbOptions))
            {
                var controller = new DeliverablePhaseController(context, _fakeKafkaProducer);
                var result = await controller.GetDeliverablePhase("DP999");
                Assert.IsType<NotFoundResult>(result.Result);
            }
        }

        [Fact]
        public async Task CreateDeliverablePhase_ReturnsCreated_WhenValid()
        {
            using (var context = new ProjectManagementDbContext(_dbOptions))
            {
                var project = new Project {
                    Id = "P1",
                    Title = "Project 1",
                    ClientId = "C1",
                    CreatedBy = "U1",
                    Description = "desc",
                    ProgressColor = "green",
                    ProjectManager = "U2"
                };
                context.Projects.Add(project);
                await context.SaveChangesAsync();
                var controller = new DeliverablePhaseController(context, _fakeKafkaProducer);
                var phase = new DeliverablePhase { Title = "Phase 1", ProjectId = "P1", Status = "todo", StartDate = DateTime.UtcNow, EndDate = DateTime.UtcNow.AddDays(1), Color = "red" };
                var result = await controller.CreateDeliverablePhase(phase);
                var createdResult = Assert.IsType<CreatedAtActionResult>(result.Result);
                var createdPhase = Assert.IsType<DeliverablePhase>(createdResult.Value);
                Assert.Equal("Phase 1", createdPhase.Title);
            }
        }

        [Fact]
        public async Task CreateDeliverablePhase_ReturnsBadRequest_WhenMissingTitleOrProjectId()
        {
            using (var context = new ProjectManagementDbContext(_dbOptions))
            {
                var controller = new DeliverablePhaseController(context, _fakeKafkaProducer);
                var phase = new DeliverablePhase { Title = "", ProjectId = "", Status = "todo", StartDate = DateTime.UtcNow, EndDate = DateTime.UtcNow.AddDays(1), Color = "red" };
                var result = await controller.CreateDeliverablePhase(phase);
                var badRequest = Assert.IsType<BadRequestObjectResult>(result.Result);
                Assert.Equal("Title and ProjectId are required.", badRequest.Value);
            }
        }

        [Fact]
        public async Task CreateDeliverablePhase_ReturnsNotFound_WhenProjectDoesNotExist()
        {
            using (var context = new ProjectManagementDbContext(_dbOptions))
            {
                var controller = new DeliverablePhaseController(context, _fakeKafkaProducer);
                var phase = new DeliverablePhase { Title = "Phase 1", ProjectId = "P999", Status = "todo", StartDate = DateTime.UtcNow, EndDate = DateTime.UtcNow.AddDays(1), Color = "red" };
                var result = await controller.CreateDeliverablePhase(phase);
                var notFound = Assert.IsType<NotFoundObjectResult>(result.Result);
                Assert.Contains("not found", notFound.Value.ToString().ToLower());
            }
        }

        [Fact]
        public async Task UpdateDeliverablePhase_ReturnsNoContent_WhenValid()
        {
            using (var context = new ProjectManagementDbContext(_dbOptions))
            {
                var project = new Project {
                    Id = "P1",
                    Title = "Project 1",
                    ClientId = "C1",
                    CreatedBy = "U1",
                    Description = "desc",
                    ProgressColor = "green",
                    ProjectManager = "U2"
                };
                var phase = new DeliverablePhase { Id = "DP1", Title = "Phase 1", ProjectId = "P1", Status = "todo", StartDate = DateTime.UtcNow, EndDate = DateTime.UtcNow.AddDays(1), Color = "red" };
                context.Projects.Add(project);
                context.DeliverablePhases.Add(phase);
                await context.SaveChangesAsync();
                var controller = new DeliverablePhaseController(context, _fakeKafkaProducer);
                var updatedPhase = new DeliverablePhase { Id = "DP1", Title = "Updated Phase", ProjectId = "P1", Status = "done", StartDate = DateTime.UtcNow, EndDate = DateTime.UtcNow.AddDays(2), Color = "blue" };
                var result = await controller.UpdateDeliverablePhase("DP1", updatedPhase);
                Assert.IsType<NoContentResult>(result);
            }
        }

        [Fact]
        public async Task UpdateDeliverablePhase_ReturnsNotFound_WhenPhaseNotFound()
        {
            using (var context = new ProjectManagementDbContext(_dbOptions))
            {
                var controller = new DeliverablePhaseController(context, _fakeKafkaProducer);
                var updatedPhase = new DeliverablePhase { Id = "DP999", Title = "Updated Phase", ProjectId = "P1", Status = "done", StartDate = DateTime.UtcNow, EndDate = DateTime.UtcNow.AddDays(2), Color = "blue" };
                var result = await controller.UpdateDeliverablePhase("DP999", updatedPhase);
                Assert.IsType<NotFoundResult>(result);
            }
        }

        [Fact]
        public async Task DeleteDeliverablePhase_ReturnsNoContent_WhenValid()
        {
            using (var context = new ProjectManagementDbContext(_dbOptions))
            {
                var project = new Project {
                    Id = "P1",
                    Title = "Project 1",
                    ClientId = "C1",
                    CreatedBy = "U1",
                    Description = "desc",
                    ProgressColor = "green",
                    ProjectManager = "U2"
                };
                var phase = new DeliverablePhase { Id = "DP1", Title = "Phase 1", ProjectId = "P1", Status = "todo", StartDate = DateTime.UtcNow, EndDate = DateTime.UtcNow.AddDays(1), Color = "red" };
                context.Projects.Add(project);
                context.DeliverablePhases.Add(phase);
                await context.SaveChangesAsync();
                var controller = new DeliverablePhaseController(context, _fakeKafkaProducer);
                var result = await controller.DeleteDeliverablePhase("DP1");
                Assert.IsType<NoContentResult>(result);
            }
        }

        [Fact]
        public async Task DeleteDeliverablePhase_ReturnsNotFound_WhenPhaseNotFound()
        {
            using (var context = new ProjectManagementDbContext(_dbOptions))
            {
                var controller = new DeliverablePhaseController(context, _fakeKafkaProducer);
                var result = await controller.DeleteDeliverablePhase("DP999");
                Assert.IsType<NotFoundResult>(result);
            }
        }

        [Fact]
        public async Task GetPhaseStatsByProjectId_ReturnsStats()
        {
            using (var context = new ProjectManagementDbContext(_dbOptions))
            {
                var project = new Project {
                    Id = "P1",
                    Title = "Project 1",
                    ClientId = "C1",
                    CreatedBy = "U1",
                    Description = "desc",
                    ProgressColor = "green",
                    ProjectManager = "U2"
                };
                context.Projects.Add(project);
                context.DeliverablePhases.Add(new DeliverablePhase { Id = "DP1", Title = "Phase 1", ProjectId = "P1", Status = "done", StartDate = DateTime.UtcNow, EndDate = DateTime.UtcNow.AddDays(1), Color = "red" });
                context.DeliverablePhases.Add(new DeliverablePhase { Id = "DP2", Title = "Phase 2", ProjectId = "P1", Status = "todo", StartDate = DateTime.UtcNow, EndDate = DateTime.UtcNow.AddDays(2), Color = "blue" });
                await context.SaveChangesAsync();
                var controller = new DeliverablePhaseController(context, _fakeKafkaProducer);
                var result = await controller.GetPhaseStatsByProjectId("P1");
                var okResult = Assert.IsType<OkObjectResult>(result.Result);
                dynamic stats = okResult.Value;
                Assert.Equal(2, (int)stats.total);
                Assert.Equal(1, (int)stats.completed);
            }
        }
    }
}