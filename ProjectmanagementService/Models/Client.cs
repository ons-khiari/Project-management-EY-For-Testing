using System;
using System.ComponentModel.DataAnnotations;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion.Internal;
using System.Text.Json.Serialization;
using Newtonsoft.Json;
using Newtonsoft.Json.Converters;
using ProjectmanagementService.Models;

namespace ProjectManagementService.Models
{
    public enum ClientType
    {
        Individual,
        Company,
        Government,
        NonProfit
    }

    public class Client
    {
        [Key]
        [JsonPropertyName("id")]
        public string Id { get; set; } = Guid.NewGuid().ToString();

        [Required]
        [StringLength(100)]
        public string Name { get; set; }

        [Required]
        [System.Text.Json.Serialization.JsonConverter(typeof(ClientTypeConverter))] // Fully qualify to resolve ambiguity
        public ClientType Type { get; set; }

        [Required]
        [EmailAddress]
        [StringLength(255)]
        public string Email { get; set; }

        [Phone]
        public string? Phone { get; set; }

        [StringLength(255)]
        public string? Address { get; set; }

        [Url]
        public string? Website { get; set; }

        [StringLength(100)]
        public string? Industry { get; set; }

        [StringLength(100)]
        public string? ContactPerson { get; set; }

        [EmailAddress]
        [StringLength(255)]
        public string? ContactEmail { get; set; }

        [Phone]
        public string? ContactPhone { get; set; }

        [StringLength(500)]
        public string? Logo { get; set; }

        [StringLength(1000)]
        public string? Notes { get; set; }

        [Required]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Required]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
        public List<Project> Projects { get; set; }
    }
}
