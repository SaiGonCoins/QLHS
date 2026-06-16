using System.Text.Json.Serialization;

namespace QL_HS.Models;

public class Grade
{
    public Guid Id { get; set; }
    public Guid StudentId { get; set; }
    public string SubjectName { get; set; } = string.Empty;
    public double? ProgressScore { get; set; }
    public double? MidtermScore { get; set; }
    public double? FinalScore { get; set; }
    public string Semester { get; set; } = string.Empty;
    public string SchoolYear { get; set; } = string.Empty;

    public string? CreatedBy { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public string? ModifiedBy { get; set; }
    public DateTime? ModifiedAt { get; set; }

    [JsonIgnore]
    public Student? Student { get; set; }
}
