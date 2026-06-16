import { Navigate } from 'react-router-dom'
import useAuth from '../hooks/useAuth'

const RoleGuard = ({ allowedRoles, children }) => {
  const { user, isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return <div className="flex justify-center items-center min-h-screen">Đang tải...</div>
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (!allowedRoles.includes(user?.role)) {
    return <Navigate to="/unauthorized" replace />
  }

  return children
}

export default RoleGuard
