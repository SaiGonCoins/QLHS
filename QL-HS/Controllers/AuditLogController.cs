using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using QL_HS.Data;
using QL_HS.Models;
using QL_HS.Services;

namespace QL_HS.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuditLogController(
    IAuditService auditService,
    AppDbContext context
) : ControllerBase
{
    [HttpGet("history")]
    [Microsoft.AspNetCore.Authorization.Authorize(Policy = "TeacherOrAdmin")]
    public async Task<IActionResult> GetAuditHistory([FromQuery] string? entityName, [FromQuery] Guid? entityId)
    {
        var logs = await auditService.GetAllLogsAsync();
        var filtered = logs.AsQueryable();

        if (!string.IsNullOrWhiteSpace(entityName))
            filtered = filtered.Where(l => l.TargetEntity.EntityName == entityName);

        if (entityId.HasValue)
            filtered = filtered.Where(l => l.TargetEntity.EntityId == entityId.Value);

        var result = filtered
            .OrderByDescending(l => l.Timestamp)
            .ToList();

        return Ok(result);
    }

    [HttpGet("history/{entityName}/{entityId:guid}")]
    [Microsoft.AspNetCore.Authorization.Authorize(Policy = "TeacherOrAdmin")]
    public async Task<IActionResult> GetEntityHistory(string entityName, Guid entityId)
    {
        var logs = await auditService.GetAllLogsAsync();
        var result = logs
            .Where(l => l.TargetEntity.EntityName == entityName && l.TargetEntity.EntityId == entityId)
            .OrderByDescending(l => l.Timestamp)
            .ToList();

        return Ok(result);
    }

    [HttpGet("history/student/{studentId:guid}")]
    [Microsoft.AspNetCore.Authorization.Authorize(Policy = "TeacherOrAdmin")]
    public async Task<IActionResult> GetStudentHistory(Guid studentId)
    {
        var student = await context.Students.FindAsync(studentId);
        if (student == null)
            return NotFound(new { Error = "Không tìm thấy học sinh." });

        var logs = await auditService.GetAllLogsAsync();
        var result = logs
            .Where(l => l.TargetEntity.EntityName == nameof(Student) && l.TargetEntity.EntityId == studentId)
            .OrderByDescending(l => l.Timestamp)
            .Select(l => new
            {
                l.Id,
                l.Timestamp,
                Actor = new { l.Actor.UserId, l.Actor.Username, l.Actor.Role },
                l.ActionGroup,
                l.ActionName,
                Target = new { l.TargetEntity.EntityName, l.TargetEntity.EntityId, l.TargetEntity.DisplayLabel },
                Delta = new
                {
                    Old = l.Delta.OldValues,
                    New = l.Delta.NewValues,
                    Reason = l.Delta.Reason
                }
            })
            .ToList();

        return Ok(result);
    }
}
