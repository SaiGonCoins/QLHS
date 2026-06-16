using MediatR;
using Microsoft.EntityFrameworkCore;
using QL_HS.Data;

namespace QL_HS.Features.UserAccounts;

public record DeleteAccountCommand(Guid Id) : IRequest<bool>;

public class DeleteAccountCommandHandler(AppDbContext context) : IRequestHandler<DeleteAccountCommand, bool>
{
    public async Task<bool> Handle(DeleteAccountCommand request, CancellationToken ct)
    {
        var account = await context.Accounts.FirstOrDefaultAsync(a => a.Id == request.Id, ct);
        if (account is null) return false;

        context.Accounts.Remove(account);
        return await context.SaveChangesAsync(ct) > 0;
    }
}