# Luồng Đăng Ký, Đăng Nhập & Phân Quyền

> Tài liệu mô tả chi tiết luồng xác thực (Authentication) và phân quyền (Authorization) trong hệ thống **QL-HS** (Quản Lý Học Sinh) — ASP.NET Core 10 Minimal API + Carter + MediatR + JWT + BCrypt.

---

## 1. Tổng quan kiến trúc

```
┌──────────┐    HTTP/JSON     ┌──────────────────┐    MediatR     ┌──────────────┐
│  Client  │ ───────────────► │  AuthModule.cs   │ ─────────────► │  Handler     │
│ (React)  │                  │  (Carter/Route)  │                │ (CQRS)       │
└──────────┘                  └──────────────────┘                └──────┬───────┘
       ▲                                                               │
       │                                                               ▼
       │                                                       ┌──────────────┐
       │              JWT (Bearer)                             │  AppDbContext│
       └───────────────────────────────────────────────────── │  PostgreSQL  │
                                                               └──────────────┘
```

**Các thành phần chính:**

| Thành phần | File | Vai trò |
|---|---|---|
| Routing | `Endpoints/AuthModule.cs` | Map route `/api/auth/*` |
| Đăng ký | `Features/Auth/Register.cs` | Command + Validator + Handler (BCrypt) |
| Đăng nhập | `Features/Auth/Login.cs` | Command + Validator + Handler (BCrypt + JWT) |
| Model | `model/Account.cs`, `model/UserRole.cs` | Entity & enum role |
| JWT | `Services/JwtTokenService.cs` | Sinh token HS256 |
| Phân quyền | `Program.cs` (policies) + `[RequireAuthorization]` | Áp dụng policy cho endpoint |
| Database | PostgreSQL + EF Core (`AppDbContext.cs`) | Lưu trữ `Accounts` |

---

## 2. Enum phân quyền (`UserRole`)

Lưu trong DB dưới dạng **chuỗi** (string) nhờ cấu hình `HasConversion<string>()`.

```csharp
public enum UserRole
{
    Student = 0,   // Học sinh
    Teacher = 1,   // Giảng viên
    Admin   = 2    // Quản trị viên hệ thống
}
```

**Ma trận quyền theo role:**

| Endpoint | Student | Teacher | Admin |
|---|:---:|:---:|:---:|
| `GET /api/students` (danh sách) | ✅ | ✅ | ✅ |
| `GET /api/students/stats` | ✅ | ✅ | ✅ |
| `GET /api/students/export` | ✅ | ✅ | ✅ |
| `POST /api/students/` (tạo) | ❌ | ✅ | ✅ |
| `PUT /api/students/{id}` (sửa) | ❌ | ✅ | ✅ |
| `POST /api/students/import` | ❌ | ✅ | ✅ |
| `DELETE /api/students/{id}` | ❌ | ❌ | ✅ |

> Các policy `TeacherOrAdmin`, `AdminOnly`, `StudentOnly` được khai báo trong `Program.cs` (xem mục 6).

---

## 3. Luồng Đăng Ký (`POST /api/auth/register`)

### 3.1 Request

```json
{
  "Username": "adminnew",
  "Email": "adminnew@test.com",
  "Password": "123456",
  "Role": 2          // optional, mặc định Student = 0
}
```

### 3.2 Sơ đồ luồng

```
Client ──POST /api/auth/register──► AuthModule
                                      │
                                      ▼
                                FluentValidation (RegisterValidator)
                                  ├─ Username 3-50 ký tự
                                  ├─ Email hợp lệ
                                  └─ Password ≥ 6 ký tự
                                      │ (pass)
                                      ▼
                                MediatR → RegisterHandler
                                      │
                                      ▼
                                ┌──────────────────────────┐
                                │ 1. Check Username unique  │
                                │ 2. Check Email unique    │
                                │ 3. BCrypt.HashPassword   │  (workFactor = 12)
                                │ 4. INSERT Account        │
                                └──────────────────────────┘
                                      │
                                      ▼
                                Return 200 OK + RegisterResult
```

### 3.3 Xử lý lỗi

| Tình huống | HTTP | Body |
|---|---|---|
| Validation fail | 400 | `{ "Error": "..." }` |
| Username trùng | 400 | `{ "Error": "Tên đăng nhập đã tồn tại." }` |
| Email trùng | 400 | `{ "Error": "Email đã được sử dụng." }` |
| Thành công | 200 | `{ "Message": "Đăng ký thành công!", "Data": { Id, Username, Email, Role } }` |

