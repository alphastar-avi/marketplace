import axios from 'axios'

// Get base URL from env or use sensible defaults for dev/prod
const envBase = (import.meta as any).env.VITE_API_URL as string | undefined
const fallbackBase = import.meta.env.DEV
  ? 'http://localhost:8080/api'
  : 'https://ca-marketplace-backend-dev.jollydesert-5443c3db.eastasia.azurecontainerapps.io/api'

const rawBaseUrl = envBase || fallbackBase
const API_BASE_URL = rawBaseUrl.endsWith('/api') ? rawBaseUrl : `${rawBaseUrl}/api`

// Debug logging
console.log('🔍 VITE_API_URL from env:', (import.meta as any).env.VITE_API_URL)
console.log('🔍 Final API_BASE_URL:', API_BASE_URL)

export const api = axios.create({
  baseURL: API_BASE_URL,
})

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    // Remove Content-Type header for FormData - let browser set it with boundary
    if (config.data instanceof FormData) {
      // Handle AxiosHeaders object correctly
      if (config.headers) {
        // Nuke it from orbit
        config.headers['Content-Type'] = undefined;
        // Also try standard delete for good measure
        if (typeof config.headers.delete === 'function') {
          config.headers.delete('Content-Type');
        }
        delete config.headers['Content-Type'];
      }

      console.log('🔍 Request Headers after update:', config.headers);
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
      // Skip global logout for PIN verification — a 401 there just means wrong PIN
      const requestUrl: string = error.config?.url || ''
      const isVerifyEndpoint = requestUrl.includes('/verify')
      // Skip redirect if already on an auth page — prevents infinite reload loops
      const onAuthPage = ['/login', '/signup'].some(p => window.location.pathname.startsWith(p))
      if (!isVerifyEndpoint && !onAuthPage) {
        // Token expired or invalid, clear auth data
        localStorage.removeItem('auth_token')
        localStorage.removeItem('user')
        window.location.href = '/login'
      }
    }
    console.error('API Error:', error.response?.data || error.message)
    return Promise.reject(error)
  }
)

export default api
