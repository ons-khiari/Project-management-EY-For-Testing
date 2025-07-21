namespace UserService.DTO
{
    public class UserNotificationMessage
    {
        public string EventType { get; set; }
        public string UserId { get; set; }
        public string ProjectId { get; set; }
        public string Message { get; set; }
    }
}
