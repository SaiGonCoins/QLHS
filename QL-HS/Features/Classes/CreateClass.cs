using MediatR;
using QL_HS.Data;
using QL_HS.Models;

namespace QL_HS.Features.Classes;
//Định nghĩa Request tạo mới lớp học
public record CreateClassCommand(string ClassName) : IRequest<Class>;

public class CreateClassCommandHandler(AppDbContext context) : IRequestHandler<CreateClassCommand, Class>
{
    public async Task<Class> Handle(CreateClassCommand request, CancellationToken cancellationToken)
    {
        var newClass = new Class
        {
            Id = Guid.NewGuid(),
            ClassName = request.ClassName
        };

        context.Classes.Add(newClass);
        await context.SaveChangesAsync(cancellationToken);
        return newClass;
    }
}