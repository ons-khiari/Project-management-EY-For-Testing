namespace UserService.Models
{
    public class Notification
    {
        public int Id { get; set; }
        public string UserId { get; set; }
        public User User { get; set; }
        public string ProjectId { get; set; }
        public string Message { get; set; }
        public string EventType { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public bool IsRead { get; set; } = false;
    }
}
