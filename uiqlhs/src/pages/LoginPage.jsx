import { Navigate } from 'react-router-dom'
import LoginForm from '../components/LoginForm'
import useAuth from '../hooks/useAuth'

const LoginPage = () => {
  const { isAuthenticated, user, isLoading, getDashboardByRole } = useAuth()

  if (isLoading) {
    return <div className="flex justify-center items-center min-h-screen">Đang tải...</div>
  }

  if (isAuthenticated) {
    return <Navigate to={getDashboardByRole(user?.role)} replace />
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">Đăng nhập</h2>
        </div>
        <LoginForm />
      </div>
    </div>
  )
}

export default LoginPage