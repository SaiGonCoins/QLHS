using MediatR;
using Microsoft.EntityFrameworkCore;
using QL_HS.Data;

namespace QL_HS.Features.Students;

public record ExportStudentsCsvQuery(Guid? ClassId = null) : IRequest<byte[]>;

public class ExportStudentsCsvQueryHandler(AppDbContext context) : IRequestHandler<ExportStudentsCsvQuery, byte[]>
{
    public async Task<byte[]> Handle(ExportStudentsCsvQuery request, CancellationToken cancellationToken)
    {
        var query = context.Students
            .Include(s => s.Class)
            .AsNoTracking();

        if (request.ClassId.HasValue)
        {
            query = query.Where(s => s.ClassId == request.ClassId.Value);
        }

        var students = await query
            .OrderBy(s => s.Name)
            .ToListAsync(cancellationToken);

        var sb = new System.Text.StringBuilder();

        sb.AppendLine("STT,MaSinhVien,HoVaTen,Tuoi,LopHoc,DiemTrungBinh");

        for (var i = 0; i < students.Count; i++)
        {
            var student = students[i];
            var stt = i + 1;
            var id = student.Id.ToString();
            var name = EscapeCsv(student.Name);
            var age = student.Age.ToString();
            var className = EscapeCsv(student.Class?.ClassName ?? "Chưa xếp lớp");
            var avgScore = student.AverageScore.ToString("0.00", System.Globalization.CultureInfo.InvariantCulture);

            sb.AppendLine($"{stt},{id},{name},{age},{className},{avgScore}");
        }

        var csv = sb.ToString();
        return new System.Text.UTF8Encoding(true).GetBytes(csv);
    }

    private static string EscapeCsv(string value)
    {
        if (value.Contains(',') || value.Contains('"') || value.Contains('\n') || value.Contains('\r'))
        {
            return $"\"{value.Replace("\"", "\"\"")}\"";
        }
        return value;
    }
}