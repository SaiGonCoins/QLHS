import { Navigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import useAuth from '../hooks/useAuth'
import { Link } from 'react-router-dom'

const DashboardPage = () => {
  const { user, isAuthenticated } = useAuth()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="border-4 border-dashed border-gray-200 rounded-lg p-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Chào mừng, {user?.fullName}!
            </h1>
            <p className="text-gray-600 mb-6">Vai trò: <span className="font-semibold">{user?.role}</span></p>
            <div className="space-y-4">
              {user?.role === 'Admin' && (
                <Link to="/admin" className="block p-4 bg-white shadow rounded-lg hover:bg-gray-50">
                  <h3 className="text-lg font-medium text-gray-900">Quản lý hệ thống</h3>
                  <p className="text-gray-500">Truy cập trang quản trị dành cho Admin</p>
                </Link>
              )}
              {user?.role === 'Teacher' && (
                <div className="block p-4 bg-white shadow rounded-lg">
                  <h3 className="text-lg font-medium text-gray-900">Quản lý sinh viên</h3>
                  <p className="text-gray-500">Xem và quản lý danh sách sinh viên</p>
                </div>
              )}
              {user?.role === 'Student' && (
                <div className="block p-4 bg-white shadow rounded-lg">
                  <h3 className="text-lg font-medium text-gray-900">Thông tin cá nhân</h3>
                  <p className="text-gray-500">Xem thông tin chi tiết của bạn</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DashboardPage
