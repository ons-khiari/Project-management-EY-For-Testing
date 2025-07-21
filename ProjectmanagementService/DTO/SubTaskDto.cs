namespace ProjectmanagementService.DTO
{
    public class SubTaskDto
    {
        public string Id { get; set; }
        public string Description { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        public bool IsCompleted { get; set; }
        public string Assignee { get; set; }
        public string TaskId { get; set; }
    }
}
