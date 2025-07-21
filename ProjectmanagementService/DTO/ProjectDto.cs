namespace ProjectmanagementService.DTO
{
    public class ProjectDto
    {
        public string Id { get; set; }
        public string Title { get; set; }
        public string Description { get; set; }
        public int Progress { get; set; }
        public string ProgressColor { get; set; }
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public string CreatedBy { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        public string ProjectManager { get; set; }
        public List<string> Members { get; set; }
        public string ClientId { get; set; }
        public List<DeliverablePhaseDto> DeliverablePhases { get; set; } = new();
        public List<ActivityDto> Activities { get; set; } = new();
    }
}
