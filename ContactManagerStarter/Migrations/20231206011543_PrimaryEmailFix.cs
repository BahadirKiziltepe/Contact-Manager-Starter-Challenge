using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ContactManagerStarter.Migrations
{
    /// <inheritdoc />
    public partial class PrimaryEmailFix : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "PrimaryEmail",
                table: "Contacts",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.UpdateData(
                table: "Contacts",
                keyColumn: "Id",
                keyValue: new Guid("930d4f10-9daf-4582-b4bb-cb9abfd382b3"),
                column: "PrimaryEmail",
                value: "Bill@gates.com");

            migrationBuilder.UpdateData(
                table: "Contacts",
                keyColumn: "Id",
                keyValue: new Guid("99580d68-9d2f-4552-862e-06b3204193f1"),
                column: "PrimaryEmail",
                value: "SundarPichai@gmail.com");

            migrationBuilder.UpdateData(
                table: "Contacts",
                keyColumn: "Id",
                keyValue: new Guid("b728f6ef-65d8-4da2-8e5f-0f67e3c3401c"),
                column: "PrimaryEmail",
                value: "Steve@Jobs.com");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "PrimaryEmail",
                table: "Contacts");
        }
    }
}
