using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ProjectManagementService.Data;
using ProjectmanagementService.Models;
using ProjectmanagementService.Services;
using ProjectmanagementService.DTO;
using ProjectManagementService.Services;
using System.Text.Json;
using System.Diagnostics;

namespace ProjectManagementService.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ProjectController : ControllerBase
    {
        private readonly ProjectManagementDbContext _context;
        private readonly ActivityLogger _logger;
        private readonly KafkaProducerService _kafkaProducer;
        private readonly GroqService _groq;

        public ProjectController(ProjectManagementDbContext context, ActivityLogger logger, KafkaProducerService kafkaProducer, GroqService groq)
        {
            _kafkaProducer = kafkaProducer;
            _context = context;
            _logger = logger;
            _groq = groq;
        }

        [HttpPost("suggest-phase")]
        public async Task<IActionResult> SuggestPhase([FromBody] PhaseSuggestionDto dto)
        {
            var project = await _context.Projects.FindAsync(dto.ProjectId);
            if (project == null)
                return NotFound("Project not found");

            var prompt = $"""
                Based on this project:
                Title: {project.Title}
                Description: {project.Description}
                Project Start Date: {project.StartDate:yyyy-MM-dd}
                Project End Date: {project.EndDate:yyyy-MM-dd}

                Suggest one relevant project phase that fits within the project timeline.

                Return a JSON object with the following properties:
                - title: string
                - startDate: string (ISO 8601 date, within project timeline)
                - endDate: string (ISO 8601 date, within project timeline)
                - status: always "To Do"
                - color: pick randomly one of: "blue", "orange", "yellow", "purple", "green"

                Return ONLY the JSON object. No explanation. No markdown.
                """;

            var response = await _groq.GenerateAIResponse(prompt);

            try
            {
                var phase = JsonSerializer.Deserialize<PhaseSuggestion>(response, new JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true
                });

                // Force random color assignment if Groq gave none or always "blue"
                string[] availableColors = ["blue", "orange", "yellow", "purple", "green"];
                var random = new Random();

                if (string.IsNullOrWhiteSpace(phase.Color) || phase.Color.ToLower() == "blue")
                {
                    phase.Color = availableColors[random.Next(availableColors.Length)];
                }

                // Make sure status is always "To Do"
                phase.Status = "To Do";

                return Ok(phase);
            }
            catch (JsonException)
            {
                return BadRequest("Failed to parse Groq response as JSON");
            }
        }

        [HttpPost("import-excel")]
        public async Task<IActionResult> ImportExcel(IFormFile file, [FromServices] ExcelService excelService)
        {
            if (file == null || file.Length == 0)
                return BadRequest("No file uploaded");

            using var stream = file.OpenReadStream();

            var projectDto = await excelService.ParseExcelToProjectDto(stream);

            var project = new Project
            {
                Id = projectDto.Id,
                Title = projectDto.Title,
                Description = projectDto.Description,
                Progress = projectDto.Progress,
                ProgressColor = projectDto.ProgressColor,
                StartDate = projectDto.StartDate,
                EndDate = projectDto.EndDate,
                CreatedBy = projectDto.CreatedBy,
                CreatedAt = projectDto.CreatedAt,
                UpdatedAt = projectDto.UpdatedAt,
                ProjectManager = projectDto.ProjectManager,
                Members = projectDto.Members,
                ClientId = projectDto.ClientId,
                DeliverablePhases = projectDto.DeliverablePhases?.Select(dp => new DeliverablePhase
                {
                    Id = dp.Id,
                    Title = dp.Title,
                    StartDate = dp.StartDate,
                    EndDate = dp.EndDate,
                    Color = dp.Color,
                    Status = dp.Status,
                    ProjectId = dp.ProjectId,
                    Deliverables = dp.Deliverables?.Select(d => new Deliverable
                    {
                        Id = d.Id,
                        Title = d.Title,
                        Description = d.Description,
                        Link = d.Link,
                        Priority = d.Priority,
                        PriorityNumber = d.PriorityNumber,
                        Date = d.Date,
                        Status = d.Status,
                        ProjectId = d.ProjectId,
                        DeliverablePhaseId = d.DeliverablePhaseId,
                        ClientId = d.ClientId,
                        Assignee = d.Assignee,
                        Tasks = d.Tasks?.Select(t => new ProjectmanagementService.Models.Task
                        {
                            Id = t.Id,
                            Text = t.Text,
                            Priority = t.Priority,
                            Date = t.Date,
                            Status = t.Status,
                            Assignee = t.Assignee,
                            ProjectId = t.ProjectId,
                            DeliverableId = t.DeliverableId,
                            DeliverablePhaseId = t.DeliverablePhaseId,
                            SubTasks = t.SubTasks?.Select(st => new SubTask
                            {
                                Id = st.Id,
                                Description = st.Description,
                                CreatedAt = st.CreatedAt,
                                UpdatedAt = st.UpdatedAt,
                                IsCompleted = st.IsCompleted,
                                Assignee = st.Assignee,
                                TaskId = st.TaskId
                            }).ToList(),
                            Comments = t.Comments?.Select(c => new Comment
                            {
                                Id = c.Id,
                                Description = c.Description,
                                CreatedAt = c.CreatedAt,
                                UpdatedAt = c.UpdatedAt,
                                Assignee = c.Assignee,
                                TaskId = c.TaskId
                            }).ToList()
                        }).ToList()
                    }).ToList()
                }).ToList(),
                Activities = new List<ProjectActivity>() // or map from DTO if needed
            };

            await _context.Projects.AddAsync(project);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Project imported successfully!" });
        }

        [HttpGet("export-excel/{projectId}")]
        public IActionResult ExportProjectToExcel([FromRoute] string projectId, [FromServices] ExcelService excelService)
        {
            var project = _context.Projects
                .Include(p => p.DeliverablePhases)
                    .ThenInclude(phase => phase.Deliverables)
                        .ThenInclude(d => d.Tasks)
                            .ThenInclude(t => t.SubTasks)
                .Include(p => p.DeliverablePhases)
                    .ThenInclude(phase => phase.Deliverables)
                        .ThenInclude(d => d.Tasks)
                            .ThenInclude(t => t.Comments)
                .AsSplitQuery()
                .FirstOrDefault(p => p.Id == projectId);

            if (project == null)
                return NotFound("Project not found");

            Console.WriteLine($"Fetched Project: {project.Title}");

            var projectDto = new ProjectDto
            {
                Id = project.Id,
                Title = project.Title,
                Description = project.Description,
                Progress = project.Progress,
                ProgressColor = project.ProgressColor,
                StartDate = project.StartDate,
                EndDate = project.EndDate,
                CreatedBy = project.CreatedBy,
                CreatedAt = project.CreatedAt ?? DateTime.UtcNow,
                UpdatedAt = project.UpdatedAt ?? DateTime.UtcNow,
                ProjectManager = project.ProjectManager,
                Members = project.Members ?? new List<string>(),
                ClientId = project.ClientId,
                DeliverablePhases = project.DeliverablePhases?.Select(dp => new DeliverablePhaseDto
                {
                    Id = dp.Id,
                    Title = dp.Title,
                    StartDate = dp.StartDate,
                    EndDate = dp.EndDate,
                    Color = dp.Color,
                    Status = dp.Status,
                    ProjectId = dp.ProjectId,
                    Deliverables = dp.Deliverables?.Select(d => new DeliverableDto
                    {
                        Id = d.Id,
                        Title = d.Title,
                        Description = d.Description,
                        Link = d.Link,
                        Priority = d.Priority,
                        PriorityNumber = d.PriorityNumber,
                        Date = d.Date,
                        Status = d.Status,
                        ProjectId = d.ProjectId,
                        DeliverablePhaseId = d.DeliverablePhaseId,
                        ClientId = d.ClientId,
                        Assignee = d.Assignee ?? new List<string>(),
                        Tasks = d.Tasks?.Select(t => new TaskDto
                        {
                            Id = t.Id,
                            Text = t.Text,
                            Priority = t.Priority,
                            Date = t.Date,
                            Status = t.Status,
                            Assignee = t.Assignee,
                            ProjectId = t.ProjectId,
                            DeliverableId = t.DeliverableId,
                            DeliverablePhaseId = t.DeliverablePhaseId,
                            SubTasks = t.SubTasks?.Select(st => new SubTaskDto
                            {
                                Id = st.Id,
                                Description = st.Description,
                                CreatedAt = st.CreatedAt,
                                UpdatedAt = st.UpdatedAt ?? DateTime.UtcNow,
                                IsCompleted = st.IsCompleted,
                                Assignee = st.Assignee,
                                TaskId = st.TaskId
                            }).ToList() ?? new List<SubTaskDto>(),
                            Comments = t.Comments?.Select(c => new CommentDto
                            {
                                Id = c.Id,
                                Description = c.Description,
                                CreatedAt = c.CreatedAt,
                                UpdatedAt = c.UpdatedAt ?? DateTime.UtcNow,
                                Assignee = c.Assignee,
                                TaskId = c.TaskId
                            }).ToList() ?? new List<CommentDto>()
                        }).ToList() ?? new List<TaskDto>()
                    }).ToList() ?? new List<DeliverableDto>()
                }).ToList() ?? new List<DeliverablePhaseDto>()
            };

            var bytes = excelService.ExportProjectToExcel(projectDto);

            var memoryStream = new MemoryStream(bytes);
            memoryStream.Position = 0;

            var fileName = $"project_{projectId}.xlsx";
            return File(memoryStream, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", fileName);
        }

        // GET: api/project
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Project>>> GetProjects()
        {
            return await _context.Projects
                .Include(p => p.Client)
                .Include(p => p.DeliverablePhases)
                .ToListAsync();
        }

        // GET: api/project/{id}
        [HttpGet("{id}")]
        public async Task<ActionResult<Project>> GetProject(string id)
        {
            var project = await _context.Projects
                .Include(p => p.Client)
                .Include(p => p.DeliverablePhases)
                .FirstOrDefaultAsync(p => p.Id == id);

            if (project == null)
                return NotFound();

            return project;
        }

        // POST: api/project
        [HttpPost]
        public async Task<ActionResult<Project>> CreateProject(Project project)
        {
            if (project == null)
                return BadRequest("Project data is missing.");

            if (string.IsNullOrWhiteSpace(project.Title) || string.IsNullOrWhiteSpace(project.ClientId))
                return BadRequest("Project title and client ID are required.");

            try
            {
                var client = await _context.Clients.FindAsync(project.ClientId);
                if (client == null)
                    return NotFound($"Client with ID '{project.ClientId}' does not exist.");

                project.Id = string.IsNullOrWhiteSpace(project.Id) ? Guid.NewGuid().ToString() : project.Id;
                project.CreatedAt ??= DateTime.UtcNow;
                project.UpdatedAt ??= DateTime.UtcNow;
                project.Client = client;

                _context.Projects.Add(project);

                // Notify each member and assign permission
                if (project.Members != null)
                {
                    foreach (var userId in project.Members)
                    {
                        var memberPermission = new ProjectMemberPermission
                        {
                            ProjectId = project.Id,
                            UserId = userId,
                            Permissions = new List<ProjectPermission>
                    {
                        new ProjectPermission { Name = "view" }
                    }
                        };

                        _context.ProjectMemberPermissions.Add(memberPermission);

                        var notification = new UserNotificationMessage
                        {
                            EventType = "UserAssignedToProject",
                            UserId = userId,
                            ProjectId = project.Id,
                            Message = $"You have been assigned to the project: {project.Title}"
                        };

                        await _kafkaProducer.ProduceNotificationAsync(notification);
                    }
                }

                //Notify the project manager if defined
                if (!string.IsNullOrEmpty(project.ProjectManager))
                {
                    var notificationForManager = new UserNotificationMessage
                    {
                        EventType = "ProjectManagerAssigned",
                        UserId = project.ProjectManager,
                        ProjectId = project.Id,
                        Message = $"You are assigned as the manager for the project: {project.Title}"
                    };

                    await _kafkaProducer.ProduceNotificationAsync(notificationForManager);
                }

                await _context.SaveChangesAsync();

                await _logger.LogAsync(
                    Guid.Parse(project.Id),
                    "Project Created",
                    $"Project '{project.Title}' created by {project.CreatedBy}.",
                    project.CreatedBy);

                return CreatedAtAction(nameof(GetProject), new { id = project.Id }, project);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"An error occurred while creating the project: {ex.Message}");
            }
        }

        // PUT: api/project/{id}
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateProject(string id, Project updatedProject)
        {
            if (id != updatedProject.Id)
                return BadRequest();

            var existing = await _context.Projects.FindAsync(id);
            if (existing == null)
                return NotFound();

            // Update properties
            existing.Title = updatedProject.Title;
            existing.Description = updatedProject.Description;
            existing.Progress = updatedProject.Progress;
            existing.ProgressColor = updatedProject.ProgressColor;
            existing.StartDate = updatedProject.StartDate;
            existing.EndDate = updatedProject.EndDate;
            existing.UpdatedAt = DateTime.UtcNow;
            existing.ProjectManager = updatedProject.ProjectManager;
            existing.Members = updatedProject.Members;
            existing.ClientId = updatedProject.ClientId;

            await _context.SaveChangesAsync();

            // Notify team members
            if (updatedProject.Members != null)
            {
                foreach (var userId in updatedProject.Members)
                {
                    var notification = new UserNotificationMessage
                    {
                        EventType = "ProjectUpdated",
                        UserId = userId,
                        ProjectId = updatedProject.Id,
                        Message = $"Project '{updatedProject.Title}' has been updated. Please review the changes."
                    };

                    await _kafkaProducer.ProduceNotificationAsync(notification);
                }
            }

            // Notify project manager (if defined)
            if (!string.IsNullOrEmpty(updatedProject.ProjectManager))
            {
                var managerNotification = new UserNotificationMessage
                {
                    EventType = "ProjectUpdatedForManager",
                    UserId = updatedProject.ProjectManager,
                    ProjectId = updatedProject.Id,
                    Message = $"You are managing the project '{updatedProject.Title}', which has just been updated."
                };

                await _kafkaProducer.ProduceNotificationAsync(managerNotification);
            }

            return NoContent();
        }

        // DELETE: api/project/{id}
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteProject(string id)
        {
            var project = await _context.Projects.FindAsync(id);
            if (project == null)
                return NotFound();

            var notifications = new List<UserNotificationMessage>();

            // Notify each project member
            foreach (var userId in project.Members)
            {
                notifications.Add(new UserNotificationMessage
                {
                    UserId = userId,
                    ProjectId = project.Id,
                    EventType = "ProjectDeleted",
                    Message = $"The project '{project.Title}' you were part of has been deleted."
                });
            }

            // Notify project manager if not already notified
            if (!project.Members.Contains(project.ProjectManager))
            {
                notifications.Add(new UserNotificationMessage
                {
                    UserId = project.ProjectManager,
                    ProjectId = project.Id,
                    EventType = "ProjectDeleted",
                    Message = $"The project '{project.Title}' you were managing has been deleted."
                });
            }

            // Send all notifications
            foreach (var notification in notifications)
            {
                await _kafkaProducer.ProduceNotificationAsync(notification);
            }

            _context.Projects.Remove(project);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        // Get projects where the given user is a member
        // GET: api/project/user/{userId}
        [HttpGet("user/{userId}")]
        public async Task<ActionResult<IEnumerable<Project>>> GetProjectsByUserId(string userId)
        {
            var projects = await _context.Projects
                .Include(p => p.Client)
                .Include(p => p.DeliverablePhases)
                .ToListAsync(); // Load all projects into memory

            var userProjects = projects.Where(p => p.Members.Contains(userId)).ToList();

            return userProjects;
        }
    }
}
