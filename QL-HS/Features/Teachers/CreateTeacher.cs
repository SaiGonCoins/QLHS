using FluentValidation;
using MediatR;
using QL_HS.Data;
using QL_HS.Models;

namespace QL_HS.Features.Teachers;

public record CreateTeacherCommand(
    string FullName,
    string? Phone,
    string? Specialization,
    bool IsActive,
    string? CreatedBy
) : IRequest<CreateTeacherResult>;

public record CreateTeacherResult(Guid Id);

public class CreateTeacherCommandValidator : AbstractValidator<CreateTeacherCommand>
{
    public CreateTeacherCommandValidator()
    {
        RuleFor(x => x.FullName)
            .NotEmpty().WithMessage("Họ tên là bắt buộc.")
            .MaximumLength(100);

        RuleFor(x => x.Phone)
            .MaximumLength(15)
            .Matches(@"^[0-9+\-\s]*$")
            .WithMessage("Số điện thoại không hợp lệ.");

        RuleFor(x => x.Specialization)
            .MaximumLength(100);
    }
}

public class CreateTeacherCommandHandler(AppDbContext context) : IRequestHandler<CreateTeacherCommand, CreateTeacherResult>
{
    public async Task<CreateTeacherResult> Handle(CreateTeacherCommand request, CancellationToken cancellationToken)
    {
        var teacher = new Teacher
        {
            Id = Guid.NewGuid(),
            FullName = request.FullName.Trim(),
            Phone = request.Phone,
            Specialization = request.Specialization,
            IsActive = request.IsActive,
            CreatedBy = request.CreatedBy,
            CreatedAt = DateTime.UtcNow
        };

        context.Teachers.Add(teacher);
        await context.SaveChangesAsync(cancellationToken);

        return new CreateTeacherResult(teacher.Id);
    }
}
