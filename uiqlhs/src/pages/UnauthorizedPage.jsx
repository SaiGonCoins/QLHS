const UnauthorizedPage = () => {
  return (
    <div className="max-w-7xl mx-auto py-16 sm:px-6 lg:px-8">
      <div className="text-center">
        <h1 className="text-9xl font-bold text-red-500">403</h1>
        <h2 className="mt-4 text-3xl font-bold text-gray-900">Không có quyền truy cập</h2>
        <p className="mt-2 text-lg text-gray-600">Bạn không có quyền truy cập trang này.</p>
        <div className="mt-8">
          <a href="/" className="text-blue-600 hover:text-blue-800 font-medium">
            Quay về trang chủ
          </a>
        </div>
      </div>
    </div>
  )
}

export default UnauthorizedPage