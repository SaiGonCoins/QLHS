using System.Runtime.Versioning;
using Carter;
using DevExpress.XtraReports.UI;
using Microsoft.EntityFrameworkCore;
using QL_HS.Data;
using QL_HS.Features.Reports;
using QL_HS.Reports;
using System.Security.Claims;

namespace QL_HS.Endpoints;

[SupportedOSPlatform("windows")]
public class ReportModule : ICarterModule
{
    public void AddRoutes(IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/reports").WithTags("Reports");

        group.MapGet("/students/{id:guid}/learning", async (
            Guid id,
            AppDbContext context,
            HttpContext httpContext) =>
        {
            var role = httpContext.User.FindFirst(ClaimTypes.Role)?.Value;
            var currentUserId = httpContext.User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                                ?? httpContext.User.FindFirst("sub")?.Value;

            if (role == "Student" && !string.Equals(currentUserId, id.ToString(), StringComparison.OrdinalIgnoreCase))
            {
                return Results.Forbid();
            }

            if (role is not "Teacher" and not "Admin" and not "Student")
            {
                return Results.Forbid();
            }

            var student = await context.Students
                .Include(s => s.Class)
                .FirstOrDefaultAsync(s => s.Id == id);

            if (student is null)
            {
                return Results.NotFound(new { Message = "Không tìm thấy sinh viên." });
            }

            var grades = await context.Grades
                .Where(g => g.StudentId == id)
                .OrderBy(g => g.SchoolYear)
                .ThenBy(g => g.Semester)
                .ThenBy(g => g.SubjectName)
                .ToListAsync();

            var reportDto = new StudentReportDto(
                student.Id,
                student.Name,
                student.Class?.ClassName ?? "Chưa xếp lớp",
                student.Age,
                student.AverageScore,
                grades.Select(g => new StudentReportGradeDto(
                    g.SubjectName,
                    g.ProgressScore,
                    g.MidtermScore,
                    g.FinalScore,
                    g.Semester,
                    g.SchoolYear
                )).ToList()
            );

            using var report = new StudentLearningReport(reportDto);
            report.CreateDocument();

            using var stream = new MemoryStream();
            report.ExportToPdf(stream);

            var fileName = $"Bao_Cao_Hoc_Tap_{SanitizeFileName(student.Name)}_{DateTime.Now:yyyyMMdd}.pdf";

            return Results.File(
                stream.ToArray(),
                "application/pdf",
                fileName
            );
        }).RequireAuthorization();
    }

    private static string SanitizeFileName(string value)
    {
        foreach (var invalidChar in Path.GetInvalidFileNameChars())
        {
            value = value.Replace(invalidChar, '_');
        }

        return value.Replace(" ", "_");
    }
}