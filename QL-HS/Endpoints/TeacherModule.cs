using Carter;
using MediatR;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using QL_HS.Features.Teachers;
using QL_HS.Infrastructure;

namespace QL_HS.Endpoints;

public class TeacherModule : ICarterModule
{
    public void AddRoutes(IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/teachers").WithTags("Teachers");

        group.MapGet("/", async (ISender mediator) =>
        {
            var result = await mediator.Send(new GetTeachersQuery());
            return Results.Ok(result);
        });

        group.MapGet("/{id:guid}", async (Guid id, ISender mediator) =>
        {
            var result = await mediator.Send(new GetTeacherByIdQuery(id));
            return result is not null ? Results.Ok(result) : Results.NotFound(new { Error = "Không tìm thấy giáo viên." });
        });

        group.MapPost("/", async (CreateTeacherCommand command, ISender mediator) =>
        {
            var result = await mediator.Send(command);
            return Results.Created($"/api/teachers/{result.Id}", new { result.Id });
        }).WithValidation<CreateTeacherCommand>();

        group.MapPut("/{id:guid}", async (Guid id, UpdateTeacherCommand command, ISender mediator) =>
        {
            if (id != command.Id)
                return Results.BadRequest("Mã định danh giáo viên không trùng khớp!");

            var updated = await mediator.Send(command);
            return updated ? Results.Ok(new { Message = "Cập nhật giáo viên thành công!" }) : Results.NotFound("Không tìm thấy giáo viên!");
        }).WithValidation<UpdateTeacherCommand>();

        group.MapDelete("/{id:guid}", async (Guid id, ISender mediator) =>
        {
            var deleted = await mediator.Send(new DeleteTeacherCommand(id));
            return deleted ? Results.Ok(new { Message = "Xóa giáo viên thành công!" }) : Results.NotFound("Không tìm thấy giáo viên!");
        });
    }
}
