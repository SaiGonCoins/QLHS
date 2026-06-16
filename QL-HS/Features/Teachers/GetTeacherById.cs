using MediatR;
using Microsoft.EntityFrameworkCore;
using QL_HS.Data;
using QL_HS.Features.Teachers;
using QL_HS.Models;

namespace QL_HS.Features.Teachers;

public record GetTeacherByIdQuery(Guid Id) : IRequest<TeacherDto?>;

public class GetTeacherByIdQueryHandler(AppDbContext context) : IRequestHandler<GetTeacherByIdQuery, TeacherDto?>
{
    public async Task<TeacherDto?> Handle(GetTeacherByIdQuery request, CancellationToken cancellationToken)
    {
        var teacher = await context.Teachers
            .AsNoTracking()
            .FirstOrDefaultAsync(t => t.Id == request.Id, cancellationToken);

        if (teacher is null) return null;

        return new TeacherDto(
            teacher.Id,
            teacher.FullName,
            teacher.Phone,
            teacher.Specialization,
            teacher.IsActive,
            teacher.CreatedBy,
            teacher.CreatedAt,
            teacher.ModifiedBy,
            teacher.ModifiedAt
        );
    }
}
