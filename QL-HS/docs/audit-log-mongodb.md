# Hệ Thống Audit Log (MongoDB) — QL_HS

> Tài liệu mô tả cách triển khai **nhật ký hệ thống (Audit Logs)** lưu trữ vào **MongoDB** thay cho bảng `AuditLogs` trong PostgreSQL.

---

## 1. Kiến trúc tổng quan

```
┌─────────────────────┐    HTTP Request    ┌──────────────────────┐
│       Client        │ ─────────────────► │  Endpoint (Carter)  │
└─────────────────────┘                    └──────────┬───────────┘
                                                      │ MediatR
                                                      ▼
                                            ┌──────────────────────┐
                                            │  Command/Query       │
                                            │  Handler (Logic)     │
                                            └──────────┬───────────┘
                                                       │
                                ┌──────────────────────┴────────────────────┐
                                │                                           │
                                ▼                                           ▼
                     ┌──────────────────────┐                  ┌──────────────────────┐
                     │  AppDbContext (SQL)  │                  │  IAuditService       │
                     │  PostgreSQL (EF Core)│                  │  → MongoDB.Driver    │
                     │  Source of truth     │                  │  Fire-and-forget     │
                     └──────────────────────┘                  └──────────┬───────────┘
                                                                          │ Task.Run
                                                                          ▼
                                                                ┌──────────────────────┐
                                                                │  MongoDB             │
                                                                │  collection:         │
                                                                │  "AuditLogs"         │
                                                                └──────────────────────┘
```

**Đặc điểm chính:**
- **PostgreSQL** lưu trữ dữ liệu nghiệp vụ (Source of truth).
- **MongoDB** chỉ lưu log thay đổi (append-only) — không ảnh hưởng SQL.
- **Background Task** (non-blocking) — API response không phải chờ MongoDB.

---

## 2. Cấu trúc thư mục

```
QL-HS/
├── model/
│   └── AuditLog.cs                # Schema MongoDB (AuditLog, AuditActor, AuditTarget, AuditDelta)
├── Services/
│   ├── IAuditService.cs           # Hợp đồng nghiệp vụ
│   ├── AuditService.cs            # Triển khai ghi log non-blocking
│   ├── MongoSettings.cs           # POCO bind từ appsettings
│   ├── JwtTokenService.cs         # (đã có sẵn)
├── Features/
│   └── Students/
│       └── UpdateStudentCommand.cs # Ví dụ tích hợp MediatR + Audit
├── Data/
│   └── AppDbContext.cs            # ĐÃ XÓA DbSet<AuditLog>
├── Program.cs                     # Đăng ký MongoClient + AuditService
├── appsettings.json               # Section "Mongo"
└── QL-HS.csproj                   # Thêm package MongoDB.Driver
```

---

## 3. Schema AuditLog (MongoDB Document)

Ví dụ document lưu trong collection `AuditLogs`:

```json
{
  "_id": "6792a1b3c8f1e2d3a4b5c6d7",
  "timestamp": "2026-06-08T09:15:32.514Z",
  "actor": {
    "userId": "9b2c4f3a-1a2b-3c4d-5e6f-7a8b9c0d1e2f",
    "username": "admin_hethong2",
    "role": "Admin",
    "ipAddress": "192.168.1.10"
  },
  "actionGroup": "STUDENT_MANAGEMENT",
  "actionName": "UPDATE_STUDENT",
  "targetEntity": {
    "entityName": "Student",
    "entityId": "11111111-2222-3333-4444-555555555555",
    "displayLabel": "Nguyễn Văn A"
  },
  "delta": {
    "oldValues": {
      "Name": "Nguyễn Văn A",
      "Age": 16,
      "AverageScore": 7.5
    },
    "newValues": {
      "Name": "Nguyễn Văn B",
      "Age": 17,
      "AverageScore": 8.5
    },
    "reason": "Cập nhật theo yêu cầu phụ huynh"
  }
}
```

### 3.1 Các nhóm trường chính

| Nhóm | Mục đích |
|---|---|
| `_id`, `timestamp` | Khóa chính + thời gian sự kiện (UTC) |
| `actor` | **Ai** thực hiện (userId, username, role, IP) |
| `actionGroup` + `actionName` | **Hành động gì** ở mức nhóm + chi tiết |
| `targetEntity` | **Tác động lên đối tượng nào** (entity, id, label) |
| `delta` | **Dữ liệu thay đổi** (old → new + lý do) |

### 3.2 Gợi ý index trong MongoDB

```javascript
db.AuditLogs.createIndex({ "timestamp": -1 });
db.AuditLogs.createIndex({ "actor.userId": 1, "timestamp": -1 });
db.AuditLogs.createIndex({ "actionGroup": 1, "timestamp": -1 });
db.AuditLogs.createIndex({ "targetEntity.entityName": 1, "targetEntity.entityId": 1 });
```

