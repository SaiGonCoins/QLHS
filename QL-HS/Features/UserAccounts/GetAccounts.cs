using MediatR;
using Microsoft.EntityFrameworkCore;
using QL_HS.Data;

namespace QL_HS.Features.UserAccounts;

public record AccountDto(
    Guid Id,
    string Username,
    string Email,
    string Role,
    Guid? StudentId,
    Guid? TeacherId,
    DateTime CreatedAt
);

public record GetAccountsQuery() : IRequest<List<AccountDto>>;

public class GetAccountsQueryHandler(AppDbContext context) : IRequestHandler<GetAccountsQuery, List<AccountDto>>
{
    public async Task<List<AccountDto>> Handle(GetAccountsQuery request, CancellationToken ct)
    {
        var accounts = await context.Accounts
            .AsNoTracking()
            .ToListAsync(ct);

        return accounts.Select(a => new AccountDto(
            a.Id,
            a.Username,
            a.Email,
            a.Role.ToString(),
            a.StudentId,
            a.TeacherId,
            a.CreatedAt
        )).ToList();
    }
}