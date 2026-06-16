using MediatR;
using Microsoft.EntityFrameworkCore;
using QL_HS.Data;

namespace QL_HS.Features.Grades;

public record GetGradesByStudentQuery(Guid StudentId) : IRequest<List<GradeDto>>;

public class GetGradesByStudentQueryHandler(AppDbContext context) : IRequestHandler<GetGradesByStudentQuery, List<GradeDto>>
{
    public async Task<List<GradeDto>> Handle(GetGradesByStudentQuery request, CancellationToken cancellationToken)
    {
        var grades = await context.Grades
            .Include(g => g.Student)
            .ThenInclude(s => s.Class)
            .AsNoTracking()
            .Where(g => g.StudentId == request.StudentId)
            .OrderByDescending(g => g.CreatedAt)
            .ToListAsync(cancellationToken);

        return grades.Select(g => new GradeDto(
            g.Id,
            g.StudentId,
            g.Student!.Name,
            g.Student.Class!.ClassName,
            g.SubjectName,
            g.ProgressScore,
            g.MidtermScore,
            g.FinalScore,
            g.Semester,
            g.SchoolYear,
            g.CreatedBy,
            g.CreatedAt,
            g.ModifiedBy,
            g.ModifiedAt
        )).ToList();
    }
}
