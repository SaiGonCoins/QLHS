import axios from 'axios'

const axiosInstance = axios.create({
  baseURL: 'http://localhost:5204/api',
})

// Interceptor xử lý đầu vào của Request
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Sửa lại hàm này để kiểm tra URL an toàn và chính xác hơn bằng phương thức .includes()
const isAuthRequest = (config) => {
  const url = config?.url || ''
  return url.includes('auth/login') || url.includes('auth/register')
}

// Interceptor xử lý đầu ra của Response (Bắt lỗi 401 hết hạn token)
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    // Chỉ tự động xóa token và đá về trang login nếu lỗi 401 đó KHÔNG PHẢI là từ api đăng nhập/đăng ký gửi lên
    if (error.response?.status === 401 && !isAuthRequest(error.config)) {
      localStorage.removeItem('accessToken')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default axiosInstance