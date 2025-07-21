using ClosedXML.Excel;
using System.Globalization;
using OfficeOpenXml;
using ProjectmanagementService.DTO;
using System.ComponentModel;

namespace ProjectmanagementService.Services
{
    public class ExcelService
    {
        public async Task<ProjectDto> ParseExcelToProjectDto(Stream stream)
        {
            ExcelPackage.LicenseContext = OfficeOpenXml.LicenseContext.NonCommercial;
            using var package = new ExcelPackage(stream);
            var worksheet = package.Workbook.Worksheets[0];

            var project = new ProjectDto();
            var phasesDict = new Dictionary<string, DeliverablePhaseDto>();
            var deliverablesDict = new Dictionary<string, DeliverableDto>();
            var tasksDict = new Dictionary<string, TaskDto>();

            for (int row = 2; row <= worksheet.Dimension.End.Row; row++)
            {
                string Get(string colName) => worksheet.Cells[row, worksheet.Cells[1, 1, 1, worksheet.Dimension.End.Column].First(c => c.Text == colName).Start.Column].Text;

                // Parse only once for static project info
                if (row == 2)
                {
                    project.Id = Get("Project ID");
                    project.Title = Get("Project Title");
                    project.Description = Get("Project Description");
                    project.Progress = int.Parse(Get("Progress"));
                    project.ProgressColor = Get("Progress Color");
                    project.StartDate = DateTime.Parse(Get("Project Start Date")).ToUniversalTime();
                    project.EndDate = DateTime.Parse(Get("Project End Date")).ToUniversalTime();
                    project.CreatedBy = Get("Created By");
                    project.CreatedAt = DateTime.Parse(Get("Created At")).ToUniversalTime();
                    project.UpdatedAt = DateTime.Parse(Get("Updated At")).ToUniversalTime();
                    project.ProjectManager = Get("Project Manager");
                    project.Members = new List<string> { Get("Members") };
                    project.ClientId = Get("Client ID");
                    project.DeliverablePhases = new List<DeliverablePhaseDto>();
                }

                // Phase
                var phaseId = Get("Phase ID");
                if (!phasesDict.ContainsKey(phaseId))
                {
                    var phase = new DeliverablePhaseDto
                    {
                        Id = phaseId,
                        Title = Get("Phase Title"),
                        StartDate = DateTime.Parse(Get("Phase Start Date")).ToUniversalTime(),
                        EndDate = DateTime.Parse(Get("Phase End Date")).ToUniversalTime(),
                        Color = Get("Phase Color"),
                        Status = Get("Phase Status"),
                        ProjectId = project.Id,
                        Deliverables = new List<DeliverableDto>()
                    };
                    phasesDict[phaseId] = phase;
                }

                // Deliverable
                var deliverableId = Get("Deliverable ID");
                if (!deliverablesDict.ContainsKey(deliverableId))
                {
                    var deliverable = new DeliverableDto
                    {
                        Id = deliverableId,
                        Title = Get("Deliverable Title"),
                        Description = Get("Deliverable Description"),
                        Link = Get("Deliverable Link"),
                        Priority = Get("Deliverable Priority"),
                        PriorityNumber = int.Parse(Get("Deliverable Priority Number")),
                        Date = DateTime.Parse(Get("Deliverable Date")).ToUniversalTime(),
                        Status = Get("Deliverable Status"),
                        ProjectId = project.Id,
                        DeliverablePhaseId = phaseId,
                        ClientId = Get("Client ID"),
                        Assignee = new List<string> { Get("Deliverable Assignees") },
                        Tasks = new List<TaskDto>()
                    };
                    deliverablesDict[deliverableId] = deliverable;
                    phasesDict[phaseId].Deliverables.Add(deliverable);
                }

                // Task
                var taskId = Get("Task ID");
                if (!tasksDict.ContainsKey(taskId))
                {
                    var task = new TaskDto
                    {
                        Id = taskId,
                        Text = Get("Task Text"),
                        Priority = Get("Task Priority"),
                        Date = DateTime.Parse(Get("Task Date")).ToUniversalTime(),
                        Status = Get("Task Status"),
                        Assignee = Get("Task Assignee"),
                        ProjectId = project.Id,
                        DeliverableId = deliverableId,
                        DeliverablePhaseId = phaseId,
                        SubTasks = new List<SubTaskDto>(),
                        Comments = new List<CommentDto>()
                    };
                    tasksDict[taskId] = task;
                    deliverablesDict[deliverableId].Tasks.Add(task);
                }

                var completedValue = Get("SubTask Completed");

                // SubTask
                tasksDict[taskId].SubTasks.Add(new SubTaskDto
                {
                    Id = Guid.NewGuid().ToString(),
                    Description = Get("SubTask Description"),
                    CreatedAt = DateTime.Parse(Get("SubTask Created At")).ToUniversalTime(),
                    UpdatedAt = DateTime.Parse(Get("SubTask Updated At")).ToUniversalTime(),
                    
                    IsCompleted = completedValue == "1" || completedValue.Equals("true", StringComparison.OrdinalIgnoreCase),
                    Assignee = Get("SubTask Assignee"),
                    TaskId = taskId
                });

                // Comment
                tasksDict[taskId].Comments.Add(new CommentDto
                {
                    Id = Guid.NewGuid().ToString(),
                    Description = Get("Comment Description"),
                    CreatedAt = DateTime.Parse(Get("Comment Created At")).ToUniversalTime(),
                    UpdatedAt = DateTime.Parse(Get("Comment Updated At")).ToUniversalTime(),
                    Assignee = Get("Comment Assignee"),
                    TaskId = taskId
                });
            }

            project.DeliverablePhases.AddRange(phasesDict.Values);
            return project;
        }

