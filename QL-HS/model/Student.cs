using System.Text.Json.Serialization;
namespace QL_HS.Models;
    public class Student //tạo thêm  lớp base 
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public int Age { get; set; }

        // Khóa ngoại liên kết tới bảng Class
        public Guid ClassId { get; set; }
        
        [JsonIgnore]
        // Navigation property (Thuộc tính điều hướng)
        public Class? Class { get; set; }
        public double AverageScore { get; set; }
    }
