using MongoDB.Driver;
using QL_HS.Models;

namespace QL_HS.Services;

// =====================================================================
// IAuditService: Hợp đồng nghiệp vụ ghi nhật ký hệ thống
// Thiết kế theo nguyên tắc:
//   - Service là SINGLETON (giữ connection pool tới MongoDB).
//   - InsertLogAsync trả Task ngay lập tức, không chờ MongoDB phản hồi
//     (fire-and-forget background) để API chính không bị blocking.
// =====================================================================

public interface IAuditService
{
    // Ghi log vào MongoDB dưới dạng tác vụ nền (non-blocking).
    // Trả về Task đã hoàn thành ngay khi enqueue — caller không cần await phần I/O.
    Task InsertLogAsync(AuditLog log);

    Task<List<AuditLog>> GetAllLogsAsync();
}
