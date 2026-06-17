using System.Globalization;
using System.Text;
using DevExpress.Spreadsheet;
using MediatR;
using Microsoft.EntityFrameworkCore;
using QL_HS.Data;
using QL_HS.Models;

namespace QL_HS.Features.Students;

public class StudentImportRow
{
    public string HoVaTen { get; set; } = string.Empty;
    public string TenLop { get; set; } = string.Empty;
    public int Tuoi { get; set; }
    public double DiemTrungBinh { get; set; }
    public int RowNumber { get; set; }
}

public record ImportStudentsCommand(Stream FileStream, string Extension) : IRequest<int>;

public class ImportStudentsCommandHandler(AppDbContext context) : IRequestHandler<ImportStudentsCommand, int>
{
    public async Task<int> Handle(ImportStudentsCommand request, CancellationToken cancellationToken)
    {
        if (request.FileStream.CanSeek)
        {
            request.FileStream.Seek(0, SeekOrigin.Begin);
        }

        using var workbook = new Workbook();
        workbook.LoadDocument(request.FileStream, GetDocumentFormat(request.Extension));

        var sheet = workbook.Worksheets[0];
        var usedRange = sheet.GetUsedRange();

        if (usedRange == null || usedRange.RowCount <= 0 || usedRange.ColumnCount <= 0)
        {
            return 0;
        }

        var hasHeader = HasHeaderRow(sheet, usedRange);
        var rows = ReadImportRows(sheet, usedRange, hasHeader);

        if (!rows.Any())
        {
            return 0;
        }

        using var transaction = await context.Database.BeginTransactionAsync(cancellationToken);

        var classes = await context.Classes.ToListAsync(cancellationToken);
        var studentsToAdd = new List<Student>();

        foreach (var row in rows)
        {
            if (string.IsNullOrWhiteSpace(row.HoVaTen) || string.IsNullOrWhiteSpace(row.TenLop))
            {
                continue;
            }

            if (row.Tuoi < 1 || row.Tuoi > 100)
            {
                throw new InvalidOperationException($"Dòng {row.RowNumber}: Tuổi phải từ 1 đến 100.");
            }

            if (row.DiemTrungBinh < 0 || row.DiemTrungBinh > 10)
            {
                throw new InvalidOperationException($"Dòng {row.RowNumber}: Điểm trung bình phải từ 0 đến 10.");
            }

            var targetClass = classes.FirstOrDefault(c =>
                c.ClassName.Trim().Equals(row.TenLop.Trim(), StringComparison.OrdinalIgnoreCase));

            if (targetClass == null)
            {
                targetClass = new Class
                {
                    Id = Guid.NewGuid(),
                    ClassName = row.TenLop.Trim()
                };

                context.Classes.Add(targetClass);
                classes.Add(targetClass);
            }

            studentsToAdd.Add(new Student
            {
                Id = Guid.NewGuid(),
                Name = row.HoVaTen.Trim(),
                Age = row.Tuoi,
                ClassId = targetClass.Id,
                AverageScore = row.DiemTrungBinh
            });
        }

        if (studentsToAdd.Any())
        {
            await context.Students.AddRangeAsync(studentsToAdd, cancellationToken);
            await context.SaveChangesAsync(cancellationToken);
        }

        await transaction.CommitAsync(cancellationToken);

        return studentsToAdd.Count;
    }

    private static DocumentFormat GetDocumentFormat(string extension)
    {
        return extension.ToLowerInvariant() switch
        {
            ".xlsx" => DocumentFormat.Xlsx,
            ".xls" => DocumentFormat.Xls,
            ".csv" => DocumentFormat.Csv,
            _ => throw new InvalidOperationException("Chỉ hỗ trợ file .xlsx, .xls, .csv.")
        };
    }

