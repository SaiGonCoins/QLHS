import { useEffect, useState } from "react";
import axiosInstance from "../api/axiosInstance";
import { downloadStudentReport } from "../api/reportApi";
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from "recharts";
const STUDENT_API = "/students";
const CLASS_API = "/classes";
export default function HomePage() {
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterClassId, setFilterClassId] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalClasses: 0,
    academicPerformance: [],
    classStatistics: []

  });
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [selectedClassId, setSelectedClassId] = useState("");
  const [averageScore, setAverageScore] = useState("");
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [barPage, setBarPage] = useState(0);
  const [importStatus, setImportStatus] = useState("");
  const BAR_PAGE_SIZE = 5;
  const fetchStudents = async () => {
    try {
      const response = await axiosInstance.get(STUDENT_API, {
        params: {
          searchTerm: searchTerm || undefined,
          classId: filterClassId === "" ? undefined : filterClassId,
          page: currentPage,
          pageSize: 5
        }
      });
      const result = response.data?.data || response.data;
      const data = result?.items || result;
      const isPaginated = result && typeof result === 'object' && result.items !== undefined;
      setStudents(Array.isArray(data) ? data : []);
      if (isPaginated) {
        setTotalPages(result.totalPages || 1);
        setTotalCount(result.totalCount || 0);
      } else {
        setTotalPages(1);
        setTotalCount(Array.isArray(data) ? data.length : 0);
      }
    } catch (err) {
      console.error("Lỗi lấy danh sách sinh viên:", err.response?.status, err.response?.data || err.message);
    }
  };
  const fetchClasses = async () => {
    try {
      const response = await axiosInstance.get(CLASS_API);
      const data = response.data?.data || response.data;
      setClasses(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Lỗi lấy danh sách lớp:", err.response?.status, err.response?.data || err.message);
    }
  };
  const fetchStats = async () => {
    try {
      const response = await axiosInstance.get(`${STUDENT_API}/stats`);
      const statsData = response.data?.data || response.data || {};
      const pieData = statsData.academicPerformance
        ? Object.keys(statsData.academicPerformance).map((key) => ({
            name: key,
            value: statsData.academicPerformance[key]
          }))
        : [];
      const barData = statsData.classStatistics
        ? statsData.classStatistics.map((item) => ({
            name: item.className,
            "Số sinh viên": item.studentCount
          }))
        : [];
      setStats({
        totalStudents: statsData.totalStudents || 0,
        totalClasses: statsData.totalClasses || 0,
        academicPerformance: pieData,
        classStatistics: barData
      });
    } catch (err) {
      console.error("Lỗi lấy thống kê:", err.response?.status, err.response?.data || err.message);
    }
  };
  useEffect(() => {
    fetchStudents();
  }, [searchTerm, filterClassId, currentPage]);
  useEffect(() => {
    fetchClasses();
    fetchStats();
  }, []);
  const handleSaveStudent = async (e) => {
    e.preventDefault();
    setError("");
    if (!name || !age || !selectedClassId || !averageScore) {
      setError("Vui lòng điền đầy đủ thông tin và chọn lớp học!");
      return;
    }
    try {
      if (editingId) {
        const updateData = { id: editingId, name, age: parseInt(age), classId: selectedClassId, averageScore: parseFloat(averageScore) };
        await axiosInstance.put(`${STUDENT_API}/${editingId}`, updateData);
        setEditingId(null);
      } else {
        const createData = { name, age: parseInt(age), classId: selectedClassId, averageScore: parseFloat(averageScore) };
        await axiosInstance.post(STUDENT_API, createData);
      }
      clearForm();
      fetchStudents();
      fetchStats();
    } catch (err) {
      console.error("Lỗi lưu sinh viên:", err.response?.status, err.response?.data || err.message);
      setError("Thao tác thất bại!");
    }
  };
  const handleDeleteStudent = async (id, name) => {
    if (window.confirm(`Bạn có chắc muốn xóa sinh viên [${name}] không?`)) {
      try {
        await axiosInstance.delete(`${STUDENT_API}/${id}`);
        if (students.length === 1 && currentPage > 1) {
          setCurrentPage(currentPage - 1);
        } else {
          fetchStudents();
        }
        fetchStats();
      } catch (err) {
        console.error("Lỗi xóa sinh viên:", err.response?.status, err.response?.data || err.message);
        alert("Xóa thất bại!");
      }
    }
  };
  const startEdit = (sv) => {
    setEditingId(sv.id);
    setName(sv.name);
    setAge(sv.age);
    setSelectedClassId(sv.classId);
    setAverageScore(sv.averageScore);
  };
  const clearForm = () => {
    setEditingId(null);
    setName("");
    setAge("");
    setSelectedClassId("");
    setAverageScore("");
  };
  const handleExportExcel = async () => {
    try {
      let tenLopHienTai = "Tat_Ca_Cac_Lop";
      if (filterClassId !== "") {
        const lopDuocChon = classes.find(c => c.id === filterClassId);
        if (lopDuocChon) {
          tenLopHienTai = lopDuocChon.className.replace(/[ \t]+/g, '_');
        }
      }
      const ngayXuat = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const tenFileHoanChinh = `Danh_Sach_Sinh_Vien_${tenLopHienTai}_${ngayXuat}.csv`;
      const response = await axiosInstance.get(`${STUDENT_API}/export`, {
        params: {
          classId: filterClassId === "" ? undefined : filterClassId
        },
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', tenFileHoanChinh);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Lỗi xuất Excel:", err.response?.status, err.response?.data || err.message);
      alert("Xuất file Excel thất bại!");
    }
  };

  const handleImportExcel = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const fileName = file.name.toLowerCase();
    const isExcel = fileName.endsWith('.xlsx') || fileName.endsWith('.xls') || fileName.endsWith('.csv');
    
    if (!isExcel) {
      setImportStatus("✗ Chỉ chấp nhận file .xlsx, .xls, .csv");
      setTimeout(() => setImportStatus(""), 3000);
      e.target.value = null;
      return;
    }
    
    const formData = new FormData();
    formData.append("file", file);
    setImportStatus("Đang nhập file...");
    try {
      const res = await axiosInstance.post(`${STUDENT_API}/import`, formData);
      const responseData = res.data?.data || res.data || {};
      const msg = responseData?.message || `Đã import ${responseData?.importedCount || 0} sinh viên`;
      const count = responseData?.importedCount || responseData?.count || responseData?.successCount || 0;
      setImportStatus(count > 0 ? `✓ ${msg}` : `⚠ ${msg}`);
      setTimeout(() => setImportStatus(""), 3000);
      fetchStudents();
      fetchClasses();
      fetchStats();
    } catch (err) {
      console.error("Lỗi import:", err.response?.status, err.response?.data || err.message);
      const errorMsg = err.response?.data?.message || (typeof err.response?.data === 'string' ? err.response.data : err.message) || "Vui lòng kiểm tra lại định dạng file";
      setImportStatus(`✗ ${errorMsg}`);
      setTimeout(() => setImportStatus(""), 5000);
    }
    e.target.value = null;
  };

  const PIE_COLORS = ["#10B981", "#F59E0B", "#EF4444"];

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="relative overflow-hidden rounded-2xl bg-white shadow-sm border border-gray-200 p-5 mb-6">
          <div className="absolute inset-y-0 left-0 w-1.5 rounded-l-2xl bg-gradient-to-b from-[#6366F1] via-[#8B5CF6] to-[#A855F7]" />
          <div className="absolute top-0 right-0 -mt-6 -mr-6 h-24 w-24 rounded-full bg-indigo-50/80" />
          <div className="absolute bottom-0 left-10 -mb-6 h-20 w-20 rounded-full bg-purple-50/70" />
          <div className="relative pl-4 text-center">
            <h1 className="mt-3 bg-gradient-to-r from-gray-800 via-gray-700 to-gray-600 bg-clip-text text-3xl font-black tracking-tight text-transparent">
              Quản Lý & Báo Cáo Sinh Viên
            </h1>
            <div className="mt-3 flex items-center justify-center gap-2.5">
              <span className="h-px w-7 bg-gradient-to-r from-transparent via-gray-300 to-gray-300" />
              <p className="text-xs font-semibold tracking-wider text-gray-400 uppercase">
                Tìm kiếm · Lọc theo lớp · Phân trang · Excel
              </p>
              <span className="h-px w-7 bg-gradient-to-l from-transparent via-gray-300 to-gray-300" />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#3B82F6] to-[#1D4ED8] p-5 shadow-lg shadow-blue-500/20">
            <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-white/10" />
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/15 backdrop-blur-sm">
                <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <div>
                <span className="text-[11px] font-semibold text-blue-100 tracking-wider uppercase">Tổng sinh viên</span>
                <p className="text-2xl font-black text-white">{stats.totalStudents}</p>
              </div>
            </div>
          </div>
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#8B5CF6] to-[#6D28D9] p-5 shadow-lg shadow-violet-500/20">
            <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-white/10" />
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/15 backdrop-blur-sm">
                <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div>
                <span className="text-[11px] font-semibold text-violet-100 tracking-wider uppercase">Lớp học</span>
                <p className="text-2xl font-black text-white">{stats.totalClasses}</p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-200 flex flex-col min-h-[190px]">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-bold text-gray-500 tracking-wider uppercase">Tỷ lệ học lực</span>
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            </div>
            <div className="flex-[1_1_0%]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart margin={{ bottom: 4, top: 4 }}>
                  <Pie data={stats.academicPerformance} cx="50%" cy="50%" innerRadius={24} outerRadius={50} paddingAngle={4} dataKey="value" stroke="none">
                    {stats.academicPerformance.map((entry, index) => <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '11px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Legend iconSize={7} wrapperStyle={{ fontSize: '10px', marginTop: '2px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-200 flex flex-col min-h-[190px]">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-gray-500 tracking-wider uppercase">Sinh viên theo lớp</span>
                <span className="text-[10px] font-medium text-gray-400">Thống kê</span>
              </div>
              {stats.classStatistics.length > BAR_PAGE_SIZE && (
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setBarPage(p => Math.max(0, p - 1))}
                    disabled={barPage === 0}
                    className="h-5 w-5 flex items-center justify-center rounded bg-gray-100 hover:bg-gray-200 disabled:opacity-40 text-[10px] text-gray-600 transition-colors"
                  >
                    ‹
                  </button>
                  <span className="text-[10px] text-gray-400 tabular-nums">
                    {barPage * BAR_PAGE_SIZE + 1}-{Math.min((barPage + 1) * BAR_PAGE_SIZE, stats.classStatistics.length)}
                  </span>
                  <button
                    onClick={() => setBarPage(p => Math.min(Math.ceil(stats.classStatistics.length / BAR_PAGE_SIZE) - 1, p + 1))}
                    disabled={barPage >= Math.ceil(stats.classStatistics.length / BAR_PAGE_SIZE) - 1}
                    className="h-5 w-5 flex items-center justify-center rounded bg-gray-100 hover:bg-gray-200 disabled:opacity-40 text-[10px] text-gray-600 transition-colors"
                  >
                    ›
                  </button>
                </div>
              )}
            </div>
            <div className="flex-[1_1_0%]">
              {stats.totalClasses === 0 ? (
                <span className="text-xs text-gray-400">Chưa có dữ liệu</span>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.classStatistics.slice(barPage * BAR_PAGE_SIZE, (barPage + 1) * BAR_PAGE_SIZE)} margin={{ top: 4, right: 4, left: -20, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                    <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#9CA3AF' }} axisLine={false} tickLine={false} dy={3} />
                    <YAxis tick={{ fontSize: 9, fill: '#9CA3AF' }} axisLine={false} tickLine={false} dx={-3} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{ borderRadius: '8px', fontSize: '11px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', border: '1px solid #E5E7EB' }}
                      cursor={{ fill: 'rgba(99, 102, 241, 0.06)' }}
                    />
                    <Bar dataKey="Số sinh viên" fill="#6366F1" radius={[4, 4, 0, 0]} maxBarSize={36} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 h-fit">
            <h2 className="text-xl font-bold text-gray-700 mb-4">{editingId ? "📝 Chỉnh Sửa" : "➕ Thêm Mới"}</h2>
            {error && <div className="text-red-500 bg-red-50 p-2 rounded mb-3 text-sm">{error}</div>}
            <form onSubmit={handleSaveStudent} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-600">Họ và Tên</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full mt-1 p-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" placeholder="Nguyễn Văn A" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600">Tuổi</label>
                <input type="number" value={age} onChange={(e) => setAge(e.target.value)} className="w-full mt-1 p-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" placeholder="20" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600">Lớp Học</label>
                <select value={selectedClassId} onChange={(e) => setSelectedClassId(e.target.value)} className="w-full mt-1 p-2 border border-gray-300 rounded-lg bg-white outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">-- Chọn lớp học --</option>
                  {classes.map((c) => <option key={c.id} value={c.id}>{c.className}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600">Điểm Trung Bình</label>
                <input type="number" step="0.1" value={averageScore} onChange={(e) => setAverageScore(e.target.value)} className="w-full mt-1 p-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" placeholder="8.5" />
              </div>
              <div className="space-y-2">
                <button type="submit" className={`w-full text-white font-medium py-2 rounded-lg transition-colors ${editingId ? 'bg-amber-500 hover:bg-amber-600' : 'bg-blue-600 hover:bg-blue-700'}`}>{editingId ? "Cập Nhật" : "Lưu Sinh Viên"}</button>
                {editingId && <button type="button" onClick={clearForm} className="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium py-2 rounded-lg transition-colors">Hủy</button>}
              </div>
            </form>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 lg:col-span-2 flex flex-col overflow-hidden">
            <div className="px-6 pt-5 pb-3">
              <h2 className="text-lg font-bold text-gray-800 tracking-tight">Danh Sách Sinh Viên</h2>
              <p className="text-xs text-gray-400 mt-0.5 font-medium">Quản lý và theo dõi thông tin sinh viên trong hệ thống</p>
            </div>
            <div className="mx-6 mb-4 p-2.5 bg-gray-50/80 rounded-xl border border-gray-100">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                <div className="relative flex-1">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400 text-sm">🔍</span>
                  <input
                    type="text"
                    placeholder="Tìm kiếm theo tên sinh viên..."
                    value={searchTerm}
                    onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                    className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all placeholder:text-gray-400"
                  />
                </div>
                <div className="relative">
                  <select
                    value={filterClassId}
                    onChange={(e) => { setFilterClassId(e.target.value); setCurrentPage(1); }}
                    className="appearance-none pl-4 pr-10 py-2.5 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all cursor-pointer min-w-[160px]"
                  >
                    <option value="">📂 Tất cả các lớp</option>
                    {classes.map((c) => <option key={c.id} value={c.id}>{c.className}</option>)}
                  </select>
<span className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 pointer-events-none text-xs">▾</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleExportExcel}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-white border border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:border-emerald-300 text-xs font-semibold rounded-lg transition-all shadow-sm"
                  >
                    <span className="text-sm">📥</span>
                    <span>Xuất Excel</span>
                  </button>
                  <label className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-50 hover:border-indigo-300 text-xs font-semibold rounded-lg transition-all shadow-sm cursor-pointer">
                    <span className="text-sm">📤</span>
                    <span>Nhập Excel</span>
                    <input type="file" accept=".xlsx, .xls, .csv" className="hidden" onChange={handleImportExcel} />
                  </label>
                  {importStatus && (
                    <div className={`text-xs px-3 py-1.5 rounded-lg font-medium ${importStatus.startsWith('✓') ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : importStatus.startsWith('⚠') ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                      {importStatus}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wider">
                    <th className="p-3 font-semibold">Họ và Tên</th>
                    <th className="p-3 font-semibold">Tuổi</th>
                    <th className="p-3 font-semibold">Lớp Học</th>
                    <th className="p-3 font-semibold">ĐTB</th>
                    <th className="p-3 text-center font-semibold">Hành động</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm">
                  {students.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="p-8 text-center text-gray-500">Không tìm thấy sinh viên phù hợp.</td>
                    </tr>
                  ) : (
                    students.map((sv, idx) => (
                      <tr key={sv.id} className={`hover:bg-gray-50/70 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
                        <td className="p-3 font-semibold text-gray-800">{sv.name}</td>
                        <td className="p-3 text-gray-600">{sv.age}</td>
                        <td className="p-3 text-blue-600 font-medium">{sv.class?.className || classes.find(c => c.id === sv.classId)?.className || "Chưa xếp lớp"}</td>
                        <td className="p-3">
                          {sv.averageScore != null ? (
                            <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${sv.averageScore >= 8.0 ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' : 'bg-amber-50 text-amber-700 ring-1 ring-amber-200'}`}>
                              {sv.averageScore}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">Chưa có</span>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          <button onClick={() => startEdit(sv)} className="px-2.5 py-1.5 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors">Sửa</button>
                          <button onClick={() => handleDeleteStudent(sv.id, sv.name)} className="ml-1.5 px-2.5 py-1.5 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors">Xóa</button>
                          <button onClick={() => downloadStudentReport(sv.id, sv.name)} className="ml-1.5 px-2.5 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors">📄 PDF</button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
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
        </div>
      </div>
    </div>
  );

}
