import { useCallback, useEffect, useMemo, useState } from "react";
import axiosInstance from "../api/axiosInstance";
import useAuth from "../hooks/useAuth";

const ACCOUNT_API = "/accounts";
const ROLES = ["Student", "Teacher", "Admin"];
const ROLE_LABELS = {
  Student: "Sinh viên",
  Teacher: "Giảng viên",
  Admin: "Quản trị viên"
};
const ROLE_BADGES = {
  Student: "bg-blue-50 text-blue-700 ring-blue-200",
  Teacher: "bg-amber-50 text-amber-700 ring-amber-200",
  Admin: "bg-red-50 text-red-700 ring-red-200"
};

const getErrorMessage = (err, fallback = "Thao tác thất bại!") => {
  const data = err.response?.data;
  const rawText = typeof data === "string" ? data : "";

  if (typeof data === "string") return data;
  if (Array.isArray(data?.errors) && data.errors.length > 0) return data.errors.join(", ");
  if (data?.Error) return data.Error;
  if (data?.error) return data.error;
  if (data?.message) return data.message;
  if (rawText) return rawText;

  return err.message || fallback;
};

const formatDate = (dateStr) => {
  if (!dateStr) return "—";
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
};

const emptyFormData = () => ({
  username: "",
  email: "",
  password: "",
  role: "Student"
});

