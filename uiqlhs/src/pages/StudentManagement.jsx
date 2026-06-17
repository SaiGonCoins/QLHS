import { useEffect, useState } from "react";
import axiosInstance from "../api/axiosInstance";
import { downloadStudentReport } from "../api/reportApi";

const STUDENT_API = "/students";

export default function StudentManagement() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterClass, setFilterClass] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [classes, setClasses] = useState([]);

  const [showModal, setShowModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    age: "",
    classId: ""
  });
  const [formError, setFormError] = useState("");

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const response = await axiosInstance.get(STUDENT_API, {
        params: {
          searchTerm: searchTerm || undefined,
          classId: filterClass || undefined,
          page: currentPage,
          pageSize: 5
        }
      });
      const result = response.data || {};
      const data = result.items || result || [];
      const isPaginated = result && result.items !== undefined;
      setStudents(Array.isArray(data) ? data : []);
      if (isPaginated) {
        setTotalPages(result.totalPages || 1);
        setTotalCount(result.totalCount || 0);
      } else {
        setTotalPages(1);
        setTotalCount(Array.isArray(data) ? data.length : 0);
      }
    } catch (err) {
      const errorMsg = err.response?.data?.Error || err.response?.data?.error || err.message || "Không thể tải danh sách sinh viên";
      alert(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const fetchClasses = async () => {
    try {
      const response = await axiosInstance.get("/classes");
      const data = response.data || [];
      setClasses(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Lỗi lấy danh sách lớp:", err);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, [searchTerm, filterClass, currentPage]);

  useEffect(() => {
    fetchClasses();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [filterClass]);

  const validateForm = () => {
    if (!formData.name?.trim()) return "Tên sinh viên không được để trống!";
    if (!formData.age || isNaN(Number(formData.age))) return "Tuổi phải là số!";
    if (Number(formData.age) < 1 || Number(formData.age) > 100) return "Tuổi phải từ 1 đến 100!";
    return "";
  };

  const handleOpenModal = (student = null) => {
    if (student) {
      setEditingStudent(student);
      setFormData({
        name: student.name || "",
        age: student.age ?? "",
        classId: student.classId || ""
      });
    } else {
      setEditingStudent(null);
      setFormData({ name: "", age: "", classId: "" });
    }
    setFormError("");
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingStudent(null);
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
    try {
      const payload = {
        name: formData.name.trim(),
        age: Number(formData.age),
        classId: formData.classId ? formData.classId : null
      };
      if (editingStudent) {
        await axiosInstance.put(`${STUDENT_API}/${editingStudent.id}`, payload);
      } else {
        await axiosInstance.post(STUDENT_API, payload);
      }
      handleCloseModal();
      fetchStudents();
    } catch (err) {
      const errorMsg = err.response?.data?.Error || err.response?.data?.error || err.message || "Thao tác thất bại!";
      setFormError(errorMsg);
    }
  };

  const handleDelete = async (id, name) => {
    if (window.confirm(`Bạn có chắc muốn xóa sinh viên [${name}] không?`)) {
      try {
        await axiosInstance.delete(`${STUDENT_API}/${id}`);
        if (students.length === 1 && currentPage > 1) {
          setCurrentPage(currentPage - 1);
        } else {
          fetchStudents();
        }
      } catch (err) {
        const errorMsg = err.response?.data?.Error || err.response?.data?.error || err.message || "Xóa thất bại!";
        alert(errorMsg);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="relative overflow-hidden rounded-2xl bg-white shadow-sm border border-gray-200 p-5">
          <div className="absolute inset-y-0 left-0 w-1.5 rounded-l-2xl bg-gradient-to-b from-[#3B82F6] via-[#6366F1] to-[#8B5CF6]" />
          <div className="relative pl-4">
            <h1 className="text-2xl font-bold text-gray-800">Quản Lý Sinh Viên</h1>
            <p className="text-sm text-gray-500 mt-1">Quản lý thông tin sinh viên trong hệ thống</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200">
          <div className="px-6 pt-5 pb-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="relative flex-1">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">🔍</span>
                <input
                  type="text"
                  placeholder="Tìm kiếm theo tên..."
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500/30"
                />
              </div>
              <div className="relative">
                <select
                  value={filterClass}
                  onChange={(e) => { setFilterClass(e.target.value); setCurrentPage(1); }}
                  className="appearance-none pl-4 pr-10 py-2.5 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500/30 min-w-[180px]"
                >
                  <option value="">📂 Tất cả lớp</option>
                  {classes.map((c) => <option key={c.id} value={c.id}>{c.className}</option>)}
                </select>
                <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 pointer-events-none text-xs">▾</span>
              </div>
              <button
                onClick={() => handleOpenModal()}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors shadow-sm"
              >
                <span>+</span>
                <span>Thêm Sinh Viên</span>
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wider">
                    <th className="p-3 font-semibold">STT</th>
                    <th className="p-3 font-semibold">Tên</th>
                    <th className="p-3 font-semibold">Tuổi</th>
                    <th className="p-3 font-semibold">Lớp</th>
                    <th className="p-3 font-semibold">TB</th>
                    <th className="p-3 text-center font-semibold">Hành động</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm">
                  {students.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="p-8 text-center text-gray-500">Không tìm thấy sinh viên phù hợp.</td>
                    </tr>
                  ) : (
                    students.map((sv, idx) => (
<tr key={sv.id} className={`hover:bg-gray-50/70 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
                          <td className="p-3 text-gray-600">{(currentPage - 1) * 5 + idx + 1}</td>
                          <td className="p-3 font-semibold text-gray-800">{sv.name || "—"}</td>
                          <td className="p-3 text-gray-600">{sv.age || "—"}</td>
                          <td className="p-3 text-blue-600 font-medium">{sv.class?.className || classes.find(c => c.id === sv.classId)?.className || "Chưa xếp lớp"}</td>
                          <td className="p-3 font-medium text-emerald-600">{sv.averageScore ?? "—"}</td>
                          <td className="p-3 text-center">
                            <button onClick={() => handleOpenModal(sv)} className="px-2.5 py-1.5 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors">Sửa</button>
                            <button onClick={() => handleDelete(sv.id, sv.name)} className="ml-1.5 px-2.5 py-1.5 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors">Xóa</button>
                            <button onClick={() => downloadStudentReport(sv.id, sv.name)} className="ml-1.5 px-2.5 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors">📄 PDF</button>
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
              <span className="text-xs text-gray-500">Trang {currentPage} / {totalPages} — {totalCount} kết quả</span>
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
                    className={`min-w-[32px] h-8 text-xs font-semibold rounded-lg transition-colors ${page === currentPage ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'}`}
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
            <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
              <div className="p-6 border-b border-gray-100">
                <h2 className="text-xl font-bold text-gray-800">{editingStudent ? "✏️ Sửa Sinh Viên" : "➕ Thêm Sinh Viên Mới"}</h2>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                {formError && <div className="text-red-500 bg-red-50 p-3 rounded-lg text-sm">{formError}</div>}
                
                <div>
                  <label className="block text-sm font-medium text-gray-600">Tên Sinh Viên *</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full mt-1 p-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Nguyễn Văn A"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-600">Tuổi *</label>
                  <input
                    type="number"
                    name="age"
                    value={formData.age}
                    onChange={handleInputChange}
                    className="w-full mt-1 p-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="18"
                    min="1"
                    max="100"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-600">Lớp Học</label>
                  <select
                    name="classId"
                    value={formData.classId}
                    onChange={handleInputChange}
                    className="w-full mt-1 p-2.5 border border-gray-300 rounded-lg bg-white outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- Chọn lớp học --</option>
                    {classes.map((c) => <option key={c.id} value={c.id}>{c.className}</option>)}
                  </select>
                </div>

                <div className="flex gap-3 pt-3">
                  <button
                    type="submit"
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg transition-colors"
                  >
                    {editingStudent ? "Cập Nhật" : "Lưu"}
                  </button>
                  <button
                    type="button"
                    onClick={handleCloseModal}
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