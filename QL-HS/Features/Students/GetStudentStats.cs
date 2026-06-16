using MediatR;
using Microsoft.EntityFrameworkCore;
using QL_HS.Data;

namespace QL_HS.Features.Students;

// 1. Định nghĩa DTO kết quả trả về (Thêm ClassStats để lưu dữ liệu biểu đồ cột)
public record ClassStatDto(string ClassName, int StudentCount);
public record StudentStatsResponse(
    int TotalStudents, 
    int TotalClasses, 
    Dictionary<string, int> AcademicPerformance,
    List<ClassStatDto> ClassStatistics // Cột dữ liệu mới cho biểu đồ lớp
);

// 2. Định nghĩa Query
public record GetStudentStatsQuery : IRequest<StudentStatsResponse>;

// 3. Handler xử lý logic nâng cao
public class GetStudentStatsQueryHandler(AppDbContext context) : IRequestHandler<GetStudentStatsQuery, StudentStatsResponse>
{
    public async Task<StudentStatsResponse> Handle(GetStudentStatsQuery request, CancellationToken cancellationToken)
    {
        // Đếm tổng số lượng tổng quan
        var totalStudents = await context.Students.CountAsync(cancellationToken);
        var totalClasses = await context.Classes.CountAsync(cancellationToken);

        // --- BIỂU ĐỒ 1: LOGIC PHÂN LOẠI HỌC LỰC ---
        var scores = await context.Students
            .AsNoTracking()
            .Select(s => s.AverageScore)
            .ToListAsync(cancellationToken);

        int good = 0; int fair = 0; int average = 0;
        foreach (var score in scores)
        {
            if (score >= 8.0) good++;
            else if (score >= 6.5) fair++;
            else average++;
        }

        var performanceDict = new Dictionary<string, int>
        {
            { "Giỏi", good },
            { "Khá", fair },
            { "Trung bình", average }
        };

        // --- BIỂU ĐỒ 2: LOGIC THỐNG KÊ SỐ SINH VIÊN THEO TỪNG LỚP ---
        // Sử dụng LINH GroupBy để đếm số lượng sinh viên theo ClassId, sau đó lấy ra ClassName tương ứng
        var classStatistics = await context.Classes
            .AsNoTracking()
            .Select(c => new ClassStatDto(
                c.ClassName,
                c.Students.Count // EF Core tự động map số lượng sinh viên thuộc lớp này
            ))
            .ToListAsync(cancellationToken);

        return new StudentStatsResponse(totalStudents, totalClasses, performanceDict, classStatistics);
    }
}