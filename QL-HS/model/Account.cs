namespace QL_HS.Models;

// Entity Account ánh xạ tới bảng Accounts trong database
public class Account
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Username { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public UserRole Role { get; set; } = UserRole.Student;
    public Guid? StudentId { get; set; }
    public Guid? TeacherId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public Student? Student { get; set; }
    public Teacher? Teacher { get; set; }
}
