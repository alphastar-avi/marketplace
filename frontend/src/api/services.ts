import api from './client'
import { Product, UserType, Chat, Message, PurchaseRequest } from '../types'

// Products API
export const productsAPI = {
  getAll: () => api.get<Product[]>('/api/products'),
  getById: (id: string) => api.get<Product>(`/api/products/${id}`),
  create: (product: Omit<Product, 'id' | 'postedAt'>) => api.post<Product>('/api/products', product),
  update: (id: string, product: Partial<Product>) => api.put<Product>(`/api/products/${id}`, product),
  delete: (id: string) => api.delete(`/api/products/${id}`),
}

// Users API
export const usersAPI = {
  getById: (id: string) => api.get<UserType>(`/api/users/${id}`),
  create: (user: Omit<UserType, 'id'>) => api.post<UserType>('/api/users', user),
  update: (id: string, user: Partial<UserType>) => api.put<UserType>(`/api/users/${id}`, user),
}

// Chats API
export const chatsAPI = {
  getAll: () => api.get<Chat[]>('/api/chats'),
  getById: (id: string) => api.get<Chat>(`/api/chats/${id}`),
  create: (data: { product_id: string; participants: string[] }) => api.post<Chat>('/api/chats', data),
  getMessages: (chatId: string) => api.get<Message[]>(`/api/chats/${chatId}/messages`),
  sendMessage: (chatId: string, message: { from_id: string; text: string }) => 
    api.post<Message>(`/api/chats/${chatId}/messages`, message),
}

// Purchase Requests API
export const purchaseRequestsAPI = {
  getAll: () => api.get<PurchaseRequest[]>('/api/requests'),
  create: (request: { product_id: string; buyer_id: string; seller_id: string }) => 
    api.post<PurchaseRequest>('/api/requests', request),
  updateStatus: (id: string, status: 'accepted' | 'declined') => 
    api.put<PurchaseRequest>(`/api/requests/${id}`, { status }),
}

// Favorites API
export const favoritesAPI = {
  getByUser: (userId: string) => api.get(`/api/favorites?user_id=${userId}`),
  add: (productId: string, userId: string) => 
    api.post(`/api/favorites/${productId}`, { user_id: userId }),
  remove: (productId: string, userId: string) => 
    api.delete(`/api/favorites/${productId}?user_id=${userId}`),
}

// Auth API
export const authAPI = {
  login: (credentials: { email: string; password: string }) => 
    api.post('/api/auth/login', credentials),
  register: (userData: { name: string; email: string; password: string; year?: string; department?: string }) => 
    api.post('/api/auth/register', userData),
  getMe: () => api.get('/api/auth/me'),
}
