using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace ProjectmanagementService.Models
{
    public class SubTask
    {
        [Key]
        public string Id { get; set; } = Guid.NewGuid().ToString();

        [Required]
        public string Description { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public DateTime? UpdatedAt { get; set; }

        [Required]
        public bool IsCompleted { get; set; } = false;

        [Required]
        public string Assignee { get; set; }

        [Required]
        public string TaskId { get; set; }

        [JsonIgnore]
        public Task? Task { get; set; }
    }
}
