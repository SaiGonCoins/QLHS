using MediatR;
using QL_HS.Data;
using QL_HS.Features.Teachers;
using QL_HS.Models;

namespace QL_HS.Features.Teachers;

public record DeleteTeacherCommand(Guid Id) : IRequest<bool>;

public class DeleteTeacherCommandHandler(AppDbContext context) : IRequestHandler<DeleteTeacherCommand, bool>
{
    public async Task<bool> Handle(DeleteTeacherCommand request, CancellationToken cancellationToken)
    {
        var teacher = await context.Teachers.FindAsync([request.Id], cancellationToken);
        if (teacher is null) return false;

        context.Teachers.Remove(teacher);
        await context.SaveChangesAsync(cancellationToken);
        return true;
    }
}
