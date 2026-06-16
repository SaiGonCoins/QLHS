using MediatR;
using QL_HS.Data;

namespace QL_HS.Features.Students;

//Định nghĩa Request xóa sinh viên
public record DeleteStudentCommand(Guid Id) : IRequest<bool>;

// Handler xử lý xóa sinh viên
public class DeleteStudentCommandHandler(AppDbContext context) : IRequestHandler<DeleteStudentCommand, bool>
{
    public async Task<bool> Handle(DeleteStudentCommand request, CancellationToken cancellationToken)
    {
        var student = await context.Students.FindAsync(new object[] { request.Id }, cancellationToken);
        if (student is null) return false;

        context.Students.Remove(student);
        await context.SaveChangesAsync(cancellationToken);
        return true;
    }
}