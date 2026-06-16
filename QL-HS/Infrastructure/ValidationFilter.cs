using FluentValidation;
using Microsoft.AspNetCore.Http;

namespace QL_HS.Infrastructure;

// Filter: Tự động validate request bằng FluentValidation trước khi thực thi endpoint
public class ValidationFilter<TRequest> : IEndpointFilter where TRequest : class
{
    public async ValueTask<object?> InvokeAsync(
        EndpointFilterInvocationContext context,
        EndpointFilterDelegate next)
    {
        var request = context.Arguments.FirstOrDefault(a => a is TRequest) as TRequest;
        if (request is null)
            return await next(context);

        var validator = context.HttpContext.RequestServices.GetService<IValidator<TRequest>>();
        if (validator is null)
            return await next(context);

        var validationResult = await validator.ValidateAsync(request, context.HttpContext.RequestAborted);
        if (!validationResult.IsValid)
        {
            var errors = validationResult.Errors
                .GroupBy(e => e.PropertyName)
                .ToDictionary(
                    g => g.Key,
                    g => g.Select(e => e.ErrorMessage).ToArray());

            return Results.BadRequest(new { Errors = errors });
        }

        return await next(context);
    }
}

// Extension: Thêm filter validation vào route handler
public static class ValidationFilterExtensions
{
    public static RouteHandlerBuilder WithValidation<TRequest>(this RouteHandlerBuilder builder) where TRequest : class
    {
        return builder.AddEndpointFilter<ValidationFilter<TRequest>>();
    }
}
