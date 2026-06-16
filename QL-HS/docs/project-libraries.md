# Thư Viện Sử Dụng Trong Dự Án QL-HS

> Tài liệu liệt kê và giải thích tác dụng của các thư viện (NuGet Packages) đang được sử dụng trong dự án **QL-HS** (Quản Lý Học Sinh) — ASP.NET Core 10.

---

## 1. Tổng quan

Dự án sử dụng **.NET 10.0** (`net10.0`) với **Nullable Reference Types** và **Implicit Usings** được bật. Có tổng cộng **12 NuGet packages** chính, chia thành 5 nhóm chức năng:

| Nhóm | Số lượng | Mục đích |
|---|---|---|
| Web Framework & Routing | 2 | Minimal API + Module routing |
| CQRS & Validation | 2 | Mediator pattern + Input validation |
| ORM & Database | 2 | Entity Framework Core + PostgreSQL driver |
| Authentication & Security | 1 | JWT Bearer + Hashing |
| Mapping & Object | 1 | Object-to-object mapping |
| API Documentation | 1 | Swagger/OpenAPI |
| File Processing | 1 | Import/Export Excel |

---

## 2. Danh sách chi tiết các thư viện

### 2.1. BCrypt.Net-Next `v4.2.0`

```xml
<PackageReference Include="BCrypt.Net-Next" Version="4.2.0" />
```

| Thuộc tính | Giá trị |
|---|---|
| **Loại** | Security / Hashing |
| **Mục đích** | Băm mật khẩu an toàn (password hashing) |
| **Sử dụng tại** | `Features/Auth/Register.cs`, `Features/Auth/Login.cs` |

**Tác dụng cụ thể trong dự án:**
- `BCrypt.HashPassword(password, workFactor: 12)` — Hash mật khẩu với **salt tự sinh** và **workFactor = 12** (cân bằng giữa tốc độ và bảo mật).
- `BCrypt.Verify(password, hash)` — Xác thực mật khẩu người dùng nhập với hash lưu trong DB.
- Thay thế cho `Microsoft.AspNetCore.Identity` (không cần kéo cả Identity framework).
- Hash chuẩn 60 ký tự, format `$2a$12$...` hoặc `$2b$12$...`.

**Lý do chọn:** Chuẩn công nghiệp, chống brute-force, salt tự động nhúng vào hash (không cần cột salt riêng).

---

### 2.2. Carter `v10.0.0`

```xml
<PackageReference Include="Carter" Version="10.0.0" />
```

| Thuộc tính | Giá trị |
|---|---|
| **Loại** | Web Framework / Routing |
| **Mục đích** | Module-based routing cho Minimal API |
| **Sử dụng tại** | `Program.cs`, `Endpoints/AuthModule.cs`, `Endpoints/StudentModule.cs` |

**Tác dụng cụ thể trong dự án:**
- Cho phép tổ chức endpoints thành các **module** (class implement `ICarterModule`).
- `builder.Services.AddCarter()` — Đăng ký dịch vụ.
- `app.MapCarter()` — Áp dụng tất cả routes từ các module.
- Mỗi module định nghĩa `AddRoutes(IEndpointRouteBuilder app)` → nhóm endpoint theo tag (e.g. `MapGroup("/api/auth").WithTags("Authentication")`).

**Lý do chọn:** Giữ code Minimal API gọn gàng, phân tách rõ theo domain (Auth, Students, Classes...).

---

### 2.3. FluentValidation.DependencyInjectionExtensions `v12.1.1`

```xml
<PackageReference Include="FluentValidation.DependencyInjectionExtensions" Version="12.1.1" />
```

| Thuộc tính | Giá trị |
|---|---|
| **Loại** | Validation |
| **Mục đích** | Validate input bằng fluent API |
| **Sử dụng tại** | `Features/Auth/Register.cs` (`RegisterValidator`), `Features/Auth/Login.cs` (`LoginValidator`), `Infrastructure/ValidationFilter.cs` |

