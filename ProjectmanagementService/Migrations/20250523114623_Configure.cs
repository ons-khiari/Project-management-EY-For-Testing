using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ProjectmanagementService.Migrations
{
    /// <inheritdoc />
    public partial class Configure : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_ProjectPermissions_ProjectMemberPermissions_ProjectMemberP~1",
                table: "ProjectPermissions");

            migrationBuilder.DropIndex(
                name: "IX_ProjectPermissions_ProjectMemberPermissionId1",
                table: "ProjectPermissions");

            migrationBuilder.DropColumn(
                name: "ProjectMemberPermissionId1",
                table: "ProjectPermissions");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ProjectMemberPermissionId1",
                table: "ProjectPermissions",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.CreateIndex(
                name: "IX_ProjectPermissions_ProjectMemberPermissionId1",
                table: "ProjectPermissions",
                column: "ProjectMemberPermissionId1");

            migrationBuilder.AddForeignKey(
                name: "FK_ProjectPermissions_ProjectMemberPermissions_ProjectMemberP~1",
                table: "ProjectPermissions",
                column: "ProjectMemberPermissionId1",
                principalTable: "ProjectMemberPermissions",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
