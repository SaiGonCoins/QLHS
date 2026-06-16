using FluentValidation;
using MediatR;
using QL_HS.Data;

namespace QL_HS.Features.Grades;

public record UpdateGradeCommand(
    Guid Id,
    Guid StudentId,
    string SubjectName,
    double? ProgressScore,
    double? MidtermScore,
    double? FinalScore,
    string Semester,
    string SchoolYear,
    string? ModifiedBy
) : IRequest<bool>;

public class UpdateGradeCommandValidator : AbstractValidator<UpdateGradeCommand>
{
    public UpdateGradeCommandValidator()
    {
        RuleFor(x => x.Id).NotEmpty();
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

public class UpdateGradeCommandHandler(AppDbContext context) : IRequestHandler<UpdateGradeCommand, bool>
{
    public async Task<bool> Handle(UpdateGradeCommand request, CancellationToken cancellationToken)
    {
        var grade = await context.Grades.FindAsync([request.Id], cancellationToken);
        if (grade is null) return false;

        grade.StudentId = request.StudentId;
        grade.SubjectName = request.SubjectName.Trim();
        grade.ProgressScore = request.ProgressScore;
        grade.MidtermScore = request.MidtermScore;
        grade.FinalScore = request.FinalScore;
        grade.Semester = request.Semester.Trim();
        grade.SchoolYear = request.SchoolYear.Trim();
        grade.ModifiedBy = request.ModifiedBy;
        grade.ModifiedAt = DateTime.UtcNow;

        await context.SaveChangesAsync(cancellationToken);
        return true;
    }
}
