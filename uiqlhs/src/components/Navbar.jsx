import { Link, useNavigate } from 'react-router-dom'
import useAuth from '../hooks/useAuth'

const Navbar = () => {
  const { user, isAuthenticated, logout } = useAuth()
  const navigate = useNavigate()

  const roleColors = {
    Student: 'bg-blue-100 text-blue-800',
    Teacher: 'bg-yellow-100 text-yellow-800',
    Admin: 'bg-red-100 text-red-800',
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <nav className="bg-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center space-x-4">
            <Link to="/" className="text-xl font-bold text-blue-600">
              Quản lý Học sinh
            </Link>
            {isAuthenticated && user?.role === 'Admin' && (
              <>
                <Link to="/dashboard" className="px-3 py-2 text-sm font-medium text-gray-700 hover:text-blue-600">
                  Dashboard
                </Link>
                <Link to="/admin/students" className="px-3 py-2 text-sm font-medium text-gray-700 hover:text-blue-600">
                  Sinh viên
                </Link>
                <Link to="/admin/teachers" className="px-3 py-2 text-sm font-medium text-gray-700 hover:text-blue-600">
                  Giảng viên
                </Link>
                <Link to="/admin/accounts" className="px-3 py-2 text-sm font-medium text-gray-700 hover:text-blue-600">
                  Tài khoản
                </Link>
                <Link to="/admin/classes" className="px-3 py-2 text-sm font-medium text-gray-700 hover:text-blue-600">
                  Lớp học
                </Link>
                <Link to="/admin/grades" className="px-3 py-2 text-sm font-medium text-gray-700 hover:text-blue-600">
                  Điểm số
                </Link>
              </>
            )}
            {isAuthenticated && user?.role === 'Teacher' && (
              <Link to="/dashboard" className="px-3 py-2 text-sm font-medium text-gray-700 hover:text-blue-600">
                Dashboard
              </Link>
            )}
            {isAuthenticated && user?.role === 'Student' && (
              <Link to="/student" className="px-3 py-2 text-sm font-medium text-gray-700 hover:text-blue-600">
                Thông tin
              </Link>
            )}
          </div>
          <div className="flex items-center space-x-4">
            {isAuthenticated ? (
              <>
                <span className="text-sm font-medium text-gray-700">{user?.fullName}</span>
                <span className={`px-2 py-1 text-xs font-medium rounded ${roleColors[user?.role] || 'bg-gray-100 text-gray-800'}`}>
                  {user?.role}
                </span>
                <button
                  onClick={handleLogout}
                  className="px-3 py-2 text-sm font-medium text-gray-700 hover:text-red-600"
                >
                  Đăng xuất
                </button>
              </>
            ) : (
              <Link to="/login" className="px-3 py-2 text-sm font-medium text-gray-700 hover:text-blue-600">
                Đăng nhập
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}

export default Navbar