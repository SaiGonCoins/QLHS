using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace QL_HS.Models;

// =====================================================================
// AuditLog: Bản ghi nhật ký hệ thống lưu trong MongoDB (collection "AuditLogs")
// Cấu trúc được thiết kế để hỗ trợ truy vấn theo: thời gian, người thực hiện,
// nhóm hành động, đối tượng bị tác động, đồng thời lưu trữ linh hoạt
// trạng thái cũ/mới của các trường bị thay đổi (Delta pattern).
// =====================================================================

public class AuditLog
{
    // ObjectId do MongoDB tự sinh — lưu dạng string để serialize/deserialize thuận tiện
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = ObjectId.GenerateNewId().ToString();

    // Thời điểm ghi log, luôn dùng UTC để tránh lệch múi giờ
    [BsonElement("timestamp")]
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;

    // Thông tin người thực hiện hành động (trích từ JWT/HttpContext)
    [BsonElement("actor")]
    public AuditActor Actor { get; set; } = new();

    // Nhóm hành động dùng để phân loại log theo nghiệp vụ lớn
    // Ví dụ: STUDENT_MANAGEMENT, ACCOUNT_MANAGEMENT, AUTHENTICATION
    [BsonElement("actionGroup")]
    public string ActionGroup { get; set; } = string.Empty;

    // Tên hành động cụ thể
    // Ví dụ: CREATE_STUDENT, UPDATE_STUDENT, DELETE_STUDENT, CHANGE_ROLE
    [BsonElement("actionName")]
    public string ActionName { get; set; } = string.Empty;

    // Đối tượng bị tác động bởi hành động
    [BsonElement("targetEntity")]
    public AuditTarget TargetEntity { get; set; } = new();

    // Chứa giá trị cũ/mới của các trường bị thay đổi + lý do
    [BsonElement("delta")]
    public AuditDelta Delta { get; set; } = new();
}

// ---------------------------------------------------------------------
// Actor: Người thực hiện hành động
// ---------------------------------------------------------------------
public class AuditActor
{
    [BsonElement("userId")]
    [BsonIgnoreIfNull]
    public Guid? UserId { get; set; }

    [BsonElement("username")]
    public string Username { get; set; } = string.Empty;

    [BsonElement("role")]
    public string Role { get; set; } = string.Empty;

    [BsonElement("ipAddress")]
    [BsonIgnoreIfNull]
    public string? IpAddress { get; set; }
}

// ---------------------------------------------------------------------
// TargetEntity: Đối tượng bị tác động
// ---------------------------------------------------------------------
public class AuditTarget
{
    // Tên entity nghiệp vụ: "Student", "Account", "Class"...
    [BsonElement("entityName")]
    public string EntityName { get; set; } = string.Empty;

    [BsonElement("entityId")]
    public Guid EntityId { get; set; }

    // Nhãn hiển thị để tra cứu nhanh trong UI log
    // Ví dụ: tên học sinh, username tài khoản
    [BsonElement("displayLabel")]
    public string DisplayLabel { get; set; } = string.Empty;
}

// ---------------------------------------------------------------------
// Delta: Bắt trọn trạng thái cũ/mới
// OldValues / NewValues dùng Dictionary<string, object> để linh hoạt
// cho mọi loại entity và trường thay đổi mà không cần định nghĩa schema cứng.
// ---------------------------------------------------------------------
public class AuditDelta
{
    [BsonElement("oldValues")]
    public Dictionary<string, object?> OldValues { get; set; } = new();

    [BsonElement("newValues")]
    public Dictionary<string, object?> NewValues { get; set; } = new();

    // Lý do cập nhật (optional) — do người dùng/handler cung cấp
    [BsonElement("reason")]
    [BsonIgnoreIfNull]
    public string? Reason { get; set; }
}
