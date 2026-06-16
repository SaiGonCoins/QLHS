using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;
using QL_HS.Models;

namespace QL_HS.Services;

public interface IJwtTokenService
{
    string GenerateToken(Account account);
}

public class JwtTokenService(IConfiguration configuration) : IJwtTokenService
{
    public string GenerateToken(Account account)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(
            configuration["Jwt:Key"] ?? "Key_Bao_Mat_Cho_JWT_AhauwhduawhdauhdwoiahdoiawhdIAHDOawhdowahOWIHD"));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, account.Id.ToString()),
            new Claim(ClaimTypes.Name, account.Username),
            new Claim(ClaimTypes.Role, account.Role.ToString()),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
        };

        var token = new JwtSecurityToken(
            issuer: configuration["Jwt:Issuer"] ?? "QL_HS_Issuer",
            audience: configuration["Jwt:Audience"] ?? "QL_HS_Audience",
            claims: claims,
            expires: DateTime.Now.AddHours(2),
            signingCredentials: creds);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
