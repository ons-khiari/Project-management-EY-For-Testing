using Xunit;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ProjectManagementService.Data;
using ProjectmanagementService.Models;
using ProjectManagementService.Services;
using ProjectmanagementService.DTO;
using System;
using System.Collections.Generic;
using System.Linq;
using Task = System.Threading.Tasks.Task;
using ProjectManagementService.Controllers;

namespace ProjectManagementService.UnitTests
{
    public class FakeKafkaProducerService : KafkaProducerService {
        public FakeKafkaProducerService() : base() { }
        public override Task ProduceNotificationAsync(UserNotificationMessage notification) => Task.CompletedTask;
    }

    public class CommentTests
    {
        private readonly DbContextOptions<ProjectManagementDbContext> _dbOptions;
        private readonly KafkaProducerService _fakeKafkaProducer;

        public CommentTests()
        {
            _dbOptions = new DbContextOptionsBuilder<ProjectManagementDbContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .Options;
            _fakeKafkaProducer = new FakeKafkaProducerService();
        }

        [Fact]
        public async Task GetComments_ReturnsAllComments()
        {
            using (var context = new ProjectManagementDbContext(_dbOptions))
            {
                context.Comments.Add(new Comment { Id = "1", Description = "Test1", TaskId = "T1", Assignee = "U1" });
                context.Comments.Add(new Comment { Id = "2", Description = "Test2", TaskId = "T2", Assignee = "U2" });
                context.SaveChanges();
                var controller = new CommentController(context, _fakeKafkaProducer);
                var result = await controller.GetComments();
                var okResult = Assert.IsType<ActionResult<IEnumerable<Comment>>>(result);
                Assert.Equal(2, okResult.Value.Count());
            }
        }

        [Fact]
        public async Task GetComment_ReturnsComment_WhenFound()
        {
            using (var context = new ProjectManagementDbContext(_dbOptions))
            {
                var comment = new Comment { Id = "1", Description = "Test", TaskId = "T1", Assignee = "U1" };
                context.Comments.Add(comment);
                context.SaveChanges();
                var controller = new CommentController(context, _fakeKafkaProducer);
                var result = await controller.GetComment("1");
                var okResult = Assert.IsType<ActionResult<Comment>>(result);
                Assert.Equal("1", okResult.Value.Id);
            }
        }

        [Fact]
        public async Task GetComment_ReturnsNotFound_WhenNotFound()
        {
            using (var context = new ProjectManagementDbContext(_dbOptions))
            {
                var controller = new CommentController(context, _fakeKafkaProducer);
                var result = await controller.GetComment("999");
                Assert.IsType<NotFoundResult>(result.Result);
            }
        }

        [Fact]
        public async Task GetCommentsByTaskId_ReturnsCommentsForTask()
        {
            using (var context = new ProjectManagementDbContext(_dbOptions))
            {
                context.Comments.Add(new Comment { Id = "1", Description = "Test1", TaskId = "T1", Assignee = "U1" });
                context.Comments.Add(new Comment { Id = "2", Description = "Test2", TaskId = "T1", Assignee = "U2" });
                context.Comments.Add(new Comment { Id = "3", Description = "Test3", TaskId = "T2", Assignee = "U3" });
                context.SaveChanges();
                var controller = new CommentController(context, _fakeKafkaProducer);
                var result = await controller.GetCommentsByTaskId("T1");
                var okResult = Assert.IsType<ActionResult<IEnumerable<Comment>>>(result);
                Assert.Equal(2, okResult.Value.Count());
            }
        }

        [Fact]
        public async Task CreateComment_ReturnsCreated_WhenTaskExists()
        {
            using (var context = new ProjectManagementDbContext(_dbOptions))
            {
                var task = new ProjectmanagementService.Models.Task { Id = "T1", Text = "Task1", Assignee = "U1", ProjectId = "P1", Priority = "Normal", Status = "Open" };
                context.Tasks.Add(task);
                context.SaveChanges();
                var controller = new CommentController(context, _fakeKafkaProducer);
                var comment = new Comment { Description = "Test", TaskId = "T1", Assignee = "U1" };
                var result = await controller.CreateComment(comment);
                var createdResult = Assert.IsType<CreatedAtActionResult>(result.Result);
                var createdComment = Assert.IsType<Comment>(createdResult.Value);
                Assert.Equal("Test", createdComment.Description);
            }
        }

        [Fact]
        public async Task CreateComment_ReturnsBadRequest_WhenTaskDoesNotExist()
        {
            using (var context = new ProjectManagementDbContext(_dbOptions))
            {
                var controller = new CommentController(context, _fakeKafkaProducer);
                var comment = new Comment { Description = "Test", TaskId = "T999", Assignee = "U1" };
                var result = await controller.CreateComment(comment);
                var badRequest = Assert.IsType<BadRequestObjectResult>(result.Result);
                Assert.Equal("Task does not exist.", badRequest.Value);
            }
        }

        [Fact]
        public async Task UpdateComment_ReturnsNoContent_WhenValid()
        {
            using (var context = new ProjectManagementDbContext(_dbOptions))
            {
                var task = new ProjectmanagementService.Models.Task { Id = "T1", Text = "Task1", Assignee = "U1", ProjectId = "P1", Priority = "Normal", Status = "Open" };
                var comment = new Comment { Id = "C1", Description = "Old", TaskId = "T1", Assignee = "U1" };
                context.Tasks.Add(task);
                context.Comments.Add(comment);
                context.SaveChanges();
                var controller = new CommentController(context, _fakeKafkaProducer);
                var updatedComment = new Comment { Id = "C1", Description = "Updated", TaskId = "T1", Assignee = "U1" };
                var result = await controller.UpdateComment("C1", updatedComment);
                Assert.IsType<NoContentResult>(result);
            }
        }

        [Fact]
        public async Task UpdateComment_ReturnsNotFound_WhenCommentNotFound()
        {
            using (var context = new ProjectManagementDbContext(_dbOptions))
            {
                var task = new ProjectmanagementService.Models.Task { Id = "T1", Text = "Task1", Assignee = "U1", ProjectId = "P1", Priority = "Normal", Status = "Open" };
                context.Tasks.Add(task);
                context.SaveChanges();
                var controller = new CommentController(context, _fakeKafkaProducer);
                var updatedComment = new Comment { Id = "C999", Description = "Updated", TaskId = "T1", Assignee = "U1" };
                var result = await controller.UpdateComment("C999", updatedComment);
                Assert.IsType<NotFoundResult>(result);
            }
        }

        [Fact]
        public async Task DeleteComment_ReturnsNoContent_WhenValid()
        {
            using (var context = new ProjectManagementDbContext(_dbOptions))
            {
                var task = new ProjectmanagementService.Models.Task { Id = "T1", Text = "Task1", Assignee = "U1", ProjectId = "P1", Priority = "Normal", Status = "Open" };
                var comment = new Comment { Id = "C1", Description = "ToDelete", TaskId = "T1", Assignee = "U1" };
                context.Tasks.Add(task);
                context.Comments.Add(comment);
                context.SaveChanges();
                var controller = new CommentController(context, _fakeKafkaProducer);
                var result = await controller.DeleteComment("C1");
                Assert.IsType<NoContentResult>(result);
            }
        }

        [Fact]
        public async Task DeleteComment_ReturnsNotFound_WhenCommentNotFound()
        {
            using (var context = new ProjectManagementDbContext(_dbOptions))
            {
                var controller = new CommentController(context, _fakeKafkaProducer);
                var result = await controller.DeleteComment("C999");
                Assert.IsType<NotFoundResult>(result);
            }
        }
    }
}