import { useEffect, useState, useMemo } from "react";
import axiosInstance from "../api/axiosInstance";

const CLASS_API = "/classes";

export default function ClassManagement() {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const [showModal, setShowModal] = useState(false);
  const [editingClass, setEditingClass] = useState(null);
  const [formData, setFormData] = useState({ className: "" });
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchClasses = async () => {
    setLoading(true);
    try {
      const response = await axiosInstance.get(CLASS_API);
      const data = response.data || [];
      setClasses(Array.isArray(data) ? data : []);
    } catch (err) {
      const errorMsg = err.response?.data?.Error || err.response?.data?.error || err.message || "Không thể tải danh sách lớp";
      alert(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const filteredClasses = useMemo(() => {
    if (!searchTerm.trim()) return classes;
    const term = searchTerm.trim().toLowerCase();
    return classes.filter(c => (c.className || "").toLowerCase().includes(term));
  }, [classes, searchTerm]);

  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(filteredClasses.length / pageSize));
  const paginatedClasses = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredClasses.slice(start, start + pageSize);
  }, [filteredClasses, currentPage, pageSize]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  useEffect(() => {
    fetchClasses();
  }, []);

  const validateForm = () => {
    if (!formData.className?.trim()) {
      return "Tên lớp không được để trống!";
    }
    return "";
  };

  const handleOpenModal = (cls = null) => {
    if (cls) {
      setEditingClass(cls);
      setFormData({ className: cls.className || "" });
    } else {
      setEditingClass(null);
      setFormData({ className: "" });
    }
    setFormError("");
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingClass(null);
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
      if (editingClass) {
        await axiosInstance.put(`${CLASS_API}/${editingClass.id}`, {
          id: editingClass.id,
          className: formData.className
        });
      } else {
        await axiosInstance.post(CLASS_API, { className: formData.className });
      }
      handleCloseModal();
      fetchClasses();
    } catch (err) {
      const errorMsg = typeof err.response?.data === "string"
        ? err.response.data
        : err.response?.data?.Error || err.response?.data?.error || err.message || "Thao tác thất bại!";
      setFormError(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id, className) => {
    if (window.confirm(`Bạn có chắc muốn xóa lớp [${className}] không?`)) {
      try {
        await axiosInstance.delete(`${CLASS_API}/${id}`);
        fetchClasses();
      } catch (err) {
        const errorMsg = typeof err.response?.data === "string"
          ? err.response.data
          : err.response?.data?.Error || err.response?.data?.error || err.message || "Xóa thất bại!";
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
            <h1 className="text-2xl font-bold text-gray-800">Quản Lý Lớp Học</h1>
            <p className="text-sm text-gray-500 mt-1">Quản lý thông tin lớp học trong hệ thống</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200">
          <div className="px-6 pt-5 pb-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="relative flex-1">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">🔍</span>
                <input
                  type="text"
                  placeholder="Tìm kiếm theo tên lớp..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500/30"
                />
              </div>
              <button
                onClick={() => handleOpenModal()}
                disabled={submitting}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white text-xs font-semibold rounded-lg transition-colors shadow-sm"
              >
                <span>+</span>
                <span>Thêm Lớp Học</span>
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
                    <th className="p-3 font-semibold">Tên Lớp</th>
                    <th className="p-3 text-center font-semibold">Hành Động</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm">
                  {paginatedClasses.length === 0 ? (
                    <tr>
                      <td colSpan="3" className="p-8 text-center text-gray-500">
                        {classes.length === 0 ? "Chưa có lớp học nào." : "Không tìm thấy lớp học phù hợp."}
                      </td>
                    </tr>
                  ) : (
                    paginatedClasses.map((l, idx) => (
                      <tr key={l.id} className={`hover:bg-gray-50/70 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
                        <td className="p-3 text-gray-600">{(currentPage - 1) * pageSize + idx + 1}</td>
                        <td className="p-3 font-semibold text-gray-800">{l.className || "—"}</td>
                        <td className="p-3 text-center">
                          <button
                            onClick={() => handleOpenModal(l)}
                            className="px-2.5 py-1.5 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors"
                          >
                            Sửa
                          </button>
                          <button
                            onClick={() => handleDelete(l.id, l.className)}
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
                Trang {currentPage} / {totalPages} — {filteredClasses.length} kết quả
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
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full" onClick={(e) => e.stopPropagation()}>
              <div className="p-6 border-b border-gray-100">
                <h2 className="text-xl font-bold text-gray-800">
                  {editingClass ? "✏️ Sửa Lớp Học" : "➕ Thêm Lớp Học Mới"}
                </h2>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                {formError && (
                  <div className="text-red-500 bg-red-50 p-3 rounded-lg text-sm border border-red-100">
                    {formError}
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-600">Tên Lớp Học *</label>
                  <input
                    type="text"
                    name="className"
                    value={formData.className}
                    onChange={handleInputChange}
                    className="w-full mt-1 p-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Tên lớp học"
                    required
                  />
                </div>
                <div className="flex gap-3 pt-3">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white font-medium py-2.5 rounded-lg transition-colors"
                  >
                    {submitting ? "Đang xử lý..." : editingClass ? "Cập Nhật" : "Lưu"}
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