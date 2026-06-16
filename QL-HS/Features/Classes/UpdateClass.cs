using MediatR;
using QL_HS.Data;
using QL_HS.Models;

namespace QL_HS.Features.Classes;

public record UpdateClassCommand(Guid Id, string ClassName) : IRequest<bool>;

public class UpdateClassCommandHandler(AppDbContext context) : IRequestHandler<UpdateClassCommand, bool>
{
    public async Task<bool> Handle(UpdateClassCommand request, CancellationToken cancellationToken)
    {
        var existingClass = await context.Classes.FindAsync([request.Id], cancellationToken);
        if (existingClass == null)
            return false;

        existingClass.ClassName = request.ClassName;
        await context.SaveChangesAsync(cancellationToken);
        return true;
    }
}