---

## 4. Cấu hình & Đăng ký

### 4.1 `appsettings.json`

```json
{
  "Mongo": {
    "ConnectionString": "mongodb://root03032005@localhost:27017",
    "DatabaseName": "ql_hocsinh",
    "AuditCollection": "AuditLogs"
  }
}
```

### 4.2 `Program.cs` — Đăng ký DI

```csharp
using MongoDB.Driver;
using QL_HS.Services;

// Bind config
builder.Services.Configure<MongoSettings>(builder.Configuration.GetSection("Mongo"));

// MongoClient — SINGLETON (driver đã có connection pool bên trong)
builder.Services.AddSingleton<IMongoClient>(sp =>
{
    var settings = builder.Configuration.GetSection("Mongo").Get<MongoSettings>()
                   ?? new MongoSettings { ConnectionString = "mongodb://localhost:27017" };
    return new MongoClient(settings.ConnectionString);
});

builder.Services.AddSingleton<IMongoDatabase>(sp =>
{
    var client = sp.GetRequiredService<IMongoClient>();
    var settings = builder.Configuration.GetSection("Mongo").Get<MongoSettings>() ?? new MongoSettings();
    return client.GetDatabase(settings.DatabaseName);
});

// AuditService — Singleton vì không giữ per-request state
builder.Services.AddSingleton<IAuditService, AuditService>();
```

### 4.3 `docker-compose.yaml` — Mongo service

```yaml
mongo:
  image: mongo:latest
  container_name: qlhs_mongo
  restart: always
  environment:
    MONGO_INITDB_ROOT_USERNAME: root
    MONGO_INITDB_ROOT_PASSWORD: 03032005
    MONGO_INITDB_DATABASE: ql_hocsinh
  ports:
    - "27017:27017"
  volumes:
    - mongo_data:/var/lib/mongodb/data
```

---

## 5. Cách tích hợp vào Handler (MediatR)

### 5.1 Quy trình chuẩn

```csharp
public async Task<Student?> Handle(UpdateStudentCommand request, CancellationToken ct)
{
    // 1. Snapshot giá trị CŨ từ SQL
    var oldStudent = await _context.Students.FirstOrDefaultAsync(s => s.Id == request.Id, ct);
    if (oldStudent is null) return null;

    var oldSnapshot = Clone(oldStudent);

    // 2. Cập nhật entity (EF tracking)
    oldStudent.Name = request.Name;
    oldStudent.Age = request.Age;
    oldStudent.AverageScore = request.AverageScore;

    // 3. Lưu SQL
    await _context.SaveChangesAsync(ct);

    // 4. Trích xuất Actor từ JWT
    var actor = ExtractActor(_httpContextAccessor);

    // 5. So sánh Old vs New → Delta
    var (oldValues, newValues) = BuildDelta(oldSnapshot, oldStudent);

    // 6. Tạo log + đẩy sang MongoDB (background)
    await _auditService.InsertLogAsync(new AuditLog
    {
        Actor = actor,
        ActionGroup = "STUDENT_MANAGEMENT",
        ActionName = "UPDATE_STUDENT",
        TargetEntity = new AuditTarget
        {
            EntityName = nameof(Student),
            EntityId = oldStudent.Id,
            DisplayLabel = oldStudent.Name
        },
        Delta = new AuditDelta
        {
            OldValues = oldValues,
            NewValues = newValues,
            Reason = request.Reason
        }
    });

    return oldStudent;
}
```

### 5.2 Trích xuất Actor từ JWT

```csharp
private AuditActor ExtractActor()
{
    var user = _httpContextAccessor.HttpContext?.User;

    Guid? userId = null;
    var sub = user?.FindFirst(ClaimTypes.NameIdentifier)?.Value
              ?? user?.FindFirst("sub")?.Value;
    if (Guid.TryParse(sub, out var id)) userId = id;

    var username = user?.FindFirst(ClaimTypes.Name)?.Value ?? "anonymous";
    var role = user?.FindFirst(ClaimTypes.Role)?.Value ?? "Unknown";

    // IP: ưu tiên X-Forwarded-For (khi chạy sau proxy/load balancer)
    var http = _httpContextAccessor.HttpContext;
    var ip = http?.Request.Headers["X-Forwarded-For"].FirstOrDefault()?.Split(',')[0].Trim()
             ?? http?.Connection.RemoteIpAddress?.ToString();

    return new AuditActor { UserId = userId, Username = username, Role = role, IpAddress = ip };
}
```

### 5.3 So sánh Delta bằng Reflection

