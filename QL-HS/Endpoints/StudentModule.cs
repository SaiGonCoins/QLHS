using Carter;
using MediatR;
using System.Web;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using QL_HS.Features.Students;
using QL_HS.Infrastructure;
using QL_HS.Models;

namespace QL_HS.Endpoints;

public class StudentModule : ICarterModule
{
    public void AddRoutes(IEndpointRouteBuilder app)
    {
        // Tạo group chung cho API sinh viên
        var group = app.MapGroup("/api/students").WithTags("Students");

        // 1. [GET] Lấy thống kê tổng quan về sinh viên
        group.MapGet("/stats", async (ISender mediator) =>
        {
            var stats = await mediator.Send(new GetStudentStatsQuery());
            return Results.Ok(stats);
        });

        // 2. [GET] /api/students - Lấy danh sách sinh viên có Tìm kiếm, Lọc và Phân trang
        group.MapGet("/", async (
            string? searchTerm,
            string? classId,
            int? page,
            int? pageSize,
            ISender mediator) =>
        {
            // Kiểm tra và ép kiểu classId một cách an toàn
            Guid? parsedClassId = null;
            if (!string.IsNullOrEmpty(classId) && Guid.TryParse(classId, out var resultGuid))
            {
                parsedClassId = resultGuid;
            }

            var query = new GetStudentsQuery(
                searchTerm,
                parsedClassId,
                page ?? 1,
                pageSize ?? 5
            );

            var result = await mediator.Send(query);
            return Results.Ok(result);
        });

        // 3. [POST] Thêm mới sinh viên ➔ Yêu cầu quyền Giảng viên hoặc Admin
        group.MapPost("/", async (CreateStudentCommand command, ISender mediator) =>
        {
            var result = await mediator.Send(command);
            return Results.Created($"/api/students/{result.Id}", result);
        }).RequireAuthorization("TeacherOrAdmin");

        group.MapGet("/{id:guid}", async (Guid id, ISender mediator) =>
        {
            var result = await mediator.Send(new GetStudentByIdQuery(id));
            return result is not null ? Results.Ok(result) : Results.NotFound(new { Message = "Không tìm thấy sinh viên!" });
        });

        // 4. [PUT] Chỉnh sửa sinh viên dựa theo Guid ➔ Yêu cầu quyền Giảng viên hoặc Admin
        group.MapPut("/{id:guid}", async (Guid id, UpdateStudentCommand command, ISender mediator) =>
        {
            if (id != command.Id)
                return Results.BadRequest("Mã định danh sinh viên không trùng khớp!");

            var result = await mediator.Send(command);
            return result is not null ? Results.Ok(result) : Results.NotFound("Không tìm thấy sinh viên!");
        }).RequireAuthorization("TeacherOrAdmin").WithValidation<UpdateStudentCommand>();

        // 5. [DELETE] Xóa sinh viên dựa theo Guid ➔ CHỈ ADMIN MỚI ĐƯỢC QUYỀN XÓA
        group.MapDelete("/{id:guid}", async (Guid id, ISender mediator) =>
        {
            var isDeleted = await mediator.Send(new DeleteStudentCommand(id));
            return isDeleted
                ? Results.Ok(new { message = "Xóa thông tin sinh viên thành công!" })
                : Results.NotFound("Không tìm thấy dữ liệu sinh viên cần xóa!");
        }).RequireAuthorization("AdminOnly");

        

        // 6. [GET] /api/students/export - Xuất file Excel kèm tên lớp động
        group.MapGet("/export", async (Guid? classId, ISender mediator, QL_HS.Data.AppDbContext context, IHttpContextAccessor httpContextAccessor) =>
        {
            // 1. Xác định tên lớp dựa vào bộ lọc classId
            string tenLopFile = "Tat_Ca_Cac_Lop";
            if (classId.HasValue)
            {
                var targetClass = await context.Classes.FindAsync(classId.Value);
                if (targetClass != null)
                {
                    // Thay thế khoảng trắng bằng dấu gạch dưới
                    tenLopFile = targetClass.ClassName.Replace(" ", "_");
                }
            }

            // 2. Lấy mảng byte dữ liệu Excel từ Mediator
            var fileBytes = await mediator.Send(new ExportStudentsQuery(classId));

            // 3. Tạo tên file hoàn chỉnh kèm ngày tháng năm
            string fileName = $"Danh_Sach_Sinh_Vien_{tenLopFile}_{DateTime.Now:yyyyMMdd}.xlsx";

            // 4. Bổ sung Header báo cho trình duyệt biết tên file chính xác
            var httpContext = httpContextAccessor.HttpContext;
            httpContext?.Response.Headers.Append("Access-Control-Expose-Headers", "Content-Disposition");

            return Results.File(
                fileBytes,
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                fileName
            );
        });

        // 7. [POST] /api/students/import - Nhập file Excel
        group.MapPost("/import", async (IFormFile file, ISender mediator) =>
        {
            if (file == null || file.Length == 0)
                return Results.BadRequest("Vui lòng chọn một file Excel hợp lệ!");

            // Lấy đuôi file dạng string (Ví dụ: ".xlsx", ".xls")
            var extension = Path.GetExtension(file.FileName).ToLower();

            using var stream = file.OpenReadStream();

            // Truyền stream và chuỗi extension xuống tầng xử lý
            var count = await mediator.Send(new ImportStudentsCommand(stream, extension));

            return Results.Ok(new { Message = $"Đã nhập thành công hàng loạt {count} sinh viên vào hệ thống!" });
        }).DisableAntiforgery();
    }
}
