using FluentValidation;
using MediatR;
using QL_HS.Data;
using QL_HS.Models;

namespace QL_HS.Features.Teachers;

public record UpdateTeacherCommand(
    Guid Id,
    string FullName,
    string? Phone,
    string? Specialization,
    bool IsActive,
    string? ModifiedBy
) : IRequest<bool>;

public class UpdateTeacherCommandValidator : AbstractValidator<UpdateTeacherCommand>
{
    public UpdateTeacherCommandValidator()
    {
        RuleFor(x => x.Id).NotEmpty();
        RuleFor(x => x.FullName)
            .NotEmpty().MaximumLength(100);

        RuleFor(x => x.Phone)
            .MaximumLength(15)
            .Matches(@"^[0-9+\-\s]*$")
            .WithMessage("Số điện thoại không hợp lệ.");

        RuleFor(x => x.Specialization)
            .MaximumLength(100);
    }
}

public class UpdateTeacherCommandHandler(AppDbContext context) : IRequestHandler<UpdateTeacherCommand, bool>
{
    public async Task<bool> Handle(UpdateTeacherCommand request, CancellationToken cancellationToken)
    {
        var teacher = await context.Teachers.FindAsync([request.Id], cancellationToken);
        if (teacher is null) return false;

        teacher.FullName = request.FullName.Trim();
        teacher.Phone = request.Phone;
        teacher.Specialization = request.Specialization;
        teacher.IsActive = request.IsActive;
        teacher.ModifiedBy = request.ModifiedBy;
        teacher.ModifiedAt = DateTime.UtcNow;

        await context.SaveChangesAsync(cancellationToken);
        return true;
    }
}