**Tác dụng cụ thể trong dự án:**
- Khai báo rule kiểm tra dữ liệu đầu vào theo fluent syntax:
  ```csharp
  RuleFor(x => x.Username).NotEmpty().MinimumLength(3).MaximumLength(50);
  RuleFor(x => x.Email).NotEmpty().EmailAddress();
  RuleFor(x => x.Password).NotEmpty().MinimumLength(6);
  ```
- `AddValidatorsFromAssembly(...)` — Tự động tìm và đăng ký tất cả validator trong assembly.
- Kết hợp với `WithValidation<TCommand>()` filter (custom) để tự động chạy validation trước khi vào handler.

**Lý do chọn:** Tách biệt logic validation khỏi handler, dễ đọc, dễ test, hỗ trợ rule phức tạp.

---

### 2.4. Mapster `v10.0.7`

```xml
<PackageReference Include="Mapster" Version="10.0.7" />
```

| Thuộc tính | Giá trị |
|---|---|
| **Loại** | Object Mapping |
| **Mục đích** | Chuyển đổi giữa các object (DTO ↔ Entity ↔ ViewModel) |
| **Sử dụng tại** | Đăng ký trong DI container, dùng trong handler/query |

**Tác dụng cụ thể trong dự án:**
- Map nhanh giữa `Command/Query` ↔ `Entity` ↔ `Result/DTO` mà không cần viết mapping thủ công.
- Hỗ trợ convention-based mapping (cùng tên field → tự map).
- Nhẹ hơn AutoMapper, không cần config phức tạp.

**Lý do chọn:** Hiệu năng cao, ít boilerplate, API đơn giản.

---

### 2.5. MediatR `v14.1.0`

```xml
<PackageReference Include="MediatR" Version="14.1.0" />
```

| Thuộc tính | Giá trị |
|---|---|
| **Loại** | CQRS / Mediator Pattern |
| **Mục đích** | Tách request/response khỏi handler |
| **Sử dụng tại** | Tất cả `Features/Auth/*.cs`, `Features/Students/*.cs`, `Features/Classes/*.cs` |

**Tác dụng cụ thể trong dự án:**
- `RegisterCommand : IRequest<RegisterResult>` — Định nghĩa command/query.
- `IRequestHandler<TCommand, TResult>` — Handler xử lý logic.
- `ISender` inject vào endpoint → `await mediator.Send(command)`.
- `AddMediatR(config => config.RegisterServicesFromAssembly(typeof(Program).Assembly))` — Đăng ký tất cả handler tự động.

**Pattern áp dụng:**
```
Endpoint → mediator.Send(Command) → Handler.Handle() → Result
```

**Lý do chọn:** Tách biệt rõ ràng transport layer (endpoint) và business logic (handler), dễ test, dễ mở rộng.

---

### 2.6. Microsoft.AspNetCore.Authentication.JwtBearer `v10.0.8`

```xml
<PackageReference Include="Microsoft.AspNetCore.Authentication.JwtBearer" Version="10.0.8" />
```

| Thuộc tính | Giá trị |
|---|---|
| **Loại** | Authentication / Security |
| **Mục đích** | Xác thực JWT Bearer token |
| **Sử dụng tại** | `Program.cs` (cấu hình `AddAuthentication(...).AddJwtBearer(...)`) |

**Tác dụng cụ thể trong dự án:**
- Middleware tự động parse header `Authorization: Bearer <token>`.
- Validate chữ ký (HS256), issuer, audience, lifetime.
- `TokenValidationParameters`:
  - `ValidateIssuer = true` — Kiểm tra `iss` claim.
  - `ValidateAudience = true` — Kiểm tra `aud` claim.
  - `ValidateLifetime = true` — Kiểm tra `exp` (token hết hạn).
  - `ValidateIssuerSigningKey = true` — Verify chữ ký với secret key.
  - `ClockSkew = TimeSpan.Zero` — Không có "khoan dung" thời gian mặc định.
