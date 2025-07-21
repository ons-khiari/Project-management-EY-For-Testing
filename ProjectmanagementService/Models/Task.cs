using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace ProjectmanagementService.Models
{
    public class Task
    {
        [Key]
        public string Id { get; set; } = Guid.NewGuid().ToString();

        public string Text { get; set; }

        // Priority: "low", "med", "high"
        public string Priority { get; set; }

        public DateTime Date { get; set; }

        public string Status { get; set; } // "todo", "in-progress", "done"

        // Single assignee ID
        public string Assignee { get; set; }

        // Project reference
        public string ProjectId { get; set; }

        [JsonIgnore]
        public Project? Project { get; set; }

        // Optional foreign key to Deliverable
        public string? DeliverableId { get; set; }

        [JsonIgnore]
        public Deliverable? Deliverable { get; set; }

        // Optional foreign key to DeliverablePhase
        public string? DeliverablePhaseId { get; set; }

        [JsonIgnore]
        public DeliverablePhase? DeliverablePhase { get; set; }

        public List<SubTask> SubTasks { get; set; } = new List<SubTask>();

        public List<Comment> Comments { get; set; } = new List<Comment>();

    }
}
