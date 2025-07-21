using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ProjectmanagementService.Migrations
{
    /// <inheritdoc />
    public partial class AddProjectPermissions : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Permission",
                table: "ProjectMemberPermissions");

            migrationBuilder.CreateTable(
                name: "ProjectPermissions",
                columns: table => new
                {
                    Id = table.Column<string>(type: "text", nullable: false),
                    Name = table.Column<string>(type: "text", nullable: false),
                    ProjectMemberPermissionId = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProjectPermissions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ProjectPermissions_ProjectMemberPermissions_ProjectMemberPe~",
                        column: x => x.ProjectMemberPermissionId,
                        principalTable: "ProjectMemberPermissions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ProjectPermissions_ProjectMemberPermissionId",
                table: "ProjectPermissions",
                column: "ProjectMemberPermissionId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ProjectPermissions");

            migrationBuilder.AddColumn<string>(
                name: "Permission",
                table: "ProjectMemberPermissions",
                type: "text",
                nullable: false,
                defaultValue: "");
        }
    }
}
