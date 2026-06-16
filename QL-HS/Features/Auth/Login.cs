using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using QL_HS.Data;
using QL_HS.Models;
using QL_HS.Services;
using BCryptNet = BCrypt.Net.BCrypt; 

namespace QL_HS.Features.Auth;

// Command: Yêu cầu đăng nhập (username/email + password)
public record LoginCommand(string UsernameOrEmail, string Password) : IRequest<LoginResult>;

// Kết quả trả về sau khi đăng nhập thành công
public record LoginResult(
    Guid Id,
    string Username,
    string Email,
    UserRole Role,
    string Token
);

// Validator: Kiểm tra dữ liệu đầu vào hợp lệ trước khi xử lý
public class LoginValidator : AbstractValidator<LoginCommand>
{
    public LoginValidator()
    {
        RuleFor(x => x.UsernameOrEmail).NotEmpty();
        RuleFor(x => x.Password).NotEmpty();
    }
}

// Handler: Xử lý logic đăng nhập chuẩn BCrypt (Không ép mật khẩu cứng)
public class LoginHandler(AppDbContext context, IJwtTokenService jwtService) : IRequestHandler<LoginCommand, LoginResult>
{
    public async Task<LoginResult> Handle(LoginCommand request, CancellationToken ct)
    {
        // 1. Tìm account theo username hoặc email
        var account = await context.Accounts.FirstOrDefaultAsync(
            a => a.Username == request.UsernameOrEmail || a.Email == request.UsernameOrEmail, ct);

        if (account is null)
            throw new UnauthorizedAccessException("Tên đăng nhập hoặc email không tồn tại.");

        // 2. Xác thực mật khẩu bằng BCrypt
        bool isValidPassword = false;
        try
        {
            // Hàm này tự giải mã cấu trúc $2a$12$... / $2b$12$... để đối chiếu với mọi mật khẩu bất kỳ
            isValidPassword = BCryptNet.Verify(request.Password, account.PasswordHash);
        }
        catch (BCrypt.Net.SaltParseException)
        {
            // Chuỗi hash dưới DB không phải định dạng BCrypt hợp lệ -> coi như sai mật khẩu
            isValidPassword = false;
        }
        catch (BCrypt.Net.BcryptAuthenticationException)
        {
            // Lỗi xác thực nội bộ của BCrypt -> coi như sai mật khẩu
            isValidPassword = false;
        }

        if (!isValidPassword)
            throw new UnauthorizedAccessException("Mật khẩu không chính xác.");

        // 3. Tạo JWT token
        var token = jwtService.GenerateToken(account);

        return new LoginResult(account.Id, account.Username, account.Email, account.Role, token);
    }
}