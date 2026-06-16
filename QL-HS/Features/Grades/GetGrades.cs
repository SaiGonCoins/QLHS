using MediatR;
using Microsoft.EntityFrameworkCore;
using QL_HS.Data;

namespace QL_HS.Features.Grades;

public record PaginatedGradesResponse(
    List<GradeDto> Items,
    int TotalCount,
    int Page,
    int PageSize,
    int TotalPages
);

public record GetGradesQuery(
    Guid? StudentId = null,
    string? SubjectName = null,
    string? Semester = null,
    string? SchoolYear = null,
    int Page = 1,
    int PageSize = 10
) : IRequest<PaginatedGradesResponse>;

public class GetGradesQueryHandler(AppDbContext context) : IRequestHandler<GetGradesQuery, PaginatedGradesResponse>
{
    public async Task<PaginatedGradesResponse> Handle(GetGradesQuery request, CancellationToken cancellationToken)
    {
        var query = context.Grades
            .Include(g => g.Student)
            .ThenInclude(s => s.Class)
            .AsNoTracking()
            .AsQueryable();

        if (request.StudentId.HasValue && request.StudentId != Guid.Empty)
        {
            query = query.Where(g => g.StudentId == request.StudentId.Value);
        }

        if (!string.IsNullOrWhiteSpace(request.SubjectName))
        {
            var subject = request.SubjectName.Trim().ToLower();
            query = query.Where(g => g.SubjectName.ToLower().Contains(subject));
        }

        if (!string.IsNullOrWhiteSpace(request.Semester))
        {
            var semester = request.Semester.Trim();
            query = query.Where(g => g.Semester == semester);
        }

        if (!string.IsNullOrWhiteSpace(request.SchoolYear))
        {
            var year = request.SchoolYear.Trim();
            query = query.Where(g => g.SchoolYear == year);
        }

        var totalCount = await query.CountAsync(cancellationToken);

        var items = await query
            .OrderByDescending(g => g.CreatedAt)
            .Skip((request.Page - 1) * request.PageSize)
            .Take(request.PageSize)
            .ToListAsync(cancellationToken);

        var totalPages = (int)Math.Ceiling((double)totalCount / request.PageSize);

        var dtos = items.Select(g => new GradeDto(
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

        return new PaginatedGradesResponse(dtos, totalCount, request.Page, request.PageSize, totalPages);
    }
}
