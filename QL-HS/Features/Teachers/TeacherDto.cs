namespace QL_HS.Features.Teachers;

public record TeacherDto(
    Guid Id,
    string FullName,
    string? Phone,
    string? Specialization,
    bool IsActive,
    string? CreatedBy,
    DateTime? CreatedAt,
    string? ModifiedBy,
    DateTime? ModifiedAt
);