### 3.4 Điểm bảo mật
- **BCrypt** với `workFactor = 12` (~250ms hash) — chống brute-force.
- **Salt tự sinh** và nhúng vào chuỗi hash, không lưu riêng.
- **Index unique** trên `Username` và `Email` ở DB (xem `AppDbContext.cs:36-41`).
- **Mật khẩu KHÔNG trả về** trong response (chỉ lưu `PasswordHash`).

---

## 4. Luồng Đăng Nhập (`POST /api/auth/login`)

### 4.1 Request

```json
{
  "UsernameOrEmail": "admin_hethong2",
  "Password": "123456"
}
```

> Endpoint chấp nhận **Username HOẶC Email** trong cùng một trường `UsernameOrEmail`.

### 4.2 Sơ đồ luồng

```
Client ──POST /api/auth/login──► AuthModule
                                  │
                                  ▼
                            FluentValidation (LoginValidator)
                              ├─ UsernameOrEmail không rỗng
                              └─ Password không rỗng
                                  │ (pass)
                                  ▼
                            MediatR → LoginHandler
                                  │
                                  ▼
                ┌─────────────────────────────────────┐
                │ 1. SELECT WHERE Username = ?       │
                │           OR Email    = ?          │
                │ 2. Nếu null → 401                  │
                │ 3. BCrypt.Verify(password, hash)   │
                │ 4. Verify fail → 401               │
                │ 5. JwtTokenService.GenerateToken() │
                └─────────────────────────────────────┘
                                  │
                                  ▼
                  Return 200 OK + { UserInfo, Token }
```

### 4.3 Response thành công (200)

```json
{
  "Message": "Đăng nhập thành công!",
  "Data": {
    "Id": "9b2c4f3a-...",
    "Username": "admin_hethong2",
    "Email": "admin2@school.edu.vn",
    "Role": 2,
    "Token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### 4.4 Cấu trúc JWT

- **Algorithm:** HS256
- **Issuer:** `Jwt:Issuer` (mặc định `QL_HS_Issuer`)
- **Audience:** `Jwt:Audience` (mặc định `QL_HS_Audience`)
- **Expires:** `DateTime.Now.AddHours(2)`
- **Claims:**
  - `sub` → `Account.Id` (GUID)
  - `ClaimTypes.Name` → `Account.Username`
  - `ClaimTypes.Role` → `Account.Role.ToString()` (e.g. `"Admin"`)
  - `jti` → GUID ngẫu nhiên

### 4.5 Xử lý lỗi

| Tình huống | HTTP | Body |
|---|---|---|
| Validation fail | 400 | `{ "Error": "..." }` |
| Không tìm thấy user | 401 | `{ "Error": "Tên đăng nhập hoặc email không tồn tại." }` |
| Sai mật khẩu | 401 | `{ "Error": "Mật khẩu không chính xác." }` |
| Hash lỗi định dạng | 401 | (catch `SaltParseException` → fail) |

---

## 5. Luồng xác thực cho các request sau đăng nhập

```
Client ──HTTP Request + Header "Authorization: Bearer <token>"──► API
                                                                       │
                                                                       ▼
                                                          JwtBearer Middleware
                                                          ├─ Validate Signature (HS256)
                                                          ├─ Validate Issuer
                                                          ├─ Validate Audience
                                                          ├─ Validate Lifetime
                                                          └─ Extract Claims → HttpContext.User
                                                                       │
                                                                       ▼
                                                          Authorization Middleware
                                                          └─ Kiểm tra Policy / Role
                                                                       │
                                                          ┌────────────┴────────────┐
                                                          │                         │
                                                       (allow)                  (deny)
                                                          │                         │
                                                       200/201                  401/403
