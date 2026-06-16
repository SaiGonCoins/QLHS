import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axiosInstance from '../api/axiosInstance'

const getErrorMessage = (err) => {
  const data = err.response?.data
  const rawText = typeof data === 'string' ? data : ''

  const isSystemError = /Microsoft\.AspNetCore|BadHttpRequestException|JsonException|Failed to read parameter|stack trace|at System\.Text\.Json/i.test(rawText)
  const isSystemErrorObject = typeof data === 'object' && /Microsoft\.AspNetCore|BadHttpRequestException|JsonException|Failed to read parameter/i.test(JSON.stringify(data))

  if (isSystemError || isSystemErrorObject) {
    return 'Dữ liệu không hợp lệ. Vui lòng kiểm tra lại thông tin đăng ký.'
  }

  if (typeof data === 'string') return rawText
  if (Array.isArray(data?.errors) && data.errors.length > 0) return data.errors.join(', ')
  if (data?.error) return data.error
  if (data?.message) return data.message
  if (data?.title) return data.title

  return err.message || 'Đăng ký thất bại'
}

const RegisterForm = () => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    role: 'Student', // Vai trò mặc định ban đầu là Student
  })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const navigate = useNavigate()

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setIsSubmitting(true)
    try {
      // Gửi đúng payload chứa 4 trường (username, email, password, role) lên Backend
      await axiosInstance.post('/auth/register', formData)
      setSuccess('Đăng ký thành công! Đang chuyển hướng...')
      setTimeout(() => {
        navigate('/login')
      }, 1500)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">{error}</div>}
      {success && <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">{success}</div>}
      
      <div>
        <label className="block text-sm font-medium text-gray-700">Tên đăng nhập</label>
        <input
          type="text"
          name="username"
          value={formData.username}
          onChange={handleChange}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Email</label>
        <input
          type="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Mật khẩu</label>
        <input
          type="password"
          name="password"
          value={formData.password}
          onChange={handleChange}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Vai trò</label>
        <select
          name="role"
          value={formData.role}
          onChange={handleChange}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="Student">Student</option>
          <option value="Teacher">Teacher</option>
          <option value="Admin">Admin</option>
        </select>
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSubmitting ? 'Đang đăng ký...' : 'Đăng ký'}
      </button>
    </form>
  )
}

export default RegisterForm