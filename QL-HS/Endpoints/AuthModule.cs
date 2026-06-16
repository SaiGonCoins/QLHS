using Carter;
using MediatR;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using QL_HS.Data;
using QL_HS.Features.Auth;
using QL_HS.Infrastructure;

namespace QL_HS.Endpoints;

public class AuthModule : ICarterModule
{
    public void AddRoutes(IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/auth").WithTags("Authentication");

        // [POST] /api/auth/register
        group.MapPost("/register", async (RegisterCommand command, ISender mediator) =>
        {
            try
            {
                var result = await mediator.Send(command);
                return Results.Ok(new
                {
                    Message = "Đăng ký thành công!",
                    Data = result
                });
            }
            catch (InvalidOperationException ex)
            {
                return Results.BadRequest(new { Error = ex.Message });
            }
        }).WithValidation<RegisterCommand>();

        // [POST] /api/auth/login
        group.MapPost("/login", async (LoginCommand command, ISender mediator) =>
        {
            try
            {
                var result = await mediator.Send(command);
                return Results.Ok(new
                {
                    Message = "Đăng nhập thành công!",
                    Data = result
                });
            }
            catch (UnauthorizedAccessException ex)
            {
                return Results.Json(new { Error = ex.Message }, statusCode: StatusCodes.Status401Unauthorized);
            }
        }).WithValidation<LoginCommand>();
    }
}
