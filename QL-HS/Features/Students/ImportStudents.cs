using MediatR;
using Microsoft.EntityFrameworkCore;
using MiniExcelLibs;
using QL_HS.Data;
using QL_HS.Models;

namespace QL_HS.Features.Students;

// 1. Định nghĩa cấu trúc các cột Excel để map dữ liệu (Đảm bảo class này nằm ĐÚNG ở đây)
public class StudentImportRow
{
    public string HoVaTen { get; set; } = string.Empty;
    public int Tuoi { get; set; }
    public string TenLop { get; set; } = string.Empty;
    public double DiemTrungBinh { get; set; }
}

// 2. Record nhận Command từ Endpoint
public record ImportStudentsCommand(Stream FileStream, string Extension) : IRequest<int>;

// 3. Class Handler xử lý logic đọc file và lưu Database
public class ImportStudentsCommandHandler(AppDbContext context) : IRequestHandler<ImportStudentsCommand, int>
{
    public async Task<int> Handle(ImportStudentsCommand request, CancellationToken cancellationToken)
    {
        var excelType = request.Extension == ".csv" ? ExcelType.CSV : ExcelType.XLSX;
        var rows = request.FileStream.Query<StudentImportRow>(excelType: excelType).ToList();
        if (!rows.Any()) return 0;

        try
        {
            using var transaction = await context.Database.BeginTransactionAsync(cancellationToken);

            var classes = await context.Classes.ToListAsync(cancellationToken);
            var studentsToAdd = new List<Student>();

            foreach (var row in rows)
            {
                if (string.IsNullOrWhiteSpace(row.HoVaTen) || string.IsNullOrWhiteSpace(row.TenLop)) continue;

                var targetClass = classes.FirstOrDefault(c => c.ClassName.Trim().ToLower() == row.TenLop.Trim().ToLower());
                if (targetClass == null)
                {
                    targetClass = new Class { Id = Guid.NewGuid(), ClassName = row.TenLop.Trim() };
                    context.Classes.Add(targetClass);
                    classes.Add(targetClass);
                }

                var student = new Student
                {
                    Id = Guid.NewGuid(),
                    Name = row.HoVaTen.Trim(),
                    Age = row.Tuoi,
                    ClassId = targetClass.Id,
                    AverageScore = row.DiemTrungBinh
                };
                studentsToAdd.Add(student);

         
            }

            if (studentsToAdd.Any())
            {
                await context.Students.AddRangeAsync(studentsToAdd, cancellationToken);
                await context.SaveChangesAsync(cancellationToken);
            }

            await transaction.CommitAsync(cancellationToken);
            return studentsToAdd.Count;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[ImportStudents] Loi import: {ex.Message}");
            throw;
        }
    }
}