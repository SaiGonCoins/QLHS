using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using QL_HS.Data;
using QL_HS.Models;

namespace QL_HS.Features.UserAccounts;

public record UpdateAccountCommand(
    Guid Id,
    string Username,
    string Email,
    UserRole Role
) : IRequest<bool>;

public class UpdateAccountCommandValidator : AbstractValidator<UpdateAccountCommand>
{
    public UpdateAccountCommandValidator()
    {
        RuleFor(x => x.Id).NotEmpty();
        RuleFor(x => x.Username).NotEmpty().MaximumLength(50);
        RuleFor(x => x.Email).NotEmpty().EmailAddress();
    }
}

public class UpdateAccountCommandHandler(AppDbContext context) : IRequestHandler<UpdateAccountCommand, bool>
{
    public async Task<bool> Handle(UpdateAccountCommand request, CancellationToken ct)
    {
        var account = await context.Accounts.FirstOrDefaultAsync(a => a.Id == request.Id, ct);
        if (account is null) return false;

        account.Username = request.Username;
        account.Email = request.Email;
        account.Role = request.Role;

        return await context.SaveChangesAsync(ct) > 0;
    }
}