export default function AccountManagement() {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [formData, setFormData] = useState(emptyFormData());
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchAccounts = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axiosInstance.get(ACCOUNT_API);
      const data = response.data || [];
      setAccounts(Array.isArray(data) ? data : []);
    } catch (err) {
      alert(getErrorMessage(err, "Không thể tải danh sách tài khoản"));
    } finally {
      setLoading(false);
    }
  }, []);

  const filteredAccounts = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return accounts.filter((account) => {
      const matchRole = filterRole ? account.role === filterRole : true;
      const matchSearch = !term ||
        (account.username || "").toLowerCase().includes(term) ||
        (account.email || "").toLowerCase().includes(term) ||
        (account.role || "").toLowerCase().includes(term) ||
        (account.studentId || "").toLowerCase().includes(term) ||
        (account.teacherId || "").toLowerCase().includes(term);

      return matchRole && matchSearch;
    });
  }, [accounts, filterRole, searchTerm]);

  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(filteredAccounts.length / pageSize));
  const displayPage = Math.min(currentPage, totalPages);
  const paginatedAccounts = useMemo(() => {
    const start = (displayPage - 1) * pageSize;
    return filteredAccounts.slice(start, start + pageSize);
  }, [filteredAccounts, displayPage]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchAccounts();
    }, 0);

    return () => clearTimeout(timeoutId);
  }, [fetchAccounts]);

  const validateForm = () => {
    if (!formData.username.trim()) return "Tên đăng nhập không được để trống!";
    if (formData.username.trim().length > 50) return "Tên đăng nhập không được vượt quá 50 ký tự!";
    if (!formData.email.trim()) return "Email không được để trống!";
    if (!/^\S+@\S+\.\S+$/.test(formData.email.trim())) return "Email không hợp lệ!";
    if (!ROLES.includes(formData.role)) return "Vai trò không hợp lệ!";
    if (!editingAccount && formData.password.length < 6) return "Mật khẩu phải có ít nhất 6 ký tự!";
    return "";
  };

  const handleOpenModal = (account = null) => {
    if (account) {
      setEditingAccount(account);
      setFormData({
        username: account.username || "",
        email: account.email || "",
        password: "",
        role: account.role || "Student"
      });
    } else {
      setEditingAccount(null);
      setFormData(emptyFormData());
    }
    setFormError("");
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingAccount(null);
    setFormData(emptyFormData());
    setFormError("");
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const error = validateForm();
    if (error) {
      setFormError(error);
      return;
    }

    setSubmitting(true);
    setFormError("");

    try {
      const payload = {
        username: formData.username.trim(),
        email: formData.email.trim(),
        role: formData.role
      };

      if (editingAccount) {
        await axiosInstance.put(`${ACCOUNT_API}/${editingAccount.id}`, {
          ...payload,
          id: editingAccount.id
        });
      } else {
        await axiosInstance.post(ACCOUNT_API, {
          ...payload,
          password: formData.password
        });
      }

      handleCloseModal();
      await fetchAccounts();
    } catch (err) {
      setFormError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (account) => {
    const isCurrentAccount = user?.id === account.id;
    const confirmMessage = isCurrentAccount
      ? "Bạn đang xóa tài khoản đang đăng nhập. Hệ thống có thể yêu cầu đăng nhập lại. Bạn có chắc muốn xóa không?"
      : `Bạn có chắc muốn xóa tài khoản [${account.username}] không?`;

    if (!window.confirm(confirmMessage)) return;

    try {
      await axiosInstance.delete(`${ACCOUNT_API}/${account.id}`);
      if (accounts.length === 1 && displayPage > 1) {
        setCurrentPage((prev) => prev - 1);
      } else {
        await fetchAccounts();
      }
    } catch (err) {
      alert(getErrorMessage(err, "Xóa tài khoản thất bại!"));
    }
  };

  const getLinkedBadge = (account) => {
    if (account.studentId) return `Sinh viên: ${account.studentId}`;
    if (account.teacherId) return `Giảng viên: ${account.teacherId}`;
    return "Chưa liên kết";
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="relative overflow-hidden rounded-2xl bg-white shadow-sm border border-gray-200 p-5">
          <div className="absolute inset-y-0 left-0 w-1.5 rounded-l-2xl bg-gradient-to-b from-[#6366F1] via-[#8B5CF6] to-[#EC4899]" />
          <div className="relative pl-4">
            <h1 className="text-2xl font-bold text-gray-800">Quản Lý Tài Khoản</h1>
            <p className="text-sm text-gray-500 mt-1">Quản lý tài khoản người dùng dựa trên API /api/accounts</p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl bg-white border border-gray-200 shadow-sm p-4 text-left">
            <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Tổng tài khoản</p>
            <p className="text-2xl font-bold text-gray-800 mt-1">{accounts.length}</p>
          </div>
          <div className="rounded-2xl bg-white border border-gray-200 shadow-sm p-4 text-left">
            <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Đang hiển thị</p>
            <p className="text-2xl font-bold text-gray-800 mt-1">{filteredAccounts.length}</p>
          </div>
          <div className="rounded-2xl bg-white border border-gray-200 shadow-sm p-4 text-left">
            <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Admin</p>
            <p className="text-2xl font-bold text-gray-800 mt-1">{accounts.filter((a) => a.role === "Admin").length}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200">
          <div className="px-6 pt-5 pb-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="relative flex-1">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">🔍</span>
                <input
                  type="text"
                  placeholder="Tìm kiếm theo tên, email, vai trò, mã liên kết..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500/30"
                />
              </div>
              <div className="relative">
                <select
                  value={filterRole}
                  onChange={(e) => setFilterRole(e.target.value)}
                  className="appearance-none pl-4 pr-10 py-2.5 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500/30 min-w-[180px]"
                >
                  <option value="">Tất cả vai trò</option>
                  {ROLES.map((role) => (
                    <option key={role} value={role}>{ROLE_LABELS[role]}</option>
                  ))}
                </select>
                <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 pointer-events-none text-xs">▾</span>
              </div>
              <button
                onClick={() => handleOpenModal()}
                disabled={submitting}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-800 text-white text-xs font-semibold rounded-lg transition-colors shadow-sm"
              >
                <span>+</span>
                <span>Thêm Tài Khoản</span>
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wider">
                    <th className="p-3 font-semibold">STT</th>
                    <th className="p-3 font-semibold">Tên đăng nhập</th>
                    <th className="p-3 font-semibold">Email</th>
                    <th className="p-3 font-semibold">Vai trò</th>
                    <th className="p-3 font-semibold">Liên kết</th>
                    <th className="p-3 font-semibold">Ngày tạo</th>
                    <th className="p-3 text-center font-semibold">Hành động</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm">
                  {paginatedAccounts.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="p-8 text-center text-gray-500">
                        {accounts.length === 0 ? "Chưa có tài khoản nào." : "Không tìm thấy tài khoản phù hợp."}
                      </td>
                    </tr>
                  ) : (
                    paginatedAccounts.map((account, idx) => (
                      <tr key={account.id} className={`hover:bg-gray-50/70 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
                        <td className="p-3 text-gray-600">{(displayPage - 1) * pageSize + idx + 1}</td>
                        <td className="p-3 font-semibold text-gray-800">{account.username || "—"}</td>
                        <td className="p-3 text-gray-600">{account.email || "—"}</td>
                        <td className="p-3">
                          <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ring-1 ${ROLE_BADGES[account.role] || "bg-gray-50 text-gray-700 ring-gray-200"}`}>
                            {ROLE_LABELS[account.role] || account.role || "—"}
                          </span>
                        </td>
                        <td className="p-3 text-gray-600">
                          <span className="inline-flex max-w-[260px] truncate" title={getLinkedBadge(account)}>
                            {getLinkedBadge(account)}
                          </span>
                        </td>
                        <td className="p-3 text-gray-600">{formatDate(account.createdAt)}</td>
                        <td className="p-3 text-center">
                          <button
                            onClick={() => handleOpenModal(account)}
                            className="px-2.5 py-1.5 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors"
                          >
                            Sửa
                          </button>
                          <button
                            onClick={() => handleDelete(account)}
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
              <span className="text-xs text-gray-500">Trang {displayPage} / {totalPages} — {filteredAccounts.length} kết quả</span>
              <div className="flex items-center gap-1.5">
                <button
                  disabled={displayPage === 1}
                  onClick={() => setCurrentPage(displayPage - 1)}
                  className="px-3 py-1.5 text-xs bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-40 rounded-lg transition-colors text-gray-700 font-medium"
                >
                  ← Trước
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`min-w-[32px] h-8 text-xs font-semibold rounded-lg transition-colors ${
                      page === displayPage
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {page}
                  </button>
                ))}
                <button
                  disabled={displayPage === totalPages}
                  onClick={() => setCurrentPage(displayPage + 1)}
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
                  {editingAccount ? "✏️ Sửa Tài Khoản" : "➕ Thêm Tài Khoản Mới"}
                </h2>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                {formError && (
                  <div className="text-red-500 bg-red-50 p-3 rounded-lg text-sm border border-red-100">
                    {formError}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-600">Tên đăng nhập *</label>
                  <input
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleInputChange}
                    className="w-full mt-1 p-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="nguyenvana"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-600">Email *</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full mt-1 p-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="email@example.com"
                    required
                  />
                </div>

                {!editingAccount && (
                  <div>
                    <label className="block text-sm font-medium text-gray-600">Mật khẩu *</label>
                    <input
                      type="password"
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      className="w-full mt-1 p-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="Ít nhất 6 ký tự"
                      minLength="6"
                      required
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-600">Vai trò *</label>
                  <select
                    name="role"
                    value={formData.role}
                    onChange={handleInputChange}
                    className="w-full mt-1 p-2.5 border border-gray-300 rounded-lg bg-white outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {ROLES.map((role) => (
                      <option key={role} value={role}>{ROLE_LABELS[role]}</option>
                    ))}
                  </select>
                </div>

                {editingAccount && (
                  <div className="rounded-lg bg-indigo-50 border border-indigo-100 p-3 text-sm text-indigo-700">
                    API cập nhật không nhận mật khẩu, chỉ thay đổi tên đăng nhập, email và vai trò.
                  </div>
                )}

                <div className="flex gap-3 pt-3">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-800 text-white font-medium py-2.5 rounded-lg transition-colors"
                  >
                    {submitting ? "Đang xử lý..." : editingAccount ? "Cập Nhật" : "Lưu"}
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
