import useAuth from '../hooks/useAuth'

export default function StudentProfilePage() {
  const { user } = useAuth()

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        <div className="border-4 border-dashed border-gray-200 rounded-lg p-8">
          <h1 className="text-3xl font-bold text-blue-600 mb-6">Thông Tin Sinh Viên</h1>
          <div className="space-y-4">
            <div className="bg-white rounded-lg p-4 shadow">
              <p className="text-gray-600"><span className="font-semibold">Tên:</span> {user?.fullName || user?.username}</p>
              <p className="text-gray-600"><span className="font-semibold">Email:</span> {user?.email}</p>
              <p className="text-gray-600"><span className="font-semibold">Role:</span> {user?.role}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}