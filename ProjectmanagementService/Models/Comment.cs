using System;
using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace ProjectmanagementService.Models
{
    public class Comment
    {
        [Key]
        public string Id { get; set; } = Guid.NewGuid().ToString();

        public string Assignee { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public DateTime? UpdatedAt { get; set; }

        public string Description { get; set; }

        // Foreign key to Task
        public string TaskId { get; set; }

        [JsonIgnore]
        public Task? Task { get; set; }
    }
}
