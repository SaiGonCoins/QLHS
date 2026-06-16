using MediatR;
using Microsoft.EntityFrameworkCore;
using QL_HS.Data;
using QL_HS.Features.Teachers;
using QL_HS.Models;

namespace QL_HS.Features.Teachers;

public record GetTeachersQuery : IRequest<List<TeacherDto>>;

public class GetTeachersQueryHandler(AppDbContext context) : IRequestHandler<GetTeachersQuery, List<TeacherDto>>
{
    public async Task<List<TeacherDto>> Handle(GetTeachersQuery request, CancellationToken cancellationToken)
    {
        return await context.Teachers
            .AsNoTracking()
            .OrderByDescending(t => t.CreatedAt)
            .Select(t => new TeacherDto(
                t.Id,
                t.FullName,
                t.Phone,
                t.Specialization,
                t.IsActive,
                t.CreatedBy,
                t.CreatedAt,
                t.ModifiedBy,
                t.ModifiedAt
            ))
            .ToListAsync(cancellationToken);
    }
}
