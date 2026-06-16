using Microsoft.EntityFrameworkCore;
using QL_HS.Models;

namespace QL_HS.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<Student> Students => Set<Student>();
    public DbSet<Class> Classes => Set<Class>();
    public DbSet<Account> Accounts => Set<Account>();
    public DbSet<Teacher> Teachers => Set<Teacher>();
    public DbSet<Grade> Grades => Set<Grade>();

        // Lưu ý: AuditLog đã được CHUYỂN SANG MONGODB
        // (collection "AuditLogs") để tối ưu hiệu năng và lưu trữ linh hoạt.
        // Xem Services/IAuditService.cs và Services/AuditService.cs.

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            modelBuilder.Entity<Teacher>()
                .ToTable("Teachers");

            modelBuilder.Entity<Teacher>()
                .Property(t => t.IsActive)
                .HasDefaultValue(true);

            modelBuilder.Entity<Teacher>()
                .HasOne(t => t.Account)
                .WithOne()
                .HasForeignKey<Teacher>(t => t.Id);

            modelBuilder.Entity<Student>()
            .ToTable("Students");

        modelBuilder.Entity<Student>()
            .HasOne(s => s.Class)
            .WithMany(c => c.Students)
            .HasForeignKey(s => s.ClassId)
            .OnDelete(DeleteBehavior.Cascade);

        // Cấu hình bảng Class
        modelBuilder.Entity<Class>()
            .ToTable("Classes");

        // Cấu hình bảng Account
        modelBuilder.Entity<Account>()
            .ToTable("Accounts");

        modelBuilder.Entity<Account>()
            .HasIndex(a => a.Username)
            .IsUnique();

        modelBuilder.Entity<Account>()
            .HasIndex(a => a.Email)
            .IsUnique();

        modelBuilder.Entity<Account>()
            .HasOne(a => a.Student)
            .WithMany()
            .HasForeignKey(a => a.StudentId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<Account>()
            .HasOne(a => a.Teacher)
            .WithMany()
            .HasForeignKey(a => a.TeacherId)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder.Entity<Account>()
            .Property(a => a.Role)
            .HasConversion<string>();

        modelBuilder.Entity<Grade>()
            .ToTable("Grades");

        modelBuilder.Entity<Grade>()
            .HasOne(g => g.Student)
            .WithMany()
            .HasForeignKey(g => g.StudentId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<Grade>()
            .HasIndex(g => g.StudentId);

    }
}
