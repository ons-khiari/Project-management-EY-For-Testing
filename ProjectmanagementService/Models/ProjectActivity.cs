using System.Text.Json.Serialization;

namespace ProjectmanagementService.Models
{
    public class ProjectActivity
    {
        public Guid Id { get; set; }
        public string ProjectId { get; set; }
        public string Action { get; set; }           // "Updated", "Deleted", "Created Task", "Changed Status"
        public string Description { get; set; }      // "Status changed from In Progress to Done"
        public string PerformedBy { get; set; }      // User ID of the user who performed the action
        public string PerformedTo { get; set; }      // User ID of the affected user
        public DateTime Timestamp { get; set; }
        [JsonIgnore]
        public Project Project { get; set; }
    }

}
