using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace UserService.Models
{
    public class User
    {
        [Key]
        public string Id { get; set; } = Guid.NewGuid().ToString();

        [Required]
        [StringLength(30)]
        public string Name { get; set; }

        [Required]
        [StringLength(30)]
        public string Lastname { get; set; }

        [Required]
        [EmailAddress]
        [StringLength(255)] // Max length for Email
        public string Email { get; set; }

        [Required]
        [Phone]
        [StringLength(8)]
        public string PhoneNumber { get; set; }

        [Required]
        [StringLength(8)]
        public string Cin { get; set; }

        [Required]
        public UserRole Role { get; set; }

        [Required]
        public string PasswordHash { get; set; }

        [StringLength(500)]
        public string Avatar { get; set; }
        public ICollection<Notification> Notifications { get; set; }
    }
}
