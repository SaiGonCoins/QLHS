using FluentValidation;
using MediatR;
using QL_HS.Data;
using QL_HS.Models;

namespace QL_HS.Features.UserAccounts;

public record CreateAccountCommand(
    string Username,
    string Email,
    string Password,
    UserRole Role
) : IRequest<Account>;

public class CreateAccountCommandValidator : AbstractValidator<CreateAccountCommand>
{
    public CreateAccountCommandValidator()
    {
        RuleFor(x => x.Username).NotEmpty().MaximumLength(50);
        RuleFor(x => x.Email).NotEmpty().EmailAddress();
        RuleFor(x => x.Password).NotEmpty().MinimumLength(6);
    }
}

public class CreateAccountCommandHandler(AppDbContext context) : IRequestHandler<CreateAccountCommand, Account>
{
    public async Task<Account> Handle(CreateAccountCommand request, CancellationToken ct)
    {
        var account = new Account
        {
            Id = Guid.NewGuid(),
            Username = request.Username,
            Email = request.Email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
            Role = request.Role,
            CreatedAt = DateTime.UtcNow
        };

        context.Accounts.Add(account);
        await context.SaveChangesAsync(ct);
        return account;
    }
}