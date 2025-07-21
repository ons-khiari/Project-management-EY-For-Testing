using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Mvc.ModelBinding.Validation;

namespace ProjectmanagementService.Models
{
    public class DeliverablePhase
    {
        [Key]
        public string Id { get; set; } = Guid.NewGuid().ToString();

        public string Title { get; set; }
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public string Color { get; set; }
        public string Status { get; set; } // "todo", "in-progress", "done"
        // Foreign key
        public string ProjectId { get; set; }
        // Navigation property
        [JsonIgnore]
        [ValidateNever]
        public Project Project { get; set; }
        public List<Deliverable> Deliverables { get; set; } = new List<Deliverable>();

    }
}
