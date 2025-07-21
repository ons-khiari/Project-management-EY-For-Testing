using System.Collections.Generic;
using System.Reflection.Emit;
using Microsoft.EntityFrameworkCore;
using ProjectmanagementService.Models;
using ProjectManagementService.Models;

namespace ProjectManagementService.Data
{
    public class ProjectManagementDbContext : DbContext
    {
        public ProjectManagementDbContext(DbContextOptions<ProjectManagementDbContext> options) : base(options)
        {
        }
        public DbSet<Client> Clients { get; set; }
        public DbSet<Project> Projects { get; set; }
        public DbSet<DeliverablePhase> DeliverablePhases { get; set; }
        public DbSet<Deliverable> Deliverables { get; set; }
        public DbSet<ProjectmanagementService.Models.Task> Tasks { get; set; }
        public DbSet<SubTask> SubTasks { get; set; }
        public DbSet<Comment> Comments { get; set; }
        public DbSet<ProjectMemberPermission> ProjectMemberPermissions { get; set; }
        public DbSet<ProjectPermission> ProjectPermissions { get; set; }
        public DbSet<ProjectActivity> ProjectActivities { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            modelBuilder.Entity<Client>()
            .Property(c => c.Type)
            .HasConversion<string>();

            // Configure one-to-many relationship: Client → Projects
            modelBuilder.Entity<Project>()
                .HasOne(p => p.Client)
                .WithMany(c => c.Projects)
                .HasForeignKey(p => p.ClientId)
                .OnDelete(DeleteBehavior.Cascade);

            // Configure Members as a serialized list (optional)
            modelBuilder.Entity<Project>()
                .Property(p => p.Members)
                .HasConversion(
                    v => string.Join(',', v),
                    v => v.Split(',', StringSplitOptions.RemoveEmptyEntries).ToList()
                );

            // Configure one-to-many relationship: Project → DeliverablePhases
            modelBuilder.Entity<Project>()
                .HasMany(p => p.DeliverablePhases)
                .WithOne(d => d.Project)
                .HasForeignKey(d => d.ProjectId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<Deliverable>()
                .Property(d => d.Assignee)
                .HasConversion(
                    v => string.Join(',', v),
                    v => v.Split(',', StringSplitOptions.RemoveEmptyEntries).ToList()
    );

            modelBuilder.Entity<Deliverable>()
                .HasOne(d => d.Project)
                .WithMany()
                .HasForeignKey(d => d.ProjectId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<Deliverable>()
                .HasOne(d => d.DeliverablePhase)
                .WithMany(dp => dp.Deliverables)
                .HasForeignKey(d => d.DeliverablePhaseId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<Deliverable>()
                .HasOne(d => d.Client)
                .WithMany()
                .HasForeignKey(d => d.ClientId)
                .OnDelete(DeleteBehavior.SetNull);

            // Deliverable → Tasks
            modelBuilder.Entity<Deliverable>()
                .HasMany(d => d.Tasks)
                .WithOne(t => t.Deliverable)
                .HasForeignKey(t => t.DeliverableId)
                .OnDelete(DeleteBehavior.Cascade);

            // Project → Tasks
            modelBuilder.Entity<Project>()
                .HasMany<ProjectmanagementService.Models.Task>()
                .WithOne(t => t.Project)
                .HasForeignKey(t => t.ProjectId)
                .OnDelete(DeleteBehavior.Cascade);

            // DeliverablePhase → Tasks (optional link)
            modelBuilder.Entity<DeliverablePhase>()
                .HasMany<ProjectmanagementService.Models.Task>()
                .WithOne(t => t.DeliverablePhase)
                .HasForeignKey(t => t.DeliverablePhaseId)
                .OnDelete(DeleteBehavior.SetNull);

            // Task → SubTasks
            modelBuilder.Entity<ProjectmanagementService.Models.Task>()
                .HasMany(t => t.SubTasks)
                .WithOne(st => st.Task)
                .HasForeignKey(st => st.TaskId)
                .OnDelete(DeleteBehavior.Cascade);

            // Task → Comments
            modelBuilder.Entity<ProjectmanagementService.Models.Task>()
                .HasMany(t => t.Comments)
                .WithOne(c => c.Task)
                .HasForeignKey(c => c.TaskId)
                .OnDelete(DeleteBehavior.Cascade);

            // Configure one-to-many: ProjectMemberPermission → ProjectPermission
            modelBuilder.Entity<ProjectMemberPermission>()
                .HasMany(pmp => pmp.Permissions)
                .WithOne(pp => pp.ProjectMemberPermission)
                .HasForeignKey(pp => pp.ProjectMemberPermissionId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<ProjectActivity>()
                .HasOne(pa => pa.Project)
                .WithMany(p => p.Activities)
                .HasForeignKey(pa => pa.ProjectId)
                .OnDelete(DeleteBehavior.Cascade);

            base.OnModelCreating(modelBuilder);
        }
    }
}
