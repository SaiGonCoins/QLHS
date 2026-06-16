using MediatR;
using QL_HS.Data;

namespace QL_HS.Features.Grades;

public record DeleteGradeCommand(Guid Id) : IRequest<bool>;

public class DeleteGradeCommandHandler(AppDbContext context) : IRequestHandler<DeleteGradeCommand, bool>
{
    public async Task<bool> Handle(DeleteGradeCommand request, CancellationToken cancellationToken)
    {
        var grade = await context.Grades.FindAsync([request.Id], cancellationToken);
        if (grade is null) return false;

        context.Grades.Remove(grade);
        await context.SaveChangesAsync(cancellationToken);
        return true;
    }
}
