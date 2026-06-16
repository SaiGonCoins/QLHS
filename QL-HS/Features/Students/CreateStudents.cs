using MediatR;
using QL_HS.Data;
using QL_HS.Models;

namespace QL_HS.Features.Students;
//Định nghĩa Request tạo mới học sinh
public record CreateStudentCommand(
    string Name,
    int Age, 
    Guid ClassId,
    double AverageScore
) : IRequest<Student>;

//Handler xử lý tạo mới học sinh vào PostgreSQL
public class CreateStudentCommandHandler(AppDbContext context) : IRequestHandler<CreateStudentCommand, Student>
{
    public async Task<Student> Handle(CreateStudentCommand request, CancellationToken cancellationToken)
    {
        var student = new Student
        {
            Id = Guid.NewGuid(),//Tự động tạo ID mới khóa chính
            Name = request.Name,
            Age = request.Age,
            ClassId = request.ClassId,
            AverageScore = request.AverageScore
        };

        context.Students.Add(student);
        await context.SaveChangesAsync(cancellationToken);

        return student;
    }
}