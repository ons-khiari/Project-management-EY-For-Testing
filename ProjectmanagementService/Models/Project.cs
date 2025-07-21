using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;
using ProjectManagementService.Models;

namespace ProjectmanagementService.Models
{
    public class Project
    {
        [Key]
        public string Id { get; set; } = Guid.NewGuid().ToString();
        public string Title { get; set; }
        public string Description { get; set; }
        public int Progress { get; set; } = 0; // Percentage (0-100)
        public string ProgressColor { get; set; }
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public string CreatedBy { get; set; }
        public DateTime? CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }
        public string ProjectManager { get; set; }

        // List of user IDs representing members  
        public List<string> Members { get; set; } = new List<string>();

        // Relationship to Client (1 Project : 1 Client)  
        public string ClientId { get; set; } // Foreign key  
        [JsonIgnore]
        public Client? Client { get; set; }

        public List<DeliverablePhase> DeliverablePhases { get; set; } = new List<DeliverablePhase>();

        public List<ProjectActivity> Activities { get; set; } = new List<ProjectActivity>();
    }
}
