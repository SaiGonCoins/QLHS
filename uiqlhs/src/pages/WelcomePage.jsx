import { Link } from 'react-router-dom'

export default function WelcomePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 text-center">
        <div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">Chào mừng đến với Hệ thống</h2>
          <p className="mt-2 text-lg text-gray-600">Vui lòng chọn hành động</p>
        </div>
        <div className="space-y-4">
          <Link
            to="/login"
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            Đăng nhập
          </Link>
          <Link
            to="/register"
            className="w-full flex justify-center py-3 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            Đăng ký
          </Link>
        </div>
      </div>
    </div>
  )
}