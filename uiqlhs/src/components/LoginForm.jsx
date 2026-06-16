import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axiosInstance from '../api/axiosInstance'
import useAuth from '../hooks/useAuth'

const getErrorMessage = (err) => {
  const data = err.response?.data
  const rawText = typeof data === 'string' ? data : ''

  const isSystemError = /Microsoft\.AspNetCore|BadHttpRequestException|JsonException|Failed to read parameter|stack trace|at System\.Text\.Json/i.test(rawText)
  const isSystemErrorObject = typeof data === 'object' && /Microsoft\.AspNetCore|BadHttpRequestException|JsonException|Failed to read parameter/i.test(JSON.stringify(data))

  if (isSystemError || isSystemErrorObject) {
    return 'Dữ liệu không hợp lệ. Vui lòng kiểm tra lại thông tin đăng nhập.'
  }

  if (typeof data === 'string') return rawText
  if (Array.isArray(data?.errors) && data.errors.length > 0) return data.errors.join(', ')
  if (data?.error) return data.error
  if (data?.message) return data.message
  if (data?.title) return data.title

  return err.message || 'Đăng nhập thất bại'
}

const LoginForm = () => {
  const [usernameOrEmail, setUsernameOrEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { login, getDashboardByRole } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setIsSubmitting(true)
    try {
      // Gọi API đăng nhập đến Backend
      const response = await axiosInstance.post('/auth/login', {
        usernameOrEmail,
        password,
      })
      
      // Bóc tách thuộc tính 'data' viết thường từ JSON phản hồi của Backend
      const innerData = response.data?.data

      if (innerData && innerData.token) {
        // Truyền token viết thường và object thông tin user vào hàm login của Context
        login(innerData.token, {
          id: innerData.id,
          username: innerData.username,
          email: innerData.email,
          role: innerData.role
        })
        
        // Điều hướng người dùng về đúng Dashboard dựa theo Role nhận được
        navigate(getDashboardByRole(innerData.role))
      }
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">{error}</div>}
      <div>
        <label className="block text-sm font-medium text-gray-700">Tên đăng nhập hoặc Email</label>
        <input
          type="text"
          value={usernameOrEmail}
          onChange={(e) => setUsernameOrEmail(e.target.value)}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Mật khẩu</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          required
        />
      </div>
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSubmitting ? 'Đang đăng nhập...' : 'Đăng nhập'}
      </button>
    </form>
  )
}

export default LoginForm