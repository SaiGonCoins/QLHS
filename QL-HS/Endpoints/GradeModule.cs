using Carter;
using MediatR;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using QL_HS.Features.Grades;
using QL_HS.Infrastructure;

namespace QL_HS.Endpoints;

public class GradeModule : ICarterModule
{
    public void AddRoutes(IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/grades").WithTags("Grades").RequireAuthorization("TeacherOrAdmin");

        group.MapGet("/", async (
            Guid? studentId,
            string? subjectName,
            string? semester,
            string? schoolYear,
            int? page,
            int? pageSize,
            ISender mediator) =>
        {
            var query = new GetGradesQuery(
                studentId,
                subjectName,
                semester,
                schoolYear,
                page ?? 1,
                pageSize ?? 10
            );

            var result = await mediator.Send(query);
            return Results.Ok(result);
        });

        group.MapGet("/student/{studentId:guid}", async (Guid studentId, ISender mediator) =>
        {
            var result = await mediator.Send(new GetGradesByStudentQuery(studentId));
            return Results.Ok(result);
        });

        group.MapPost("/", async (CreateGradeCommand command, ISender mediator) =>
        {
            var id = await mediator.Send(command);
            return Results.Created($"/api/grades/{id}", new { Id = id });
        }).WithValidation<CreateGradeCommand>();

        group.MapPut("/{id:guid}", async (Guid id, UpdateGradeCommand command, ISender mediator) =>
        {
            if (id != command.Id)
                return Results.BadRequest("Mã định danh điểm không trùng khớp!");

            var updated = await mediator.Send(command);
            return updated ? Results.Ok(new { Message = "Cập nhật điểm thành công!" }) : Results.NotFound("Không tìm thấy điểm!");
        }).WithValidation<UpdateGradeCommand>();

        group.MapDelete("/{id:guid}", async (Guid id, ISender mediator) =>
        {
            var deleted = await mediator.Send(new DeleteGradeCommand(id));
            return deleted ? Results.Ok(new { Message = "Xóa điểm thành công!" }) : Results.NotFound("Không tìm thấy điểm!");
        });
    }
}
