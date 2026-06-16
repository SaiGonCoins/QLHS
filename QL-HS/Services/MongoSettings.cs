namespace QL_HS.Services;

// =====================================================================
// MongoSettings: POCO bind từ section "Mongo" trong appsettings.json
// - ConnectionString: Chuỗi kết nối tới MongoDB
// - DatabaseName: Tên database sử dụng (mặc định "ql_hocsinh")
// - AuditCollection: Tên collection lưu audit log (mặc định "AuditLogs")
// =====================================================================

public class MongoSettings
{
    public string ConnectionString { get; set; } = string.Empty;
    public string DatabaseName { get; set; } = "ql_hocsinh";
    public string AuditCollection { get; set; } = "AuditLogs";
}
