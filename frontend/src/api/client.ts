import axios from 'axios'

const API_BASE_URL = (import.meta as any).env.VITE_API_URL || 'https://ca-marketplace-backend-dev.jollydesert-5443c3db.eastasia.azurecontainerapps.io/api'

// Debug logging
console.log('🔍 VITE_API_URL from env:', (import.meta as any).env.VITE_API_URL)
console.log('🔍 Final API_BASE_URL:', API_BASE_URL)

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid, clear auth data
      localStorage.removeItem('auth_token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    console.error('API Error:', error.response?.data || error.message)
    return Promise.reject(error)
  }
)

export default api
