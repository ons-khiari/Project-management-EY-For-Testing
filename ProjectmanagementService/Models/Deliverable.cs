using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;
using ProjectManagementService.Models;

namespace ProjectmanagementService.Models
{
    public class Deliverable
    {
        [Key]
        public string Id { get; set; } = Guid.NewGuid().ToString();

        public string Title { get; set; }
        public string Description { get; set; }

        public string? Link { get; set; }

        // Priority: "low", "med", "high"
        public string Priority { get; set; }

        public int PriorityNumber { get; set; }

        public DateTime Date { get; set; }

        public string? Status { get; set; }

        public string ProjectId { get; set; }

        [JsonIgnore]
        public Project? Project { get; set; }

        public string DeliverablePhaseId { get; set; }

        [JsonIgnore]
        public DeliverablePhase? DeliverablePhase { get; set; }

        public string? ClientId { get; set; }

        [JsonIgnore]
        public Client? Client { get; set; }

        public List<string> Assignee { get; set; } = new();

        public List<Task> Tasks { get; set; } = new List<Task>();
    }
}