    private static List<StudentImportRow> ReadImportRows(Worksheet sheet, CellRange usedRange, bool hasHeader)
    {
        var rows = new List<StudentImportRow>();
        var startRow = hasHeader ? 1 : 0;

        var hoVaTenColumn = hasHeader
            ? FindColumn(sheet, usedRange, "HoVaTen", "Họ Và Tên", "Tên Sinh Viên", "Name")
            : 0;

        var tenLopColumn = hasHeader
            ? FindColumn(sheet, usedRange, "LopHoc", "TenLop", "Lớp Học", "Class")
            : 1;

        var tuoiColumn = hasHeader
            ? FindColumn(sheet, usedRange, "Tuoi", "Tuổi", "Age")
            : 2;

        var diemTrungBinhColumn = hasHeader
            ? FindColumn(sheet, usedRange, "DiemTrungBinh", "Điểm Trung Bình", "ĐiểmTB", "AverageScore")
            : 3;

        if (hoVaTenColumn is null || tenLopColumn is null || tuoiColumn is null || diemTrungBinhColumn is null)
        {
            throw new InvalidOperationException("File Excel thiếu cột bắt buộc: Họ tên, Lớp, Tuổi, Điểm trung bình.");
        }

        for (var rowIndex = startRow; rowIndex < usedRange.RowCount; rowIndex++)
        {
            if (IsBlankRow(sheet, rowIndex, usedRange.ColumnCount))
            {
                continue;
            }

            rows.Add(new StudentImportRow
            {
                HoVaTen = GetText(sheet, rowIndex, hoVaTenColumn.Value),
                TenLop = GetText(sheet, rowIndex, tenLopColumn.Value),
                Tuoi = GetInt(sheet, rowIndex, tuoiColumn.Value, rowIndex + 1, "Tuổi"),
                DiemTrungBinh = GetDouble(sheet, rowIndex, diemTrungBinhColumn.Value, rowIndex + 1, "Điểm trung bình"),
                RowNumber = rowIndex + 1
            });
        }

        return rows;
    }

    private static bool HasHeaderRow(Worksheet sheet, CellRange usedRange)
    {
        if (usedRange.ColumnCount < 4)
        {
            return false;
        }

        var hasNameHeader = FindColumn(sheet, usedRange, "HoVaTen", "Họ Và Tên", "Tên Sinh Viên", "Name") != null;
        var hasClassHeader = FindColumn(sheet, usedRange, "LopHoc", "TenLop", "Lớp Học", "Class") != null;

        return hasNameHeader && hasClassHeader;
    }

    private static int? FindColumn(Worksheet sheet, CellRange usedRange, params string[] names)
    {
        for (var columnIndex = 0; columnIndex < usedRange.ColumnCount; columnIndex++)
        {
            var header = NormalizeHeader(GetText(sheet, 0, columnIndex));

            if (names.Any(name => NormalizeHeader(name) == header))
            {
                return columnIndex;
            }
        }

        return null;
    }

    private static bool IsBlankRow(Worksheet sheet, int rowIndex, int columnCount)
    {
        for (var columnIndex = 0; columnIndex < columnCount; columnIndex++)
        {
            if (!string.IsNullOrWhiteSpace(GetText(sheet, rowIndex, columnIndex)))
            {
                return false;
            }
        }

        return true;
    }

    private static string GetText(Worksheet sheet, int rowIndex, int columnIndex)
    {
        var value = sheet.Cells[rowIndex, columnIndex].Value;
        return value?.ToString()?.Trim() ?? string.Empty;
    }

    private static int GetInt(Worksheet sheet, int rowIndex, int columnIndex, int rowNumber, string columnName)
    {
        var text = GetText(sheet, rowIndex, columnIndex);

        if (string.IsNullOrWhiteSpace(text))
        {
            return 0;
        }

        if (!int.TryParse(text, NumberStyles.Any, CultureInfo.InvariantCulture, out var value) &&
            !int.TryParse(text, NumberStyles.Any, CultureInfo.CurrentCulture, out value))
        {
            throw new InvalidOperationException($"Dòng {rowNumber}: cột {columnName} phải là số nguyên.");
        }

        return value;
    }

    private static double GetDouble(Worksheet sheet, int rowIndex, int columnIndex, int rowNumber, string columnName)
    {
        var text = GetText(sheet, rowIndex, columnIndex);

        if (string.IsNullOrWhiteSpace(text))
        {
            return 0;
        }

        if (!double.TryParse(text, NumberStyles.Any, CultureInfo.InvariantCulture, out var value) &&
            !double.TryParse(text, NumberStyles.Any, CultureInfo.CurrentCulture, out value))
        {
            throw new InvalidOperationException($"Dòng {rowNumber}: cột {columnName} phải là số.");
        }

        return value;
    }

    private static string NormalizeHeader(string value)
    {
        var normalized = value
            .Normalize(NormalizationForm.FormD)
            .Where(ch => CharUnicodeInfo.GetUnicodeCategory(ch) != UnicodeCategory.NonSpacingMark)
            .Select(ch => char.ToLowerInvariant(ch))
            .ToArray();

        return new string(normalized)
            .Replace(" ", string.Empty)
            .Replace("_", string.Empty)
            .Replace("-", string.Empty)
            .Replace(".", string.Empty);
    }
}