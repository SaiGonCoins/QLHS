using FluentValidation;
using MediatR;
using QL_HS.Data;
using QL_HS.Models;

namespace QL_HS.Features.Grades;

public record CreateGradeCommand(
    Guid StudentId,
    string SubjectName,
    double? ProgressScore,
    double? MidtermScore,
    double? FinalScore,
    string Semester,
    string SchoolYear,
    string? CreatedBy
) : IRequest<Guid>;

public class CreateGradeCommandValidator : AbstractValidator<CreateGradeCommand>
{
    public CreateGradeCommandValidator()
    {
        RuleFor(x => x.StudentId).NotEmpty();
        RuleFor(x => x.SubjectName)
            .NotEmpty().WithMessage("Tên môn học là bắt buộc.")
            .MaximumLength(100);

        RuleFor(x => x.ProgressScore)
            .InclusiveBetween(0, 10).When(x => x.ProgressScore.HasValue)
            .WithMessage("Điểm quá trình phải từ 0 đến 10.");

        RuleFor(x => x.MidtermScore)
            .InclusiveBetween(0, 10).When(x => x.MidtermScore.HasValue)
            .WithMessage("Điểm giữa kỳ phải từ 0 đến 10.");

        RuleFor(x => x.FinalScore)
            .InclusiveBetween(0, 10).When(x => x.FinalScore.HasValue)
            .WithMessage("Điểm cuối kỳ phải từ 0 đến 10.");

        RuleFor(x => x.Semester)
            .NotEmpty().WithMessage("Học kỳ là bắt buộc.")
            .MaximumLength(20);

        RuleFor(x => x.SchoolYear)
            .NotEmpty().WithMessage("Năm học là bắt buộc.")
            .MaximumLength(20);
    }
}

public class CreateGradeCommandHandler(AppDbContext context) : IRequestHandler<CreateGradeCommand, Guid>
{
    public async Task<Guid> Handle(CreateGradeCommand request, CancellationToken cancellationToken)
    {
        var grade = new Grade
        {
            Id = Guid.NewGuid(),
            StudentId = request.StudentId,
            SubjectName = request.SubjectName.Trim(),
            ProgressScore = request.ProgressScore,
            MidtermScore = request.MidtermScore,
            FinalScore = request.FinalScore,
            Semester = request.Semester.Trim(),
            SchoolYear = request.SchoolYear.Trim(),
            CreatedBy = request.CreatedBy,
            CreatedAt = DateTime.UtcNow
        };

        context.Grades.Add(grade);
        await context.SaveChangesAsync(cancellationToken);

        return grade.Id;
    }
}
