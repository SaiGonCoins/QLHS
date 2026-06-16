using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using QL_HS.Data;
using QL_HS.Models;
using BCryptNet = BCrypt.Net.BCrypt; // Import thư viện BCrypt thay cho Microsoft Identity

namespace QL_HS.Features.Auth;

// Command: Yêu cầu đăng ký tài khoản mới
public record RegisterCommand(
    string Username,
    string Email,
    string Password,
    UserRole Role = UserRole.Student
) : IRequest<RegisterResult>;

// Kết quả trả về sau khi đăng ký thành công
public record RegisterResult(
    Guid Id,
    string Username,
    string Email,
    UserRole Role
);

// Validator: Kiểm tra dữ liệu đầu vào hợp lệ
public class RegisterValidator : AbstractValidator<RegisterCommand>
{
    public RegisterValidator()
    {
        RuleFor(x => x.Username).NotEmpty().MinimumLength(3).MaximumLength(50);
        RuleFor(x => x.Email).NotEmpty().EmailAddress();
        RuleFor(x => x.Password).NotEmpty().MinimumLength(6);
    }
}

// Handler: Xử lý logic đăng ký tài khoản bằng BCrypt
public class RegisterHandler(AppDbContext context) : IRequestHandler<RegisterCommand, RegisterResult>
{
    public async Task<RegisterResult> Handle(RegisterCommand request, CancellationToken ct)
    {
        // 1. Kiểm tra username đã tồn tại chưa
        if (await context.Accounts.AnyAsync(u => u.Username == request.Username, ct))
            throw new InvalidOperationException("Tên đăng nhập đã tồn tại.");

        // 2. Kiểm tra email đã được sử dụng chưa
        if (await context.Accounts.AnyAsync(u => u.Email == request.Email, ct))
            throw new InvalidOperationException("Email đã được sử dụng.");

        // 3. Tiến hành băm mật khẩu sang chuỗi BCrypt loằng ngoằng với workFactor = 12
        // Hàm này tự sinh muối (salt) ngẫu nhiên và nhúng thẳng vào chuỗi kết quả lưu xuống DB
        string securedPasswordHash = BCryptNet.HashPassword(request.Password, workFactor: 12);

        // 4. Tạo account mới 
        var account = new Account
        {
            Id = Guid.NewGuid(),
            Username = request.Username,
            Email = request.Email,
            PasswordHash = securedPasswordHash, // Lưu chuỗi đã băm BCrypt chuẩn 60 ký tự vào DB
            Role = request.Role,
            CreatedAt = DateTime.UtcNow
        };

        context.Accounts.Add(account);
        await context.SaveChangesAsync(ct);

        return new RegisterResult(account.Id, account.Username, account.Email, account.Role);
    }
}