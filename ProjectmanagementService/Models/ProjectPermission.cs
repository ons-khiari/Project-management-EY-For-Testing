namespace ProjectmanagementService.Models
{
    public class ProjectPermission
    {
        public string Id { get; set; } = Guid.NewGuid().ToString();
        public string Name { get; set; } // 
        public string ProjectMemberPermissionId { get; set; }
        public ProjectMemberPermission ProjectMemberPermission { get; set; }
    }
}