```csharp
private static (Dictionary<string, object?>, Dictionary<string, object?>) BuildDelta<T>(T oldObj, T newObj)
{
    var oldValues = new Dictionary<string, object?>();
    var newValues = new Dictionary<string, object?>();

    var props = typeof(T).GetProperties(BindingFlags.Public | BindingFlags.Instance)
        .Where(p => p.CanRead && p.CanWrite);

    foreach (var prop in props)
    {
        // Bỏ qua navigation property (object phức tạp)
        if (prop.PropertyType.IsClass && prop.PropertyType != typeof(string)) continue;

        var oldVal = prop.GetValue(oldObj);
        var newVal = prop.GetValue(newObj);
        if (!Equals(oldVal, newVal))
        {
            oldValues[prop.Name] = oldVal;
            newValues[prop.Name] = newVal;
        }
    }

    return (oldValues, newValues);
}
```

---

## 6. Cơ chế Non-blocking (Fire-and-Forget)

```csharp
// AuditService.cs
public Task InsertLogAsync(AuditLog log)
{
    // Đẩy toàn bộ I/O xuống ThreadPool — caller nhận Task.CompletedTask ngay
    _ = Task.Run(async () =>
    {
        try
        {
            log.Timestamp = DateTime.UtcNow;
            await _collection.InsertOneAsync(log);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Không thể ghi AuditLog. Action={Action}", log.ActionName);
            // Không throw — audit lỗi không được ảnh hưởng nghiệp vụ chính
        }
    });

    return Task.CompletedTask;
}
```

**Tại sao non-blocking?**
- API response trả về ngay cho client — không phải chờ MongoDB.
- Nếu MongoDB chậm/down → API chính vẫn hoạt động bình thường.
- Background log lỗi qua `ILogger` để giám sát.

**Lưu ý:**
- Nếu cần **audit chắc chắn** (compliance), có thể đổi sang Queue + Worker Service (RabbitMQ/Kafka).
- Hiện tại thiết kế ưu tiên **performance** hơn **durability** — phù hợp với hệ thống nội bộ.

---

## 7. Test nhanh

```bash
# 1. Khởi động MongoDB
docker-compose up -d mongo

# 2. Khởi động API
dotnet run

# 3. Đăng nhập lấy token
curl -X POST http://localhost:5204/api/auth/login \
  -H "Content-Type: application/json" \
  -d @login-admin.json
# → Lấy token từ response

# 4. Cập nhật học sinh (trigger audit log)
curl -X PUT http://localhost:5204/api/students/11111111-2222-3333-4444-555555555555 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "Id": "11111111-2222-3333-4444-555555555555",
    "Name": "Nguyễn Văn B",
    "Age": 17,
    "ClassId": "22222222-3333-4444-5555-666666666666",
    "AverageScore": 8.5,
    "Reason": "Test audit log"
  }'

# 5. Kiểm tra MongoDB
mongosh "mongodb://root03032005@localhost:27017/ql_hocsinh" \
  --eval "db.AuditLogs.find().sort({timestamp:-1}).limit(1).pretty()"
```

---

## 8. Mở rộng (tương lai)

| Tính năng | Cách triển khai |
|---|---|
| **Query API** | Thêm `IAuditQueryService` đọc collection `AuditLogs` với filter theo `actor`, `actionGroup`, date range |
| **Retention policy** | Dùng MongoDB TTL index trên `timestamp` để tự động xóa log cũ |
| **Async worker** | Chuyển sang BackgroundService + Channel<T> nếu cần đảm bảo delivery |
| **Multi-entity** | Tạo extension method `IAuditService.LogChange<T>` để chuẩn hóa cho mọi entity |
| **Enrichment** | Thêm field `correlationId` để trace xuyên suốt request → log → external system |

---

## 9. File đã thay đổi

| File | Trạng thái | Mô tả |
|---|---|---|
| `QL-HS.csproj` | Sửa | Thêm `MongoDB.Driver 3.0.0` |
| `model/AuditLog.cs` | Viết lại | Schema MongoDB (Actor, Target, Delta) |
| `Services/IAuditService.cs` | Tạo mới | Interface ghi log |
| `Services/AuditService.cs` | Tạo mới | Triển khai non-blocking |
| `Services/MongoSettings.cs` | Tạo mới | Bind config từ appsettings |
| `Features/Students/UpdateStudents.cs` | Xóa | Thay bằng file mới |
| `Features/Students/UpdateStudentCommand.cs` | Tạo mới | Command + Handler + Audit |
| `Data/AppDbContext.cs` | Sửa | Xóa `DbSet<AuditLog>` |
| `Program.cs` | Sửa | Đăng ký Mongo + AuditService |
| `appsettings.json` | Sửa | Thêm section `Mongo` |
| `Endpoints/StudentModule.cs` | Sửa | Đổi tên `UpdateStudents` → `UpdateStudentCommand` |

**Build status:** ✅ `Build succeeded. 0 Error(s)`
