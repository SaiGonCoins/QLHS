using MediatR;
using Microsoft.EntityFrameworkCore;
using QL_HS.Data;
using QL_HS.Models;

namespace QL_HS.Features.Students;

public record GetStudentByIdQuery(Guid Id) : IRequest<Student?>;

public class GetStudentByIdQueryHandler(AppDbContext context) : IRequestHandler<GetStudentByIdQuery, Student?>
{
    public async Task<Student?> Handle(GetStudentByIdQuery request, CancellationToken cancellationToken)
    {
        return await context.Students
            .Include(s => s.Class)
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.Id == request.Id, cancellationToken);
    }
}