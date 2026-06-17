using DevExpress.Spreadsheet;
using MediatR;
using Microsoft.EntityFrameworkCore;
using QL_HS.Data;

namespace QL_HS.Features.Students;

public record ExportStudentsQuery(Guid? ClassId = null) : IRequest<byte[]>;

public class ExportStudentsQueryHandler(AppDbContext context) : IRequestHandler<ExportStudentsQuery, byte[]>
{
    public async Task<byte[]> Handle(ExportStudentsQuery request, CancellationToken cancellationToken)
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

        using var memoryStream = new MemoryStream();
        using var workbook = new Workbook();

        var sheet = workbook.Worksheets[0];
        sheet.Name = "SinhVien";

        var headers = new[]
        {
            "STT",
            "MaSinhVien",
            "HoVaTen",
            "Tuoi",
            "LopHoc",
            "DiemTrungBinh"
        };

        for (var i = 0; i < headers.Length; i++)
        {
            sheet.Cells[0, i].Value = headers[i];
        }

        for (var i = 0; i < students.Count; i++)
        {
            var student = students[i];
            var rowIndex = i + 1;

            sheet.Cells[rowIndex, 0].Value = i + 1;
            sheet.Cells[rowIndex, 1].Value = student.Id.ToString();
            sheet.Cells[rowIndex, 2].Value = student.Name;
            sheet.Cells[rowIndex, 3].Value = student.Age;
            sheet.Cells[rowIndex, 4].Value = student.Class?.ClassName ?? "Chưa xếp lớp";
            sheet.Cells[rowIndex, 5].Value = student.AverageScore;
        }

        sheet.Columns["A"].Width = 10;
        sheet.Columns["B"].Width = 38;
        sheet.Columns["C"].Width = 30;
        sheet.Columns["D"].Width = 12;
        sheet.Columns["E"].Width = 24;
        sheet.Columns["F"].Width = 18;

        workbook.SaveDocument(memoryStream, DocumentFormat.Xlsx);

        return memoryStream.ToArray();
    }
}