- Extract claims → `HttpContext.User` cho Authorization middleware.

**Lý do chọn:** Chuẩn cho stateless API authentication.

---

### 2.7. Microsoft.AspNetCore.OpenApi `v10.0.8`

```xml
<PackageReference Include="Microsoft.AspNetCore.OpenApi" Version="10.0.8" />
```

| Thuộc tính | Giá trị |
|---|---|
| **Loại** | API Documentation |
| **Mục đích** | Hỗ trợ OpenAPI specification |
| **Sử dụng tại** | `Program.cs` (kết hợp với Swashbuckle để hiển thị Swagger UI) |

**Tác dụng cụ thể trong dự án:**
- Cung cấp metadata cho OpenAPI spec (cho Minimal API endpoints).
- Kết hợp với `Swashbuckle.AspNetCore` để sinh JSON schema và giao diện Swagger UI tại `/swagger`.

**Lý do chọn:** Chuẩn OpenAPI 3.0, tích hợp sâu với ASP.NET Core 10.

---

### 2.8. Microsoft.EntityFrameworkCore.Design `v10.0.8`

```xml
<PackageReference Include="Microsoft.EntityFrameworkCore.Design" Version="10.0.8">
  <IncludeAssets>runtime; build; native; contentfiles; analyzers; buildtransitive</IncludeAssets>
  <PrivateAssets>all</PrivateAssets>
</PackageReference>
```

| Thuộc tính | Giá trị |
|---|---|
| **Loại** | ORM (Design-time tools) |
| **Mục đích** | Hỗ trợ EF Core CLI (migration, scaffold) |
| **Sử dụng tại** | Lệnh `dotnet ef migrations add ...`, `dotnet ef database update` |

**Tác dụng cụ thể trong dự án:**
- `PrivateAssets="all"` — Không được pack vào output (chỉ dùng lúc dev/build).
- Cần thiết để chạy EF Core migrations.
- Tự động migrate khi app start (`dbContext.Database.Migrate()` trong `Program.cs`).

**Lý do chọn:** Chuẩn EF Core cho tooling.

---

### 2.9. MiniExcel `v1.44.1`

```xml
<PackageReference Include="MiniExcel" Version="1.44.1" />
```

| Thuộc tính | Giá trị |
|---|---|
| **Loại** | File Processing |
| **Mục đích** | Đọc/ghi file Excel (.xlsx, .csv) |
| **Sử dụng tại** | `Endpoints/StudentModule.cs` (export/import sinh viên) |

**Tác dụng cụ thể trong dự án:**
- **Export:** Tạo file Excel danh sách sinh viên (`/api/students/export`) — trả về `.xlsx` binary.
- **Import:** Đọc file Excel upload từ client (`/api/students/import`) → parse thành `Student` entities.
- Ưu điểm: **Không cần Office/Interop**, xử lý stream trực tiếp, ít tốn RAM hơn EPPlus/ClosedXML.

**Lý do chọn:** Lightweight, pure C#, không phụ thuộc thư viện native.

---

### 2.10. Npgsql.EntityFrameworkCore.PostgreSQL `v10.0.2`

```xml
<PackageReference Include="Npgsql.EntityFrameworkCore.PostgreSQL" Version="10.0.2" />
```

| Thuộc tính | Giá trị |
|---|---|
| **Loại** | ORM / Database Driver |
| **Mục đích** | Provider PostgreSQL cho Entity Framework Core |
| **Sử dụng tại** | `Program.cs` (`UseNpgsql(...)`), `Data/AppDbContext.cs` |

**Tác dụng cụ thể trong dự án:**
- `options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection"))` — Kết nối PostgreSQL.
- Connection string trong `appsettings.json`:
  ```
  Host=localhost;Database=ql_hocsinh;Username=postgres;Password=03032005
  ```
- Mapping C# types ↔ PostgreSQL types (Guid, DateTime, string, etc.).
- Hỗ trợ `HasConversion<string>()` để lưu enum dưới dạng text.

