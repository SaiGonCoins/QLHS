using System.Drawing;
using System.Drawing.Printing;
using System.Runtime.Versioning;
using DevExpress.XtraReports.UI;
using DevExpress.XtraPrinting;
using QL_HS.Features.Reports;

namespace QL_HS.Reports;

[SupportedOSPlatform("windows")]
public class StudentLearningReport : XtraReport
{
    public StudentLearningReport(StudentReportDto report)
    {
        PageWidth = 827;
        PageHeight = 1169;
        Margins = new Margins(40, 40, 40, 40);

        var detailBand = new DetailBand();
        detailBand.Height = 1000;
        Bands.Add(detailBand);

        var title = new XRLabel
        {
            Text = "PHIẾU BÁO CÁO KẾT QUẢ HỌC TẬP",
            Font = new Font("Times New Roman", 16, FontStyle.Bold),
            TextAlignment = TextAlignment.MiddleCenter
        };

        title.SizeF = new SizeF(740, 32);
        title.LocationFloat = new DevExpress.Utils.PointFloat(0, 0);

        var infoTitle = new XRLabel
        {
            Text = "Thông tin sinh viên",
            Font = new Font("Times New Roman", 12, FontStyle.Bold),
            TextAlignment = TextAlignment.MiddleLeft
        };

        infoTitle.SizeF = new SizeF(740, 24);
        infoTitle.LocationFloat = new DevExpress.Utils.PointFloat(0, 45);

        var infoTable = new XRTable
        {
            LocationFloat = new DevExpress.Utils.PointFloat(0, 70),
            SizeF = new SizeF(740, 90)
        };

        infoTable.Borders = DevExpress.XtraPrinting.BorderSide.None;

        var row1 = new XRTableRow { HeightF = 30 };
        var row2 = new XRTableRow { HeightF = 30 };

        var label1 = new XRTableCell
        {
            Text = "Họ và tên:",
            Font = new Font("Times New Roman", 11, FontStyle.Bold),
            WidthF = 120
        };
        var value1 = new XRTableCell
        {
            Text = report.StudentName,
            Font = new Font("Times New Roman", 11),
            WidthF = 250
        };
        var label2 = new XRTableCell
        {
            Text = "Lớp:",
            Font = new Font("Times New Roman", 11, FontStyle.Bold),
            WidthF = 80
        };
        var value2 = new XRTableCell
        {
            Text = report.ClassName,
            Font = new Font("Times New Roman", 11),
            WidthF = 180
        };

        row1.Cells.Add(label1);
        row1.Cells.Add(value1);
        row1.Cells.Add(label2);
        row1.Cells.Add(value2);

        var label3 = new XRTableCell
        {
            Text = "Tuổi:",
            Font = new Font("Times New Roman", 11, FontStyle.Bold),
            WidthF = 80
        };
        var value3 = new XRTableCell
        {
            Text = report.Age.ToString(),
            Font = new Font("Times New Roman", 11),
            WidthF = 80
        };
        var label4 = new XRTableCell
        {
            Text = "Điểm trung bình:",
            Font = new Font("Times New Roman", 11, FontStyle.Bold),
            WidthF = 130
        };
        var value4 = new XRTableCell
        {
            Text = report.AverageScore.ToString("0.00"),
            Font = new Font("Times New Roman", 11),
            WidthF = 100
        };

        row2.Cells.Add(label3);
        row2.Cells.Add(value3);
        row2.Cells.Add(label4);
        row2.Cells.Add(value4);

        infoTable.Rows.Add(row1);
        infoTable.Rows.Add(row2);

        var gradeTitle = new XRLabel
        {
            Text = "Bảng điểm chi tiết",
            Font = new Font("Times New Roman", 12, FontStyle.Bold),
            TextAlignment = TextAlignment.MiddleLeft
        };

        gradeTitle.SizeF = new SizeF(740, 24);
        gradeTitle.LocationFloat = new DevExpress.Utils.PointFloat(0, 175);

        var gradeTable = new XRTable
        {
            LocationFloat = new DevExpress.Utils.PointFloat(0, 205),
            SizeF = new SizeF(740, 0)
        };

        gradeTable.Borders = DevExpress.XtraPrinting.BorderSide.All;

        var headerRow = new XRTableRow { HeightF = 30 };
        var headers = new[]
        {
            ("STT", 45),
            ("Môn học", 170),
            ("Điểm quá trình", 110),
            ("Giữa kỳ", 90),
            ("Cuối kỳ", 90),
            ("Học kỳ", 80),
            ("Năm học", 100)
        };

        foreach (var header in headers)
        {
            var cell = new XRTableCell
            {
                Text = header.Item1,
                Font = new Font("Times New Roman", 10, FontStyle.Bold),
                WidthF = header.Item2,
                TextAlignment = TextAlignment.MiddleCenter,
                Borders = DevExpress.XtraPrinting.BorderSide.All,
                Padding = new DevExpress.XtraPrinting.PaddingInfo(4, 4, 4, 4)
            };
            headerRow.Cells.Add(cell);
        }

        gradeTable.Rows.Add(headerRow);

        for (var i = 0; i < report.Grades.Count; i++)
        {
            var grade = report.Grades[i];
            var row = new XRTableRow { HeightF = 28 };

            var stt = new XRTableCell
            {
                Text = (i + 1).ToString(),
                WidthF = 45,
                TextAlignment = TextAlignment.MiddleCenter,
                Borders = DevExpress.XtraPrinting.BorderSide.All,
                Padding = new DevExpress.XtraPrinting.PaddingInfo(4, 4, 4, 4)
            };
            var subject = new XRTableCell
            {
                Text = grade.SubjectName,
                WidthF = 170,
                Borders = DevExpress.XtraPrinting.BorderSide.All,
                Padding = new DevExpress.XtraPrinting.PaddingInfo(4, 4, 4, 4)
            };
            var progress = new XRTableCell
            {
                Text = FormatScore(grade.ProgressScore),
                WidthF = 110,
                TextAlignment = TextAlignment.MiddleCenter,
                Borders = DevExpress.XtraPrinting.BorderSide.All,
                Padding = new DevExpress.XtraPrinting.PaddingInfo(4, 4, 4, 4)
            };
            var midterm = new XRTableCell
            {
                Text = FormatScore(grade.MidtermScore),
                WidthF = 90,
                TextAlignment = TextAlignment.MiddleCenter,
                Borders = DevExpress.XtraPrinting.BorderSide.All,
                Padding = new DevExpress.XtraPrinting.PaddingInfo(4, 4, 4, 4)
            };
            var final = new XRTableCell
            {
                Text = FormatScore(grade.FinalScore),
                WidthF = 90,
                TextAlignment = TextAlignment.MiddleCenter,
                Borders = DevExpress.XtraPrinting.BorderSide.All,
                Padding = new DevExpress.XtraPrinting.PaddingInfo(4, 4, 4, 4)
            };
            var semester = new XRTableCell
            {
                Text = grade.Semester,
                WidthF = 80,
                TextAlignment = TextAlignment.MiddleCenter,
                Borders = DevExpress.XtraPrinting.BorderSide.All,
                Padding = new DevExpress.XtraPrinting.PaddingInfo(4, 4, 4, 4)
            };
            var schoolYear = new XRTableCell
            {
                Text = grade.SchoolYear,
                WidthF = 100,
                TextAlignment = TextAlignment.MiddleCenter,
                Borders = DevExpress.XtraPrinting.BorderSide.All,
                Padding = new DevExpress.XtraPrinting.PaddingInfo(4, 4, 4, 4)
            };

            row.Cells.Add(stt);
            row.Cells.Add(subject);
            row.Cells.Add(progress);
            row.Cells.Add(midterm);
            row.Cells.Add(final);
            row.Cells.Add(semester);
            row.Cells.Add(schoolYear);

            gradeTable.Rows.Add(row);
        }

        var footer = new XRLabel
        {
            Text = "Sinh viên xác nhận kết quả báo cáo này là đúng với dữ liệu học tập trong hệ thống.",
            Font = new Font("Times New Roman", 11),
            TextAlignment = TextAlignment.MiddleLeft
        };

        footer.SizeF = new SizeF(740, 30);
        footer.LocationFloat = new DevExpress.Utils.PointFloat(0, 205 + gradeTable.Rows.Count * 30 + 20);

        var signatureTitle = new XRLabel
        {
            Text = "Xác nhận",
            Font = new Font("Times New Roman", 12, FontStyle.Bold),
            TextAlignment = TextAlignment.MiddleCenter
        };

        signatureTitle.SizeF = new SizeF(740, 25);
        signatureTitle.LocationFloat = new DevExpress.Utils.PointFloat(0, footer.LocationFloat.Y + 45);

        var signatureTable = new XRTable
        {
            LocationFloat = new DevExpress.Utils.PointFloat(0, signatureTitle.LocationFloat.Y + 30),
            SizeF = new SizeF(740, 90)
        };

        signatureTable.Borders = DevExpress.XtraPrinting.BorderSide.None;

        var signatureRow = new XRTableRow();

        var studentCell = new XRTableCell
        {
            Text = "Sinh viên",
            Font = new Font("Times New Roman", 11, FontStyle.Bold),
            WidthF = 250,
            TextAlignment = TextAlignment.MiddleCenter
        };
        var adminCell = new XRTableCell
        {
            Text = "Giáo vụ / Admin",
            Font = new Font("Times New Roman", 11, FontStyle.Bold),
            WidthF = 250,
            TextAlignment = TextAlignment.MiddleCenter
        };
        var emptyCell = new XRTableCell
        {
            WidthF = 240
        };

        signatureRow.Cells.Add(studentCell);
        signatureRow.Cells.Add(emptyCell);
        signatureRow.Cells.Add(adminCell);

        signatureTable.Rows.Add(signatureRow);

        detailBand.Controls.Add(title);
        detailBand.Controls.Add(infoTitle);
        detailBand.Controls.Add(infoTable);
        detailBand.Controls.Add(gradeTitle);
        detailBand.Controls.Add(gradeTable);
        detailBand.Controls.Add(footer);
        detailBand.Controls.Add(signatureTitle);
        detailBand.Controls.Add(signatureTable);
    }

    private static string FormatScore(double? score)
    {
        return score.HasValue ? score.Value.ToString("0.00") : "";
    }
}