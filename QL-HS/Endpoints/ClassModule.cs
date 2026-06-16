using Carter;
using MediatR;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using QL_HS.Features.Classes;
using QL_HS.Infrastructure;

namespace QL_HS.Endpoints;

public class ClassModule : ICarterModule
{
    public void AddRoutes(IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/classes").WithTags("Classes");

        group.MapGet("/", async (ISender mediator) =>
        {
            var result = await mediator.Send(new GetClassesQuery());
            return Results.Ok(result);
        });

        group.MapPost("/", async (CreateClassCommand command, ISender mediator) =>
        {
            var result = await mediator.Send(command);
            return Results.Created($"/api/classes/{result.Id}", result);
        }).WithValidation<CreateClassCommand>();

        group.MapPut("/{id:guid}", async (Guid id, UpdateClassCommand command, ISender mediator) =>
        {
            if (id != command.Id)
                return Results.BadRequest("Mã định danh lớp không trùng khớp!");

            var updated = await mediator.Send(command);
            return updated ? Results.Ok(new { Message = "Cập nhật lớp thành công!" }) : Results.NotFound("Không tìm thấy lớp!");
        }).WithValidation<UpdateClassCommand>();

        group.MapDelete("/{id:guid}", async (Guid id, ISender mediator) =>
        {
            var deleted = await mediator.Send(new DeleteClassCommand(id));
            return deleted ? Results.Ok(new { Message = "Xóa lớp thành công!" }) : Results.NotFound("Không tìm thấy lớp!");
        });
    }
}