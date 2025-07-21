namespace ProjectmanagementService.DTO
{
    public class CommentDto
    {
        public string Id { get; set; }
        public string Assignee { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        public string Description { get; set; }
        public string TaskId { get; set; }
    }
}
