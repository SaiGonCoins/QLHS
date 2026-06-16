using MediatR;
using QL_HS.Data;
using QL_HS.Models;

namespace QL_HS.Features.Classes;

public record DeleteClassCommand(Guid Id) : IRequest<bool>;

public class DeleteClassCommandHandler(AppDbContext context) : IRequestHandler<DeleteClassCommand, bool>
{
    public async Task<bool> Handle(DeleteClassCommand request, CancellationToken cancellationToken)
    {
        var existingClass = await context.Classes.FindAsync([request.Id], cancellationToken);
        if (existingClass == null)
            return false;

        context.Classes.Remove(existingClass);
        await context.SaveChangesAsync(cancellationToken);
        return true;
    }
}