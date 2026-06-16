import { useEffect, useState, useMemo } from "react";
import axiosInstance from "../api/axiosInstance";

const TEACHER_API = "/teachers";

export default function TeacherManagement() {
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterActive, setFilterActive] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  
  const [showModal, setShowModal] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState(null);
  const [formData, setFormData] = useState({
    fullName: "",
    phone: "",
    specialization: "",
    isActive: true
  });
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchTeachers = async () => {
    setLoading(true);
    try {
      const response = await axiosInstance.get(TEACHER_API);
      const data = response.data || [];
      setTeachers(Array.isArray(data) ? data : []);
    } catch (err) {
      const errorMsg = err.response?.data?.Error || err.response?.data?.error || err.message || "Không thể tải danh sách giảng viên";
      alert(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const filteredTeachers = useMemo(() => {
    let result = teachers;
    
    if (filterActive !== "") {
      const active = filterActive === "true";
      result = result.filter(t => t.isActive === active);
    }
    
    if (searchTerm.trim()) {
      const term = searchTerm.trim().toLowerCase();
      result = result.filter(t => 
        (t.fullName || "").toLowerCase().includes(term) ||
        (t.specialization || "").toLowerCase().includes(term) ||
        (t.phone || "").includes(term)
      );
    }
    
    return result;
  }, [teachers, filterActive, searchTerm]);

  const pageSize = 10;
  const totalFilteredPages = Math.max(1, Math.ceil(filteredTeachers.length / pageSize));
  const paginatedTeachers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredTeachers.slice(start, start + pageSize);
  }, [filteredTeachers, currentPage, pageSize]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterActive]);

  useEffect(() => {
    fetchTeachers();
  }, [searchTerm, filterActive]);

  const validateForm = () => {
    if (!formData.fullName?.trim()) {
      return "Họ và tên không được để trống!";
    }
    if (formData.phone && !/^[0-9+\-\s]*$/.test(formData.phone)) {
      return "Số điện thoại không hợp lệ!";
    }
    return "";
  };

  const handleOpenModal = (teacher = null) => {
    if (teacher) {
      setEditingTeacher(teacher);
      setFormData({
        fullName: teacher.fullName || "",
        phone: teacher.phone || "",
        specialization: teacher.specialization || "",
        isActive: teacher.isActive ?? true
      });
    } else {
      setEditingTeacher(null);
      setFormData({
        fullName: "",
        phone: "",
        specialization: "",
        isActive: true
      });
    }
    setFormError("");
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingTeacher(null);
    setFormError("");
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
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
      if (editingTeacher) {
        const payload = {
          id: editingTeacher.id,
          fullName: formData.fullName,
          phone: formData.phone || "",
          specialization: formData.specialization || "",
          isActive: formData.isActive,
          modifiedBy: "Admin"
        };
        await axiosInstance.put(`${TEACHER_API}/${payload.id}`, payload);
      } else {
        const payload = {
          fullName: formData.fullName,
          phone: formData.phone || "",
          specialization: formData.specialization || "",
          isActive: formData.isActive,
          createdBy: "Admin"
        };
        await axiosInstance.post(TEACHER_API, payload);
      }
      handleCloseModal();
      fetchTeachers();
    } catch (err) {
      const errorMsg =
        typeof err.response?.data === "string"
          ? err.response.data
          : err.response?.data?.Error || err.response?.data?.error || err.message || "Thao tác thất bại!";
      setFormError(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id, fullName) => {
    if (window.confirm(`Bạn có chắc muốn xóa giảng viên [${fullName}] không?`)) {
      try {
        await axiosInstance.delete(`${TEACHER_API}/${id}`);
        fetchTeachers();
      } catch (err) {
        const errorMsg =
          typeof err.response?.data === "string"
            ? err.response.data
            : err.response?.data?.Error || err.response?.data?.error || err.message || "Xóa thất bại!";
        alert(errorMsg);
      }
    }
  };

  const getStatusBadge = (isActive) => {
    return isActive
      ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
      : "bg-gray-50 text-gray-700 ring-1 ring-gray-200";
  };

  const getStatusText = (isActive) => {
    return isActive ? "Hoạt động" : "Ngừng";
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "—";
    return date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="relative overflow-hidden rounded-2xl bg-white shadow-sm border border-gray-200 p-5">
          <div className="absolute inset-y-0 left-0 w-1.5 rounded-l-2xl bg-gradient-to-b from-[#10B981] via-[#059669] to-[#047857]" />
          <div className="relative pl-4">
            <h1 className="text-2xl font-bold text-gray-800">Quản Lý Giảng Viên</h1>
            <p className="text-sm text-gray-500 mt-1">Quản lý thông tin giảng viên trong hệ thống</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200">
          <div className="px-6 pt-5 pb-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="relative flex-1">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">🔍</span>
                <input
                  type="text"
                  placeholder="Tìm kiếm theo tên, chuyên môn, SĐT..."
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); }}
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500/30"
                />
              </div>
              <div className="relative">
                <select
                  value={filterActive}
                  onChange={(e) => { setFilterActive(e.target.value); }}
                  className="appearance-none pl-4 pr-10 py-2.5 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500/30 min-w-[150px]"
                >
                  <option value="">Tất cả trạng thái</option>
                  <option value="true">Hoạt động</option>
                  <option value="false">Ngừng</option>
                </select>
                <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 pointer-events-none text-xs">▾</span>
              </div>
              <button
                onClick={() => handleOpenModal()}
                disabled={submitting}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-800 text-white text-xs font-semibold rounded-lg transition-colors shadow-sm"
              >
                <span>+</span>
                <span>Thêm Giảng Viên</span>
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wider">
                    <th className="p-3 font-semibold">STT</th>
                    <th className="p-3 font-semibold">Họ Tên</th>
                    <th className="p-3 font-semibold">Chuyên Môn</th>
                    <th className="p-3 font-semibold">Số Điện Thoại</th>
                    <th className="p-3 font-semibold">Trạng Thái</th>
                    <th className="p-3 font-semibold">Ngày Tạo</th>
                    <th className="p-3 text-center font-semibold">Hành Động</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm">
                  {paginatedTeachers.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="p-8 text-center text-gray-500">
                        {teachers.length === 0 ? "Chưa có giảng viên nào." : "Không tìm thấy giảng viên phù hợp."}
                      </td>
                    </tr>
                  ) : (
                    paginatedTeachers.map((gv, idx) => (
                      <tr key={gv.id} className={`hover:bg-gray-50/70 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
                        <td className="p-3 text-gray-600">{(currentPage - 1) * pageSize + idx + 1}</td>
                        <td className="p-3 font-semibold text-gray-800">{gv.fullName || "—"}</td>
                        <td className="p-3 text-gray-600">{gv.specialization || "—"}</td>
                        <td className="p-3 text-gray-600">{gv.phone || "—"}</td>
                        <td className="p-3">
                          <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${getStatusBadge(gv.isActive)}`}>
                            {getStatusText(gv.isActive)}
                          </span>
                        </td>
                        <td className="p-3 text-gray-600">{formatDate(gv.createdAt)}</td>
                        <td className="p-3 text-center">
                          <button 
                            onClick={() => handleOpenModal(gv)} 
                            className="px-2.5 py-1.5 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors"
                          >
                            Sửa
                          </button>
                          <button 
                            onClick={() => handleDelete(gv.id, gv.fullName)} 
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

          {totalFilteredPages > 1 && (
            <div className="flex items-center justify-between px-6 py-3 border-t border-gray-100 bg-gray-50/60">
              <span className="text-xs text-gray-500">
                Trang {currentPage} / {totalFilteredPages} — {filteredTeachers.length} kết quả
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(currentPage - 1)}
                  className="px-3 py-1.5 text-xs bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-40 rounded-lg transition-colors text-gray-700 font-medium"
                >
                  ← Trước
                </button>
                {Array.from({ length: totalFilteredPages }, (_, i) => i + 1).map((page) => (
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
                  disabled={currentPage === totalFilteredPages}
                  onClick={() => setCurrentPage(currentPage + 1)}
                  className="px-3 py-1.5 text-xs bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-40 rounded-lg transition-colors text-gray-700 font-medium"
                >
                  Sau →
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Form */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={handleCloseModal}>
            <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="p-6 border-b border-gray-100">
                <h2 className="text-xl font-bold text-gray-800">
                  {editingTeacher ? "✏️ Sửa Giảng Viên" : "➕ Thêm Giảng Viên Mới"}
                </h2>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                {formError && (
                  <div className="text-red-500 bg-red-50 p-3 rounded-lg text-sm border border-red-100">
                    {formError}
                  </div>
                )}
                
                <div>
                  <label className="block text-sm font-medium text-gray-600">Họ và Tên *</label>
                  <input
                    type="text"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleInputChange}
                    className="w-full mt-1 p-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="Nguyễn Thị B"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-600">Số điện thoại</label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="w-full mt-1 p-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="0123456789"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-600">Chuyên môn</label>
                  <input
                    type="text"
                    name="specialization"
                    value={formData.specialization}
                    onChange={handleInputChange}
                    className="w-full mt-1 p-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="Ví dụ: Toán học, Vật lý..."
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="isActive"
                    id="isActive"
                    checked={formData.isActive}
                    onChange={handleInputChange}
                    className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <label htmlFor="isActive" className="text-sm font-medium text-gray-600">Đang hoạt động</label>
                </div>

                <div className="flex gap-3 pt-3">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-800 text-white font-medium py-2.5 rounded-lg transition-colors"
                  >
                    {submitting ? "Đang xử lý..." : editingTeacher ? "Cập Nhật" : "Lưu"}
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
