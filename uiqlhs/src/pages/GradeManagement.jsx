import { useEffect, useState } from "react";
import axiosInstance from "../api/axiosInstance";

const GRADE_API = "/grades";
const STUDENT_API = "/students";

export default function GradeManagement() {
  const [grades, setGrades] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStudent, setFilterStudent] = useState("");
  const [filterSubject, setFilterSubject] = useState("");
  const [filterSemester, setFilterSemester] = useState("");
  const [filterSchoolYear, setFilterSchoolYear] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const [showModal, setShowModal] = useState(false);
  const [editingGrade, setEditingGrade] = useState(null);
  const [formData, setFormData] = useState({
    studentId: "",
    subjectName: "",
    progressScore: "",
    midtermScore: "",
    finalScore: "",
    semester: "",
    schoolYear: ""
  });
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchGrades = async () => {
    setLoading(true);
    try {
      const response = await axiosInstance.get(GRADE_API, {
        params: {
          studentId: filterStudent || undefined,
          subjectName: filterSubject || undefined,
          semester: filterSemester || undefined,
          schoolYear: filterSchoolYear || undefined,
          page: currentPage,
          pageSize: 10
        }
      });
      const result = response.data || {};
      const items = result.items || result.data || [];
      setGrades(Array.isArray(items) ? items : []);
      setTotalPages(result.totalPages || 1);
      setTotalCount(result.totalCount || 0);
    } catch (err) {
      const errorMsg = err.response?.data?.Error || err.response?.data?.error || err.message || "Không thể tải danh sách điểm";
      alert(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async () => {
    try {
      const response = await axiosInstance.get(STUDENT_API);
      const data = response.data?.data || response.data || [];
      setStudents(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Lỗi lấy danh sách sinh viên:", err);
    }
  };

  useEffect(() => {
    fetchGrades();
  }, [filterStudent, filterSubject, filterSemester, filterSchoolYear, currentPage]);

  useEffect(() => {
    fetchStudents();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [filterStudent, filterSubject, filterSemester, filterSchoolYear]);

  const validateForm = () => {
    if (!formData.studentId) return "Vui lòng chọn sinh viên!";
    if (!formData.subjectName?.trim()) return "Tên môn học không được để trống!";
    if (!formData.semester?.trim()) return "Học kỳ không được để trống!";
    if (!formData.schoolYear?.trim()) return "Năm học không được để trống!";

    const scores = [formData.progressScore, formData.midtermScore, formData.finalScore];
    for (const s of scores) {
      if (s !== "" && isNaN(Number(s))) return "Điểm phải là số!";
      if (s !== "" && (Number(s) < 0 || Number(s) > 10)) return "Điểm phải từ 0 đến 10!";
    }
    return "";
  };

  const handleOpenModal = (grade = null) => {
    if (grade) {
      setEditingGrade(grade);
      setFormData({
        studentId: grade.studentId || "",
        subjectName: grade.subjectName || "",
        progressScore: grade.progressScore ?? "",
        midtermScore: grade.midtermScore ?? "",
        finalScore: grade.finalScore ?? "",
        semester: grade.semester || "",
        schoolYear: grade.schoolYear || ""
      });
    } else {
      setEditingGrade(null);
      setFormData({
        studentId: "",
        subjectName: "",
        progressScore: "",
        midtermScore: "",
        finalScore: "",
        semester: "",
        schoolYear: ""
      });
    }
    setFormError("");
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingGrade(null);
    setFormError("");
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const error = validateForm();
    if (error) {
      setFormError(error);
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        studentId: formData.studentId,
        subjectName: formData.subjectName.trim(),
        progressScore: formData.progressScore !== "" ? Number(formData.progressScore) : null,
        midtermScore: formData.midtermScore !== "" ? Number(formData.midtermScore) : null,
        finalScore: formData.finalScore !== "" ? Number(formData.finalScore) : null,
        semester: formData.semester.trim(),
        schoolYear: formData.schoolYear.trim(),
        createdBy: "Admin"
      };
      if (editingGrade) {
        await axiosInstance.put(`${GRADE_API}/${editingGrade.id}`, {
          id: editingGrade.id,
          ...payload,
          modifiedBy: "Admin"
        });
      } else {
        await axiosInstance.post(GRADE_API, payload);
      }
      handleCloseModal();
      fetchGrades();
    } catch (err) {
      const errorMsg = typeof err.response?.data === "string"
        ? err.response.data
        : err.response?.data?.Error || err.response?.data?.error || err.message || "Thao tác thất bại!";
      setFormError(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Bạn có chắc muốn xóa điểm này không?")) {
      try {
        await axiosInstance.delete(`${GRADE_API}/${id}`);
        fetchGrades();
      } catch (err) {
        const errorMsg = typeof err.response?.data === "string"
          ? err.response.data
          : err.response?.data?.Error || err.response?.data?.error || err.message || "Xóa thất bại!";
        alert(errorMsg);
      }
    }
  };

  const calculateAverage = (grade) => {
    const scores = [grade.progressScore, grade.midtermScore, grade.finalScore].filter(s => s !== null);
    if (scores.length === 0) return "—";
    const avg = scores.reduce((a, b) => a + b, 0) / Math.max(scores.length, 1);
    return avg.toFixed(1);
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="relative overflow-hidden rounded-2xl bg-white shadow-sm border border-gray-200 p-5">
          <div className="absolute inset-y-0 left-0 w-1.5 rounded-l-2xl bg-gradient-to-b from-[#8B5CF6] via-[#6366F1] to-[#3B82F6]" />
          <div className="relative pl-4">
            <h1 className="text-2xl font-bold text-gray-800">Quản Lý Điểm Số</h1>
            <p className="text-sm text-gray-500 mt-1">Quản lý điểm cho sinh viên</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200">
          <div className="px-6 pt-5 pb-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="relative flex-1">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">🔍</span>
                <input
                  type="text"
                  placeholder="Tìm kiếm theo môn học..."
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500/30"
                />
              </div>
              <div className="relative">
                <select
                  value={filterStudent}
                  onChange={(e) => { setFilterStudent(e.target.value); setCurrentPage(1); }}
                  className="appearance-none pl-4 pr-10 py-2.5 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500/30 min-w-[180px]"
                >
                  <option value="">📚 Tất cả sinh viên</option>
                  {students.map((s) => <option key={s.id} value={s.id}>{s.name || s.fullName}</option>)}
                </select>
                <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 pointer-events-none text-xs">▾</span>
              </div>
              <div className="relative">
                <select
                  value={filterSemester}
                  onChange={(e) => { setFilterSemester(e.target.value); setCurrentPage(1); }}
                  className="appearance-none pl-4 pr-10 py-2.5 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500/30 min-w-[120px]"
                >
                  <option value="">Học kỳ</option>
                  <option value="HK1">HK1</option>
                  <option value="HK2">HK2</option>
                </select>
                <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 pointer-events-none text-xs">▾</span>
              </div>
              <button
                onClick={() => handleOpenModal()}
                disabled={submitting}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800 text-white text-xs font-semibold rounded-lg transition-colors shadow-sm"
              >
                <span>+</span>
                <span>Thêm Điểm</span>
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wider">
                    <th className="p-3 font-semibold">STT</th>
                    <th className="p-3 font-semibold">Sinh Viên</th>
                    <th className="p-3 font-semibold">Lớp</th>
                    <th className="p-3 font-semibold">Môn Học</th>
                    <th className="p-3 font-semibold">Điểm QT</th>
                    <th className="p-3 font-semibold">Điểm GK</th>
                    <th className="p-3 font-semibold">Điểm CK</th>
                    <th className="p-3 font-semibold">TB</th>
                    <th className="p-3 font-semibold">Học Kỳ</th>
                    <th className="p-3 font-semibold">Năm Học</th>
                    <th className="p-3 text-center font-semibold">Hành Động</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm">
                  {grades.length === 0 ? (
                    <tr>
                      <td colSpan="11" className="p-8 text-center text-gray-500">Không tìm thấy điểm nào.</td>
                    </tr>
                  ) : (
                    grades.map((g, idx) => (
                      <tr key={g.id} className={`hover:bg-gray-50/70 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
                        <td className="p-3 text-gray-600">{(currentPage - 1) * 10 + idx + 1}</td>
                        <td className="p-3 font-semibold text-gray-800">{g.studentName || "—"}</td>
                        <td className="p-3 text-gray-600">{g.className || "—"}</td>
                        <td className="p-3 text-gray-600">{g.subjectName || "—"}</td>
                        <td className="p-3 text-gray-600">{g.progressScore ?? "—"}</td>
                        <td className="p-3 text-gray-600">{g.midtermScore ?? "—"}</td>
                        <td className="p-3 text-gray-600">{g.finalScore ?? "—"}</td>
                        <td className="p-3 font-medium text-purple-600">{calculateAverage(g)}</td>
                        <td className="p-3 text-gray-600">{g.semester || "—"}</td>
                        <td className="p-3 text-gray-600">{g.schoolYear || "—"}</td>
                        <td className="p-3 text-center">
                          <button
                            onClick={() => handleOpenModal(g)}
                            className="px-2.5 py-1.5 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors"
                          >
                            Sửa
                          </button>
                          <button
                            onClick={() => handleDelete(g.id)}
                            className="ml-1.5 px-2.5 py-1.5 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                          >
                            Xóa
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-3 border-t border-gray-100 bg-gray-50/60">
              <span className="text-xs text-gray-500">
                Trang {currentPage} / {totalPages} — {totalCount} kết quả
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(currentPage - 1)}
                  className="px-3 py-1.5 text-xs bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-40 rounded-lg transition-colors text-gray-700 font-medium"
                >
                  ← Trước
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`min-w-[32px] h-8 text-xs font-semibold rounded-lg transition-colors ${
                      page === currentPage
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {page}
                  </button>
                ))}
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(currentPage + 1)}
                  className="px-3 py-1.5 text-xs bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-40 rounded-lg transition-colors text-gray-700 font-medium"
                >
                  Sau →
                </button>
              </div>
            </div>
          )}
        </div>

        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={handleCloseModal}>
            <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="p-6 border-b border-gray-100">
                <h2 className="text-xl font-bold text-gray-800">
                  {editingGrade ? "✏️ Sửa Điểm" : "➕ Thêm Điểm Mới"}
                </h2>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                {formError && (
                  <div className="text-red-500 bg-red-50 p-3 rounded-lg text-sm border border-red-100">
                    {formError}
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-600">Sinh Viên *</label>
                  <select
                    name="studentId"
                    value={formData.studentId}
                    onChange={handleInputChange}
                    className="w-full mt-1 p-2.5 border border-gray-300 rounded-lg bg-white outline-none focus:ring-2 focus:ring-purple-500"
                    required
                  >
                    <option value="">-- Chọn sinh viên --</option>
                    {students.map((s) => <option key={s.id} value={s.id}>{s.name || s.fullName}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-600">Môn Học *</label>
                  <input
                    type="text"
                    name="subjectName"
                    value={formData.subjectName}
                    onChange={handleInputChange}
                    className="w-full mt-1 p-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Ví dụ: Toán học"
                    required
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-600">Điểm QT</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="10"
                      name="progressScore"
                      value={formData.progressScore}
                      onChange={handleInputChange}
                      className="w-full mt-1 p-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="0-10"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600">Điểm GK</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="10"
                      name="midtermScore"
                      value={formData.midtermScore}
                      onChange={handleInputChange}
                      className="w-full mt-1 p-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="0-10"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600">Điểm CK</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="10"
                      name="finalScore"
                      value={formData.finalScore}
                      onChange={handleInputChange}
                      className="w-full mt-1 p-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="0-10"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-600">Học Kỳ *</label>
                    <select
                      name="semester"
                      value={formData.semester}
                      onChange={handleInputChange}
                      className="w-full mt-1 p-2.5 border border-gray-300 rounded-lg bg-white outline-none focus:ring-2 focus:ring-purple-500"
                      required
                    >
                      <option value="">-- Chọn --</option>
                      <option value="HK1">HK1</option>
                      <option value="HK2">HK2</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600">Năm Học *</label>
                    <input
                      type="text"
                      name="schoolYear"
                      value={formData.schoolYear}
                      onChange={handleInputChange}
                      className="w-full mt-1 p-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="2024-2025"
                      required
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-3">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800 text-white font-medium py-2.5 rounded-lg transition-colors"
                  >
                    {submitting ? "Đang xử lý..." : editingGrade ? "Cập Nhật" : "Lưu"}
                  </button>
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    disabled={submitting}
                    className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium py-2.5 rounded-lg transition-colors"
                  >
                    Hủy
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}