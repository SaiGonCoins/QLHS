using MediatR;
using Microsoft.EntityFrameworkCore;
using MiniExcelLibs;
using QL_HS.Data;

namespace QL_HS.Features.Students;

// 1. Thêm tham số Guid? ClassId vào Query để nhận bộ lọc từ Endpoint truyền xuống
public record ExportStudentsQuery(Guid? ClassId = null) : IRequest<byte[]>;

public class ExportStudentsQueryHandler(AppDbContext context) : IRequestHandler<ExportStudentsQuery, byte[]>
{
    public async Task<byte[]> Handle(ExportStudentsQuery request, CancellationToken cancellationToken)
    {
        // 2. Tạo một IQueryable cơ bản bao gồm bảng Students và liên kết bảng Class
        var query = context.Students
            .Include(s => s.Class)
            .AsNoTracking();

        // 3. XỬ LÝ LOGIC LỌC DỮ LIỆU:
        // Nếu request.ClassId có giá trị (khác null), hệ thống sẽ lọc theo đúng ID lớp đó.
        // Nếu request.ClassId bằng null (chọn Tất cả các lớp), câu lệnh Where này sẽ được bỏ qua -> Lấy hết.
        if (request.ClassId.HasValue)
        {
            query = query.Where(s => s.ClassId == request.ClassId.Value);
        }

        // 4. Thực thi lấy dữ liệu xuống bộ nhớ RAM
        var students = await query.ToListAsync(cancellationToken);

        // Định dạng lại các cột hiển thị đẹp mắt trong file Excel
        var excelData = students.Select((s, index) => new
        {
            STT = index + 1,
            MaSinhVien = s.Id.ToString(),
            HoVaTen = s.Name,
            Tuoi = s.Age,
            LopHoc = s.Class?.ClassName ?? "Chưa xếp lớp",
            DiemTrungBinh = s.AverageScore
        });

        // Ghi dữ liệu vào bộ nhớ Stream và chuyển thành mảng byte
        using var memoryStream = new MemoryStream();
        memoryStream.SaveAs(excelData);
        return memoryStream.ToArray();
    }
}