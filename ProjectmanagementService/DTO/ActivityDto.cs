namespace ProjectmanagementService.DTO
{
    public class ActivityDto
    {
        public string Id { get; set; }
        public string ProjectId { get; set; }
        public string Action { get; set; }
        public string Description { get; set; }
        public string PerformedBy { get; set; }
        public string PerformedTo { get; set; }
        public DateTime Timestamp { get; set; }
    }
}
