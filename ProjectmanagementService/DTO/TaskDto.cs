namespace ProjectmanagementService.DTO
{
    public class TaskDto
    {
        public string Id { get; set; }
        public string Text { get; set; }
        public string Priority { get; set; }
        public DateTime Date { get; set; }
        public string Status { get; set; }
        public string Assignee { get; set; }
        public string ProjectId { get; set; }
        public string DeliverableId { get; set; }
        public string DeliverablePhaseId { get; set; }
        public List<SubTaskDto> SubTasks { get; set; } = new();
        public List<CommentDto> Comments { get; set; } = new();
    }
}
