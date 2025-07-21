namespace ProjectmanagementService.DTO
{
    public class PhaseSuggestion
    {
        public string Title { get; set; }
        public string StartDate { get; set; }
        public string EndDate { get; set; }
        public string Status { get; set; }  // Always "todo"
        public string Color { get; set; }   // One of: blue, orange, yellow, purple, green
    }
}
