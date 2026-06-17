namespace QL_HS.Features.Reports;

public record StudentReportDto(
    Guid StudentId,
    string StudentName,
    string ClassName,
    int Age,
    double AverageScore,
    List<StudentReportGradeDto> Grades
);

public record StudentReportGradeDto(
    string SubjectName,
    double? ProgressScore,
    double? MidtermScore,
    double? FinalScore,
    string Semester,
    string SchoolYear
);