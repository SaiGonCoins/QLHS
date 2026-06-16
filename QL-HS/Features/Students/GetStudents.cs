using MediatR;
using Microsoft.EntityFrameworkCore;
using QL_HS.Data;
using QL_HS.Models;

namespace QL_HS.Features.Students;

// 1. Định nghĩa Object trả về gồm danh sách SV và thông tin phân trang
public record PaginatedStudentsResponse(
    List<Student> Items, 
    int TotalCount, 
    int Page, 
    int PageSize, 
    int TotalPages
);

// 2. Định nghĩa Query nhận các bộ lọc từ URL
public record GetStudentsQuery(
    string? SearchTerm = null, 
    Guid? ClassId = null, // Có dấu ?
    int Page = 1, 
    int PageSize = 5
) : IRequest<PaginatedStudentsResponse>;
// 3. Handler xử lý lọc dữ liệu ngay từ Database
public class GetStudentsQueryHandler(AppDbContext context) : IRequestHandler<GetStudentsQuery, PaginatedStudentsResponse>
{
    public async Task<PaginatedStudentsResponse> Handle(GetStudentsQuery request, CancellationToken cancellationToken)
    {
        // Khởi tạo query từ bảng Students, nạp kèm thông tin bảng Class
        var query = context.Students.Include(s => s.Class).AsNoTracking().AsQueryable();

        // 🔍 Lọc theo tên (Nếu người dùng có nhập từ khóa)
        if (!string.IsNullOrWhiteSpace(request.SearchTerm))
        {
            var search = request.SearchTerm.Trim().ToLower();
            query = query.Where(s => s.Name.ToLower().Contains(search));
        }

        // 📂 Lọc theo lớp học (Nếu người dùng có chọn lớp cụ thể)
        if (request.ClassId.HasValue && request.ClassId != Guid.Empty)
        {
            query = query.Where(s => s.ClassId == request.ClassId.Value);
        }

        // 📊 Đếm tổng số sinh viên sau khi đã lọc (để tính tổng số trang)
        var totalCount = await query.CountAsync(cancellationToken);

        // 🚀 Thực hiện phân trang (Bỏ qua các trang trước và lấy số lượng vừa đủ)
        var items = await query
            .OrderBy(s => s.Name)
            .Skip((request.Page - 1) * request.PageSize)
            .Take(request.PageSize)
            .ToListAsync(cancellationToken);

        var totalPages = (int)Math.Ceiling((double)totalCount / request.PageSize);

        return new PaginatedStudentsResponse(items, totalCount, request.Page, request.PageSize, totalPages);
    }
}