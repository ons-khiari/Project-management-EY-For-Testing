namespace ProjectmanagementService.DTO
{
    public class DeliverablePhaseDto
    {
        public string Id { get; set; }
        public string Title { get; set; }
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public string Color { get; set; }
        public string Status { get; set; }
        public string ProjectId { get; set; }
        public List<DeliverableDto> Deliverables { get; set; } = new();
    }
}