**Lý do chọn:** Provider chính thức, hiệu năng cao, hỗ trợ đầy đủ tính năng PostgreSQL.

---

### 2.11. Swashbuckle.AspNetCore `v10.2.1`

```xml
<PackageReference Include="Swashbuckle.AspNetCore" Version="10.2.1" />
```

| Thuộc tính | Giá trị |
|---|---|
| **Loại** | API Documentation |
| **Mục đích** | Sinh Swagger UI từ OpenAPI spec |
| **Sử dụng tại** | `Program.cs` (`AddSwaggerGen()`, `UseSwagger()`, `UseSwaggerUI()`) |

**Tác dụng cụ thể trong dự án:**
- `AddEndpointsApiExplorer()` + `AddSwaggerGen()` — Đăng ký dịch vụ sinh spec.
- `app.UseSwagger()` — Expose `/swagger/v1/swagger.json`.
- `app.UseSwaggerUI()` — Giao diện web test API tại `/swagger` (chỉ trong môi trường Development).

**Lý do chọn:** Công cụ document API phổ biến nhất cho .NET, hỗ trợ test trực tiếp trên browser.

---

## 3. Sơ đồ phụ thuộc

```
┌──────────────────────────────────────────────────────────────┐
│                    ASP.NET Core 10 (Web SDK)                  │
└──────────────────────────────────────────────────────────────┘
            │                │                │
            ▼                ▼                ▼
   ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐
   │   Carter    │  │   MediatR    │  │ JwtBearer        │
   │  (Routing)  │  │   (CQRS)     │  │  (Auth)          │
   └─────────────┘  └──────────────┘  └──────────────────┘
            │                │                │
            ▼                ▼                ▼
   ┌─────────────────────────────────────────────────┐
   │  FluentValidation   │   Mapster   │   BCrypt    │
   │  (Validate input)   │  (Mapping)  │  (Hash pwd) │
   └─────────────────────────────────────────────────┘
            │
            ▼
   ┌─────────────────────────────────────────────────┐
   │   EF Core (Npgsql Provider)   →   PostgreSQL    │
   └─────────────────────────────────────────────────┘
            │
            ▼
   ┌─────────────────────────────────────────────────┐
   │   Swashbuckle (Swagger UI)  │  MiniExcel (xlsx) │
   │   (Document API)            │  (Import/Export) │
   └─────────────────────────────────────────────────┘
```

---

## 4. Tóm tắt theo chức năng nghiệp vụ

| Nghiệp vụ | Thư viện sử dụng |
|---|---|
| **Routing / HTTP** | Carter, ASP.NET Core Minimal API |
| **Xử lý request (CQRS)** | MediatR |
| **Validate input** | FluentValidation |
| **Mapping DTO ↔ Entity** | Mapster |
| **Bảo mật (Auth + Hash)** | JwtBearer, BCrypt.Net-Next |
| **Database access** | EF Core, Npgsql.EntityFrameworkCore.PostgreSQL |
| **Document & test API** | Swashbuckle (Swagger UI), Microsoft.OpenApi |
| **Import/Export Excel** | MiniExcel |

---

## 5. Lưu ý khi cập nhật

1. **Không hard-code version** trong code → luôn khai báo trong `.csproj` để dễ quản lý.
2. **Tương thích .NET 10** — Tất cả packages đều đã có phiên bản tương thích (10.x).
3. **EF Core Design tools** — Cài thêm global tool: `dotnet tool install --global dotnet-ef`.
4. **Production** — Nên tách connection string và JWT key ra **User Secrets** hoặc **Environment Variables** thay vì giữ trong `appsettings.json`.

---

## 6. Tham khảo

- Tất cả packages được khai báo tại: `QL-HS.csproj`
- Connection string: `appsettings.json`
- Docker services (PostgreSQL, MongoDB, Redis): `docker-compose.yaml`
- Cấu hình JWT + DI: `Program.cs`