```

> `ClockSkew = TimeSpan.Zero` — token hết hạn chính xác từng giây, không có "khoan dung" mặc định 5 phút.

---

## 6. Phân quyền — Policies & Áp dụng

### 6.1 Khai báo policies (`Program.cs:112-120`)

```csharp
builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("AdminOnly",       policy => policy.RequireRole("Admin"));
    options.AddPolicy("TeacherOrAdmin",  policy => policy.RequireRole("Teacher", "Admin"));
    options.AddPolicy("StudentOnly",     policy => policy.RequireRole("Student"));
});
```

Cơ chế: `RequireRole("Admin")` đối chiếu với claim `ClaimTypes.Role` đã được set trong JWT.

### 6.2 Áp dụng policy lên endpoint

Dùng extension `RequireAuthorization("PolicyName")` của Carter/Minimal API:

```csharp
// Endpoints/StudentModule.cs
group.MapPost("/", ...).RequireAuthorization("TeacherOrAdmin");
group.MapPut("/{id:guid}", ...).RequireAuthorization("TeacherOrAdmin");
group.MapDelete("/{id:guid}", ...).RequireAuthorization("AdminOnly");
```

### 6.3 Global Exception Handler (`Program.cs:128-155`)

Bắt và map exception → HTTP status:
- `UnauthorizedAccessException` → **401** `{ Error: "Không có quyền truy cập." }`
- `InvalidOperationException` → **400** `{ Error: ex.Message }`
- `ValidationException` (FluentValidation) → **400**

---

## 7. Bảo mật & Lưu ý vận hành

### 7.1 Cấu hình JWT key

Hiện tại key mặc định nằm hard-code trong `Program.cs:106`:
```
"Key_Bao_Mat_Cho_JWT_AhauwhduawhdauhdwoiahdoiawhdIAHDOawhdowahOWIHD"
```

**⚠️ CẢNH BÁO:** Production phải đặt qua biến môi trường hoặc secret manager:
```
Jwt:Key=<256-bit-key>
Jwt:Issuer=<your-issuer>
Jwt:Audience=<your-audience>
```

### 7.2 CORS
- Chỉ cho phép `http://localhost:5173`, `http://localhost:5174` (React dev).
- Production cần thay bằng domain thật.

### 7.3 Token hết hạn
- Hiện tại **không có** cơ chế refresh token.
- Hết 2h → client phải đăng nhập lại.
- Khuyến nghị: bổ sung `RefreshToken` table + endpoint `/api/auth/refresh`.

### 7.4 Endpoint mở (không yêu cầu auth)
- `POST /api/auth/register` — public
- `POST /api/auth/login` — public
- `GET /api/students` — public (cần xem xét)
- `GET /api/students/stats` — public
- `GET /api/students/export` — public
- `POST /api/students/import` — public (chưa có `RequireAuthorization`)

> ⚠️ Một số endpoint Students chưa được bảo vệ — nên xem xét thêm policy trong các sprint tới.

### 7.5 Logging & Audit
- `model/AuditLog.cs` đã có sẵn entity để ghi vết: `UserId, UserName, Action, TableName, Details, Timestamp`.
- DB có `DbSet<AuditLog>` — cần bổ sung middleware/handler ghi log khi thực hiện mutation (Create/Update/Delete).

---

## 8. Ví dụ test nhanh bằng file `.json` (đã có sẵn trong repo)

```bash
# Đăng ký admin
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d @register-admin.json

# Đăng nhập
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d @login-admin.json

# Gọi endpoint cần quyền
curl -X POST http://localhost:5000/api/students \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d @test-request.json
```

---

## 9. Sơ đồ tổng hợp một phiên làm việc

```
┌─────────┐                ┌─────────┐               ┌────────────┐
│  Login  │ ──(200 + JWT)─►│  Lưu    │ ──Bearer ───► │  Gọi API   │
│ Request │                │  token  │               │  có policy │
└─────────┘                └─────────┘               └─────┬──────┘
                                                           │
                              ┌────────────────────────────┴────────┐
                              │                                     │
                          (Token hợp lệ                        (Token sai/hết hạn
                           + đủ role)                           hoặc sai role)
                              │                                     │
                              ▼                                     ▼
                          200/201/204                       401 Unauthorized
                                                            /403 Forbidden
```

---

## 10. Tóm tắt các endpoint Auth

| Method | URL | Body | Mô tả | Auth |
|---|---|---|---|---|
| POST | `/api/auth/register` | `{Username, Email, Password, Role?}` | Tạo tài khoản mới (BCrypt hash) | Public |
| POST | `/api/auth/login` | `{UsernameOrEmail, Password}` | Xác thực + cấp JWT (2h) | Public |

---

**File liên quan cần đọc khi sửa/sinh code mới:**
- `Program.cs` — DI, JWT, CORS, Global Exception, Policies
- `Endpoints/AuthModule.cs` — Route mapping
- `Features/Auth/Register.cs` — Logic đăng ký
- `Features/Auth/Login.cs` — Logic đăng nhập
- `Services/JwtTokenService.cs` — Sinh JWT
- `model/Account.cs` + `model/UserRole.cs` — Entity & Enum
- `Data/AppDbContext.cs` — Cấu hình bảng & index
- `Endpoints/StudentModule.cs` — Ví dụ dùng `RequireAuthorization`
