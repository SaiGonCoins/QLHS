namespace QL_HS.Features.Grades;

public record GradeDto(
    Guid Id,
    Guid StudentId,
    string StudentName,
    string ClassName,
    string SubjectName,
    double? ProgressScore,
    double? MidtermScore,
    double? FinalScore,
    string Semester,
    string SchoolYear,
    string? CreatedBy,
    DateTime? CreatedAt,
    string? ModifiedBy,
    DateTime? ModifiedAt
);
