// Import thư viện Carter để sử dụng module routing
using Carter;
// Import MediatR để xử lý mediator pattern cho CQRS
using MediatR;
// Import Entity Framework Core cho database context
using Microsoft.EntityFrameworkCore;
// Import JWT Bearer authentication
using Microsoft.AspNetCore.Authentication.JwtBearer;
// Import identity model cho xác thực
using Microsoft.IdentityModel.Tokens;
// Import ASP.NET Core Identity cho password hashing
using Microsoft.AspNetCore.Identity;
// Import Encoding để mã hóa chuỗi thành byte cho JWT key
using System.Text;
// Import MongoDB Driver
using MongoDB.Driver;
// Import FluentValidation cho validation
using FluentValidation;
// Import AppDbContext từ namespace Data
using QL_HS.Data;
// Import Models chứa các entity
using QL_HS.Models;
// Import Services chứa các service
using QL_HS.Services;

// Tạo web application builder từ cấu hình mặc định
var builder = WebApplication.CreateBuilder(args);

// Thêm dịch vụ Carter cho module routing
// Thêm Swagger cho API documentation
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddCarter();

// =========================================================================
// CẤU HÌNH NHẬN DIỆN ENUM DẠNG CHỮ (STRING) TRONG JSON
// =========================================================================
// Cấu hình cho Minimal APIs (Các endpoints map trực tiếp bằng MapPost, MapGet, Carter...)
builder.Services.ConfigureHttpJsonOptions(options =>
{
    options.SerializerOptions.Converters.Add(new System.Text.Json.Serialization.JsonStringEnumConverter());
});

// Cấu hình dự phòng cho Controllers truyền thống (Nếu dự án của bạn có dùng)
builder.Services.AddControllers().AddJsonOptions(options =>
{
    options.JsonSerializerOptions.Converters.Add(new System.Text.Json.Serialization.JsonStringEnumConverter());
});

// Cấu hình CORS cho phép React frontend gọi API
builder.Services.AddCors(options =>
{
    // Thêm policy với tên "ReactApp"
    options.AddPolicy("ReactApp", policy =>
    {
        // Cho phép origin từ React dev server
        policy.WithOrigins("http://localhost:5174", "http://localhost:5173")
            // Cho phép các header bất kỳ
              .AllowAnyHeader()
            // Cho phép các method bất kỳ
              .AllowAnyMethod();
    });
});

// Cấu hình kết nối PostgreSQL sử dụng connection string từ appsettings.json
builder.Services.AddDbContext<AppDbContext>(options =>
    // Sử dụng provider Npgsql cho PostgreSQL
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

// Register MediatR services cho mediator pattern
builder.Services.AddMediatR(config =>
{
    // Đăng ký tất cả handlers từ assembly Program
    config.RegisterServicesFromAssembly(typeof(Program).Assembly);
});

// Đăng ký FluentValidation cho tất cả validators trong assembly
builder.Services.AddValidatorsFromAssembly(typeof(Program).Assembly);

// Đăng ký HttpContextAccessor để inject IHttpContextAccessor
builder.Services.AddHttpContextAccessor();

// Đăng ký singleton JwtTokenService - tạo JWT token
builder.Services.AddSingleton<IJwtTokenService, JwtTokenService>();

// =====================================================================
// CẤU HÌNH MONGODB — Dùng để lưu AuditLog
// - MongoClient: nên là SINGLETON (đã có connection pool bên trong).
// - IMongoDatabase: cũng singleton, an toàn vì MongoClient quản lý thread-safe.
// - IAuditService: singleton vì không giữ per-request state.
// =====================================================================
builder.Services.Configure<MongoSettings>(builder.Configuration.GetSection("Mongo"));

builder.Services.AddSingleton<IMongoClient>(serviceProvider =>
{
    var settings = builder.Configuration.GetSection("Mongo").Get<MongoSettings>()
                   ?? new MongoSettings { ConnectionString = "mongodb://localhost:27017" };
    return new MongoClient(settings.ConnectionString);
});

builder.Services.AddSingleton<IMongoDatabase>(serviceProvider =>
{
    var client = serviceProvider.GetRequiredService<IMongoClient>();
    var settings = builder.Configuration.GetSection("Mongo").Get<MongoSettings>()
                   ?? new MongoSettings();
    return client.GetDatabase(settings.DatabaseName);
});

builder.Services.AddSingleton<IAuditService, AuditService>();

// Cấu hình JWT Authentication
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    // Thêm JWT Bearer với các tham số xác thực
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            // Xác thực Issuer của token
            ValidateIssuer = true,
            // Xác thực Audience của token
            ValidateAudience = true,
            // Xác thực thời gian hết hạn
            ValidateLifetime = true,
            // Xác thực khóa bí mật
            ValidateIssuerSigningKey = true,
            // Issuer hợp lệ từ config hoặc mặc định
            ValidIssuer = builder.Configuration["Jwt:Issuer"] ?? "QL_HS_Issuer",
            // Audience hợp lệ từ config hoặc mặc định
            ValidAudience = builder.Configuration["Jwt:Audience"] ?? "QL_HS_Audience",
            // Khóa bí mật để ký token - mã hóa UTF8 thành byte
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(
                builder.Configuration["Jwt:Key"] ?? "Key_Bao_Mat_Cho_JWT_AhauwhduawhdauhdwoiahdoiawhdIAHDOawhdowahOWIHD")),
            ClockSkew = TimeSpan.Zero
        };
    });

// Cấu hình Authorization policies - chính sách phân quyền
builder.Services.AddAuthorization(options =>
{
    // Chỉ cho phép role Admin truy cập
    options.AddPolicy("AdminOnly", policy => policy.RequireRole("Admin"));
    // Cho phép role Teacher hoặc Admin truy cập
    options.AddPolicy("TeacherOrAdmin", policy => policy.RequireRole("Teacher", "Admin"));
    // Chỉ cho phép role Student truy cập
    options.AddPolicy("StudentOnly", policy => policy.RequireRole("Student"));
});

// Tạo application từ builder đã cấu hình
var app = builder.Build();

// Kích hoạt CORS middleware
app.UseCors("ReactApp");

// Global Exception Handler - xử lý ngoại lệ toàn cục
app.Use(async (context, next) =>
{
    // Bắt đầu pipeline xử lý request
    try
    {
        // Tiếp tục middleware tiếp theo
        await next();
    }
    // Xử lý lỗi 401 - Unauthorized
    catch (UnauthorizedAccessException)
    {
        context.Response.StatusCode = StatusCodes.Status401Unauthorized;
        await context.Response.WriteAsJsonAsync(new { Error = "Không có quyền truy cập." });
    }
    // Xử lý lỗi 400 - Bad Request
    catch (InvalidOperationException ex)
    {
        context.Response.StatusCode = StatusCodes.Status400BadRequest;
        await context.Response.WriteAsJsonAsync(new { Error = ex.Message });
    }
    // Xử lý lỗi validation
    catch (ValidationException ex)
    {
        context.Response.StatusCode = StatusCodes.Status400BadRequest;
        await context.Response.WriteAsJsonAsync(new { Error = ex.Message });
    }
});

// Kích hoạt Authentication middleware
app.UseAuthentication();
// Kích hoạt Authorization middleware
app.UseAuthorization();

// Áp dụng các routes từ các Carter module
app.MapCarter();

// Kích hoạt Swagger UI
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// Kiểm tra kết nối database
using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        try
        {
            dbContext.Database.Migrate();
            Console.WriteLine("Kết nối database và migrate thành công!");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Kết nối database thất bại: {ex.Message}");
        }
}

app.Run();