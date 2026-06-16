using System.Text.Json.Serialization;
namespace QL_HS.Models;

public class Class
{
    public Guid Id { get; set; }
    public string ClassName { get; set; } = string.Empty;

    [JsonIgnore]
    public List<Student> Students { get; set; } = new();
}
