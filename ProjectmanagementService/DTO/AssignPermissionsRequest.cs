namespace ProjectmanagementService.DTO
{
    public class AssignPermissionsRequest
    {
        public string ProjectId { get; set; }
        public string UserId { get; set; }
        public List<string> Permissions { get; set; } = new();
    }
}