        public byte[] ExportProjectToExcel(ProjectDto project)
        {
            using var workbook = new XLWorkbook();
            var worksheet = workbook.Worksheets.Add("Project");

            var headers = new[]
            {
                "Project ID", "Project Title", "Project Description", "Progress", "Progress Color",
                "Project Start Date", "Project End Date", "Created By", "Created At", "Updated At", "Project Manager", "Members", "Client ID",
                "Phase ID", "Phase Title", "Phase Start Date", "Phase End Date", "Phase Color", "Phase Status",
                "Deliverable ID", "Deliverable Title", "Deliverable Description", "Deliverable Link", "Deliverable Priority", "Deliverable Priority Number",
                "Deliverable Date", "Deliverable Status", "Deliverable Assignees",
                "Task ID", "Task Text", "Task Priority", "Task Date", "Task Status", "Task Assignee",
                "SubTask Description", "SubTask Completed", "SubTask Assignee", "SubTask Created At", "SubTask Updated At",
                "Comment Description", "Comment Assignee", "Comment Created At", "Comment Updated At"
            };

            for (int i = 0; i < headers.Length; i++)
                worksheet.Cell(1, i + 1).Value = headers[i];

            int row = 2;

            foreach (var phase in project.DeliverablePhases ?? [])
            {
                foreach (var deliverable in phase.Deliverables ?? [])
                {
                    if (deliverable.Tasks == null || deliverable.Tasks.Count == 0)
                    {
                        // No tasks → write one row with project, phase, and deliverable info only
                        int col = 1;

                        worksheet.Cell(row, col++).Value = project.Id;
                        worksheet.Cell(row, col++).Value = project.Title;
                        worksheet.Cell(row, col++).Value = project.Description;
                        worksheet.Cell(row, col++).Value = project.Progress;
                        worksheet.Cell(row, col++).Value = project.ProgressColor;
                        worksheet.Cell(row, col++).Value = project.StartDate.ToString("u");
                        worksheet.Cell(row, col++).Value = project.EndDate.ToString("u");
                        worksheet.Cell(row, col++).Value = project.CreatedBy;
                        worksheet.Cell(row, col++).Value = project.CreatedAt.ToString("u");
                        worksheet.Cell(row, col++).Value = project.UpdatedAt.ToString("u");
                        worksheet.Cell(row, col++).Value = project.ProjectManager;
                        worksheet.Cell(row, col++).Value = string.Join(", ", project.Members);
                        worksheet.Cell(row, col++).Value = project.ClientId;

                        worksheet.Cell(row, col++).Value = phase.Id;
                        worksheet.Cell(row, col++).Value = phase.Title;
                        worksheet.Cell(row, col++).Value = phase.StartDate.ToString("u");
                        worksheet.Cell(row, col++).Value = phase.EndDate.ToString("u");
                        worksheet.Cell(row, col++).Value = phase.Color;
                        worksheet.Cell(row, col++).Value = phase.Status;

                        worksheet.Cell(row, col++).Value = deliverable.Id;
                        worksheet.Cell(row, col++).Value = deliverable.Title;
                        worksheet.Cell(row, col++).Value = deliverable.Description;
                        worksheet.Cell(row, col++).Value = deliverable.Link;
                        worksheet.Cell(row, col++).Value = deliverable.Priority;
                        worksheet.Cell(row, col++).Value = deliverable.PriorityNumber;
                        worksheet.Cell(row, col++).Value = deliverable.Date.ToString("u");
                        worksheet.Cell(row, col++).Value = deliverable.Status;
                        worksheet.Cell(row, col++).Value = string.Join(", ", deliverable.Assignee);

                        // Task/Subtask/Comment columns remain blank
                        row++;
                        continue;
                    }

                    // Has tasks
                    foreach (var task in deliverable.Tasks)
                    {
                        int maxRows = Math.Max(task.SubTasks?.Count ?? 0, task.Comments?.Count ?? 0);
                        maxRows = Math.Max(1, maxRows); // At least one row

                        for (int i = 0; i < maxRows; i++)
                        {
                            var subtask = (task.SubTasks != null && i < task.SubTasks.Count) ? task.SubTasks[i] : null;
                            var comment = (task.Comments != null && i < task.Comments.Count) ? task.Comments[i] : null;

                            int col = 1;

                            worksheet.Cell(row, col++).Value = project.Id;
                            worksheet.Cell(row, col++).Value = project.Title;
                            worksheet.Cell(row, col++).Value = project.Description;
                            worksheet.Cell(row, col++).Value = project.Progress;
                            worksheet.Cell(row, col++).Value = project.ProgressColor;
                            worksheet.Cell(row, col++).Value = project.StartDate.ToString("u");
                            worksheet.Cell(row, col++).Value = project.EndDate.ToString("u");
                            worksheet.Cell(row, col++).Value = project.CreatedBy;
                            worksheet.Cell(row, col++).Value = project.CreatedAt.ToString("u");
                            worksheet.Cell(row, col++).Value = project.UpdatedAt.ToString("u");
                            worksheet.Cell(row, col++).Value = project.ProjectManager;
                            worksheet.Cell(row, col++).Value = string.Join(", ", project.Members);
                            worksheet.Cell(row, col++).Value = project.ClientId;

                            worksheet.Cell(row, col++).Value = phase.Id;
                            worksheet.Cell(row, col++).Value = phase.Title;
                            worksheet.Cell(row, col++).Value = phase.StartDate.ToString("u");
                            worksheet.Cell(row, col++).Value = phase.EndDate.ToString("u");
                            worksheet.Cell(row, col++).Value = phase.Color;
                            worksheet.Cell(row, col++).Value = phase.Status;

                            worksheet.Cell(row, col++).Value = deliverable.Id;
                            worksheet.Cell(row, col++).Value = deliverable.Title;
                            worksheet.Cell(row, col++).Value = deliverable.Description;
                            worksheet.Cell(row, col++).Value = deliverable.Link;
                            worksheet.Cell(row, col++).Value = deliverable.Priority;
                            worksheet.Cell(row, col++).Value = deliverable.PriorityNumber;
                            worksheet.Cell(row, col++).Value = deliverable.Date.ToString("u");
                            worksheet.Cell(row, col++).Value = deliverable.Status;
                            worksheet.Cell(row, col++).Value = string.Join(", ", deliverable.Assignee);

                            worksheet.Cell(row, col++).Value = task.Id;
                            worksheet.Cell(row, col++).Value = task.Text;
                            worksheet.Cell(row, col++).Value = task.Priority;
                            worksheet.Cell(row, col++).Value = task.Date.ToString("u");
                            worksheet.Cell(row, col++).Value = task.Status;
                            worksheet.Cell(row, col++).Value = task.Assignee;

                            worksheet.Cell(row, col++).Value = subtask?.Description;
                            worksheet.Cell(row, col++).Value = subtask?.IsCompleted.ToString();
                            worksheet.Cell(row, col++).Value = subtask?.Assignee;
                            worksheet.Cell(row, col++).Value = subtask?.CreatedAt.ToString("u");
                            worksheet.Cell(row, col++).Value = subtask?.UpdatedAt.ToString("u");

                            worksheet.Cell(row, col++).Value = comment?.Description;
                            worksheet.Cell(row, col++).Value = comment?.Assignee;
                            worksheet.Cell(row, col++).Value = comment?.CreatedAt.ToString("u");
                            worksheet.Cell(row, col++).Value = comment?.UpdatedAt.ToString("u");

                            row++;
                        }
                    }
                }
            }

            worksheet.Columns().AdjustToContents();

            using var stream = new MemoryStream();
            workbook.SaveAs(stream);
            return stream.ToArray();
        }
    }
}
