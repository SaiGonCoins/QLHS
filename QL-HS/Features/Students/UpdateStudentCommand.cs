using System.Reflection;
using System.Security.Claims;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using QL_HS.Data;
using QL_HS.Models;
using QL_HS.Services;

namespace QL_HS.Features.Students;

// =====================================================================
// UpdateStudentCommand: Cập nhật thông tin + điểm trung bình học sinh
// Đồng thời ghi AuditLog sang MongoDB qua IAuditService.
// =====================================================================

// --- Command (input) ---
public record UpdateStudentCommand(
    Guid Id,
    string Name,
    int Age,
    Guid ClassId,
    double AverageScore,
    string? Reason // Lý do cập nhật (optional) — ghi vào AuditLog.Delta.Reason
) : IRequest<Student?>;

// --- Validator ---
public class UpdateStudentValidator : AbstractValidator<UpdateStudentCommand>
{
    public UpdateStudentValidator()
    {
        RuleFor(x => x.Id).NotEmpty();
        RuleFor(x => x.Name).NotEmpty().MaximumLength(100);
        RuleFor(x => x.Age).InclusiveBetween(1, 150);
        RuleFor(x => x.ClassId).NotEmpty();
        RuleFor(x => x.AverageScore).InclusiveBetween(0, 10);
    }
}

