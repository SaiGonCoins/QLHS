using Carter;
using MediatR;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using QL_HS.Features.UserAccounts;
using QL_HS.Infrastructure;

namespace QL_HS.Endpoints;

public class UserAccountModule : ICarterModule
{
    public void AddRoutes(IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/accounts").WithTags("Accounts").RequireAuthorization("AdminOnly");

        group.MapGet("/", async (ISender mediator) =>
        {
            var result = await mediator.Send(new GetAccountsQuery());
            return Results.Ok(result);
        });

        group.MapGet("/{id:guid}", async (Guid id, ISender mediator) =>
        {
            var result = await mediator.Send(new GetAccountByIdQuery(id));
            return result is not null ? Results.Ok(result) : Results.NotFound(new { Error = "Không tìm thấy tài khoản." });
        });

        group.MapPost("/", async (CreateAccountCommand command, ISender mediator) =>
        {
            var result = await mediator.Send(command);
            return Results.Created($"/api/accounts/{result.Id}", result);
        }).WithValidation<CreateAccountCommand>();

        group.MapPut("/{id:guid}", async (Guid id, UpdateAccountCommand command, ISender mediator) =>
        {
            if (id != command.Id)
                return Results.BadRequest("Mã định danh tài khoản không trùng khớp!");

            var updated = await mediator.Send(command);
            return updated ? Results.Ok(new { Message = "Cập nhật tài khoản thành công!" }) : Results.NotFound("Không tìm thấy tài khoản!");
        }).WithValidation<UpdateAccountCommand>();

        group.MapDelete("/{id:guid}", async (Guid id, ISender mediator) =>
        {
            var deleted = await mediator.Send(new DeleteAccountCommand(id));
            return deleted ? Results.Ok(new { Message = "Xóa tài khoản thành công!" }) : Results.NotFound("Không tìm thấy tài khoản!");
        });
    }
}