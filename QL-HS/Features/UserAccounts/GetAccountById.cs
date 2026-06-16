using MediatR;
using Microsoft.EntityFrameworkCore;
using QL_HS.Data;

namespace QL_HS.Features.UserAccounts;

public record GetAccountByIdQuery(Guid Id) : IRequest<AccountDto?>;

public class GetAccountByIdQueryHandler(AppDbContext context) : IRequestHandler<GetAccountByIdQuery, AccountDto?>
{
    public async Task<AccountDto?> Handle(GetAccountByIdQuery request, CancellationToken ct)
    {
        var account = await context.Accounts
            .AsNoTracking()
            .FirstOrDefaultAsync(a => a.Id == request.Id, ct);

        return account is null ? null : new AccountDto(
            account.Id,
            account.Username,
            account.Email,
            account.Role.ToString(),
            account.StudentId,
            account.TeacherId,
            account.CreatedAt
        );
    }
}