namespace ProjectmanagementService.Models
{
    public class ProjectMemberPermission
    {
        public string Id { get; set; } = Guid.NewGuid().ToString();
        public string ProjectId { get; set; }
        public string UserId { get; set; }

        public Project Project { get; set; }

        public List<ProjectPermission> Permissions { get; set; } = new();
    }
}