namespace ProjectmanagementService.DTO
{
    public class DeliverableDto
    {
        public string Id { get; set; }
        public string Title { get; set; }
        public string Description { get; set; }
        public string Link { get; set; }
        public string Priority { get; set; }
        public int PriorityNumber { get; set; }
        public DateTime Date { get; set; }
        public string Status { get; set; }
        public string ProjectId { get; set; }
        public string DeliverablePhaseId { get; set; }
        public string ClientId { get; set; }
        public List<string> Assignee { get; set; } = new();
        public List<TaskDto> Tasks { get; set; } = new();
    }
}