// --- Handler ---
public class UpdateStudentCommandHandler(
    AppDbContext context,
    IAuditService auditService,
    IHttpContextAccessor httpContextAccessor,
    ILogger<UpdateStudentCommandHandler> logger
) : IRequestHandler<UpdateStudentCommand, Student?>
{
    public async Task<Student?> Handle(UpdateStudentCommand request, CancellationToken cancellationToken)
    {
        logger.LogInformation("[AUDIT-DEBUG] Handler entered for Student {Id}", request.Id);

        // -----------------------------------------------------------------
        // BƯỚC 1: Lấy bản ghi gốc từ SQL trước khi thay đổi
        // AsNoTracking ngược lại: ta cần tracking để SaveChanges cập nhật
        // nhưng đồng thời cần snapshot dữ liệu CŨ để so sánh Delta.
        // -----------------------------------------------------------------
        var student = await context.Students
            .FirstOrDefaultAsync(s => s.Id == request.Id, cancellationToken);

        if (student is null)
        {
            logger.LogWarning("[AUDIT-DEBUG] Student {Id} not found", request.Id);
            return null; // Endpoint sẽ map thành 404
        }

        logger.LogInformation("[AUDIT-DEBUG] Student found: {Name}, Age={Age}, Score={Score}",
            student.Name, student.Age, student.AverageScore);

        // Snapshot giá trị cũ TRƯỚC khi gán giá trị mới
        var oldSnapshot = new Student
        {
            Id = student.Id,
            Name = student.Name,
            Age = student.Age,
            ClassId = student.ClassId,
            AverageScore = student.AverageScore
        };

        // -----------------------------------------------------------------
        // BƯỚC 2: Cập nhật các trường được phép thay đổi
        // -----------------------------------------------------------------
        student.Name = request.Name;
        student.Age = request.Age;
        student.ClassId = request.ClassId;
        student.AverageScore = request.AverageScore;

        // -----------------------------------------------------------------
        // BƯỚC 3: Lưu xuống SQL (PostgreSQL) — nếu lỗi sẽ throw và thoát
        // -----------------------------------------------------------------
        await context.SaveChangesAsync(cancellationToken);
        logger.LogInformation("[AUDIT-DEBUG] SQL SaveChanges completed for {Id}", request.Id);

        // -----------------------------------------------------------------
        // BƯỚC 4: Trích xuất thông tin Actor từ JWT/HttpContext
        // -----------------------------------------------------------------
        var actor = ExtractActor();
        logger.LogInformation("[AUDIT-DEBUG] Actor extracted: {Username}/{Role}", actor.Username, actor.Role);

        // -----------------------------------------------------------------
        // BƯỚC 5: So sánh Old vs New, gom các trường thay đổi vào Dictionary
        // Dùng reflection để duyệt các thuộc tính public của Student.
        // -----------------------------------------------------------------
        var (oldValues, newValues) = BuildDelta(oldSnapshot, student);
        logger.LogInformation("[AUDIT-DEBUG] Delta computed: old={OldCount} new={NewCount}",
            oldValues.Count, newValues.Count);

        // Chỉ ghi log nếu có thay đổi thật sự
        if (oldValues.Count == 0 && newValues.Count == 0)
        {
            logger.LogInformation("Không có trường nào thay đổi cho Student {Id}", request.Id);
            return student;
        }

        // -----------------------------------------------------------------
        // BƯỚC 6: Tạo AuditLog và đẩy sang MongoDB (background)
        // -----------------------------------------------------------------
        var log = new AuditLog
        {
            Timestamp = DateTime.UtcNow,
            Actor = actor,
            ActionGroup = "STUDENT_MANAGEMENT",
            ActionName = "UPDATE_STUDENT",
            TargetEntity = new AuditTarget
            {
                EntityName = nameof(Student),
                EntityId = student.Id,
                DisplayLabel = student.Name // Trường "Name" của học sinh
            },
            Delta = new AuditDelta
            {
                OldValues = oldValues,
                NewValues = newValues,
                Reason = request.Reason
            }
        };

        logger.LogInformation("[AUDIT-DEBUG] Calling auditService.InsertLogAsync...");

        // Fire-and-forget: AuditService.InsertLogAsync trả về ngay lập tức,
        // phần I/O thực sự chạy trên ThreadPool, không block response API.
        await auditService.InsertLogAsync(log);

        return student;
    }

    // ---------------------------------------------------------------------
    // ExtractActor: Trích xuất thông tin người dùng từ JWT claims
    // Ưu tiên UserId/Name/Role từ Claims, fallback sang HttpContext.Connection.RemoteIpAddress
    // ---------------------------------------------------------------------
    private AuditActor ExtractActor()
    {
        var user = httpContextAccessor.HttpContext?.User;

        // UserId (sub claim) — Guid? để hỗ trợ anonymous nếu có
        Guid? userId = null;
        var subClaim = user?.FindFirst(ClaimTypes.NameIdentifier)?.Value
                       ?? user?.FindFirst("sub")?.Value;
        if (Guid.TryParse(subClaim, out var parsedId))
            userId = parsedId;

        var username = user?.FindFirst(ClaimTypes.Name)?.Value
                       ?? user?.Identity?.Name
                       ?? "anonymous";

        var role = user?.FindFirst(ClaimTypes.Role)?.Value ?? "Unknown";

        // IpAddress: ưu tiên header X-Forwarded-For (khi chạy sau proxy),
        // fallback RemoteIpAddress
        var http = httpContextAccessor.HttpContext;
        string? ip = null;
        if (http is not null)
        {
            var forwarded = http.Request.Headers["X-Forwarded-For"].FirstOrDefault();
            ip = !string.IsNullOrWhiteSpace(forwarded)
                ? forwarded.Split(',')[0].Trim()
                : http.Connection.RemoteIpAddress?.ToString();
        }

        return new AuditActor
        {
            UserId = userId,
            Username = username,
            Role = role,
            IpAddress = ip
        };
    }

    // ---------------------------------------------------------------------
    // BuildDelta: So sánh 2 object cùng kiểu, gom field thay đổi vào Dict
    // Dùng reflection — chỉ duyệt các property public read/write.
    // ---------------------------------------------------------------------
    private static (Dictionary<string, object?> OldValues, Dictionary<string, object?> NewValues)
        BuildDelta<T>(T oldObj, T newObj)
    {
        var oldValues = new Dictionary<string, object?>();
        var newValues = new Dictionary<string, object?>();

        var props = typeof(T).GetProperties(BindingFlags.Public | BindingFlags.Instance)
            .Where(p => p.CanRead && p.CanWrite);

        foreach (var prop in props)
        {
            var oldVal = prop.GetValue(oldObj);
            var newVal = prop.GetValue(newObj);

            // Bỏ qua navigation property (Class) và các object phức tạp
            if (prop.PropertyType.IsClass && prop.PropertyType != typeof(string))
                continue;

            if (!Equals(oldVal, newVal))
            {
                oldValues[prop.Name] = oldVal;
                newValues[prop.Name] = newVal;
            }
        }

        return (oldValues, newValues);
    }
}
