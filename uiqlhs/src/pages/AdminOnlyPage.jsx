import Navbar from '../components/Navbar'

const AdminOnlyPage = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="border-4 border-dashed border-gray-200 rounded-lg p-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Trang quản trị Admin</h1>
            <p className="text-gray-600">Chỉ người dùng có vai trò Admin mới có thể xem trang này.</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminOnlyPage
