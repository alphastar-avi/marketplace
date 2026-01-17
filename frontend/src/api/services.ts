import api from './client'
import { Product, UserType, Chat, Message, PurchaseRequest, CarpoolRide, CarpoolJoinRequest } from '../types'

// Products API
export const productsAPI = {
  getAll: () => api.get<Product[]>('/products'),
  getById: (id: string) => api.get<Product>(`/products/${id}`),
  create: (formData: FormData) => {
    console.log('🚀 productsAPI.create called. Data type:', formData?.constructor?.name);
    console.trace('Stack trace:');
    return api.post<Product>('/products', formData, {
      headers: {
        'Content-Type': undefined,
      } as any, // Type cast to allow undefined usually
    })
  },
  update: (id: string, formData: FormData) => api.put<Product>(`/products/${id}`, formData, {
    headers: {
      'Content-Type': undefined,
    } as any,
  }),
  delete: (id: string) => api.delete(`/products/${id}`),
  // AI description generation
  generateDescription: (data: { title: string; category: string; image_urls: string[] }) =>
    api.post<{ description: string; model: string; processing_time_ms: number }>('/products/generate-description', data),
  generateDescriptionWithFiles: (formData: FormData) =>
    api.post<{ description: string; model: string; processing_time_ms: number }>('/products/generate-description-with-files', formData, {
      headers: {
        'Content-Type': undefined,
      } as any,
    }),
}

// Users API
export const usersAPI = {
  getById: (id: string) => api.get<UserType>(`/users/${id}`),
  create: (user: Omit<UserType, 'id'>) => api.post<UserType>('/users', user),
  update: (id: string, user: Partial<UserType>) => api.put<UserType>(`/users/${id}`, user),
}

// Chats API
export const chatsAPI = {
  getAll: () => api.get<Chat[]>('/chats'),
  getById: (id: string) => api.get<Chat>(`/chats/${id}`),
  create: (data: { product_id: string; participants: string[] }) => api.post<Chat>('/chats', data),
  getMessages: (chatId: string) => api.get<Message[]>(`/chats/${chatId}/messages`),
  sendMessage: (chatId: string, message: { from_id: string; text: string }) =>
    api.post<Message>(`/chats/${chatId}/messages`, message),
}

// Purchase Requests API
export const purchaseRequestsAPI = {
  getAll: () => api.get<PurchaseRequest[]>('/requests'),
  create: (request: { product_id: string; buyer_id: string; seller_id: string }) =>
    api.post<PurchaseRequest>('/requests', request),
  updateStatus: (id: string, status: 'accepted' | 'declined') =>
    api.put<PurchaseRequest>(`/requests/${id}`, { status }),
}

// Favorites API
export const favoritesAPI = {
  getByUser: (userId: string) => api.get(`/favorites?user_id=${userId}`),
  add: (productId: string, userId: string) =>
    api.post(`/favorites/${productId}`, { user_id: userId }),
  remove: (productId: string, userId: string) =>
    api.delete(`/favorites/${productId}?user_id=${userId}`),
}

// Carpool API
export const carpoolAPI = {
  getAll: () => api.get<CarpoolRide[]>('/carpools'),
  getById: (id: string) => api.get<CarpoolRide>(`/carpools/${id}`),
  createRide: (payload: {
    destination: string
    pickupPoint: string
    capacity: number
    departureDate: string
    departureTime: string
    description?: string
  }) => api.post<CarpoolRide>('/carpools', payload),
  createJoinRequest: (rideId: string) => api.post<CarpoolJoinRequest>(`/carpools/${rideId}/requests`, {}),
  updateJoinRequest: (requestId: string, status: 'accepted' | 'declined') =>
    api.put<CarpoolJoinRequest>(`/carpools/requests/${requestId}`, { status }),
}

// Auth API
export const authAPI = {
  login: (credentials: { email: string; password: string }) =>
    api.post('/auth/login', credentials),
  register: (userData: { name: string; email: string; password: string; year?: string; department?: string }) =>
    api.post('/auth/register', userData),
  getMe: () => api.get('/auth/me'),
}
