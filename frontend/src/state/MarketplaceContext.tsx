'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react'
import { Product, UserType, Chat, PurchaseRequest } from '../types'
import { uid, nowIso, arraysEq, STORAGE_KEYS } from '../utils'
import { productsAPI, usersAPI, chatsAPI, purchaseRequestsAPI, favoritesAPI, authAPI } from '../api/services'

type MarketplaceContextType = {
  products: Product[]
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>
  addProduct: (p: FormData) => Promise<Product>
  updateProductStatus: (productId: string, status: Product['status']) => Promise<void>
  deleteProduct: (productId: string) => Promise<void>
  user: UserType | null
  updateUser: (u: Partial<UserType>) => Promise<void>
  setUser: React.Dispatch<React.SetStateAction<UserType | null>>
  chats: Chat[]
  setChats: React.Dispatch<React.SetStateAction<Chat[]>>
  addChatIfMissing: (productId: string, participants: string[]) => Promise<Chat>
  pushMessage: (chatId: string, from: string, text: string) => Promise<void>
  refreshChat: (chatId: string) => Promise<void>
  favorites: string[]
  toggleFavorite: (productId: string) => Promise<void>
  purchaseRequests: PurchaseRequest[]
  createPurchaseRequest: (productId: string) => Promise<{ request: PurchaseRequest; chatId: string | null }>
  updatePurchaseRequest: (requestId: string, status: 'accepted' | 'declined') => Promise<void>
  isHydrated: boolean
}

const MarketplaceContext = createContext<MarketplaceContextType | undefined>(undefined)

const normalizePurchaseRequest = (request: any, chatIdOverride?: string | null): PurchaseRequest => ({
  id: request.id,
  productId: request.productId ?? request.product_id,
  product: request.product,
  buyerId: request.buyerId ?? request.buyer_id,
  buyer: request.buyer,
  sellerId: request.sellerId ?? request.seller_id,
  seller: request.seller,
  status: request.status,
  createdAt: request.createdAt ?? request.created_at,
  updatedAt: request.updatedAt ?? request.updated_at,
  chatId: chatIdOverride ?? request.chatId ?? request.chat_id ?? null,
})

function useLocalStorage<T>(key: string, initial: T) {
  const [state, setState] = useState<T>(initial)
  const [hasHydrated, setHasHydrated] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(key)
      if (raw) setState(JSON.parse(raw) as T)
    } catch {}
    setHasHydrated(true)
  }, [key])

  useEffect(() => {
    if (!hasHydrated) return
    try {
      localStorage.setItem(key, JSON.stringify(state))
    } catch {}
  }, [key, state, hasHydrated])

  return [state, setState, hasHydrated] as const
}

export const MarketplaceProvider = ({ children }: { children: ReactNode }) => {
  const [products, setProducts] = useState<Product[]>([])
  const [user, setUser] = useState<UserType | null>(null)
  const [chats, setChats] = useState<Chat[]>([])
  const [purchaseRequests, setPurchaseRequests] = useState<PurchaseRequest[]>([])
  const [favorites, setFavorites] = useState<string[]>([])
  const [isHydrated, setIsHydrated] = useState(false)

  // Load initial data from backend
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        // Load products
        const productsResponse = await productsAPI.getAll()
        setProducts(productsResponse.data)

        // Load chats
        const chatsResponse = await chatsAPI.getAll()
        setChats(chatsResponse.data)

        // Load purchase requests
        const requestsResponse = await purchaseRequestsAPI.getAll()
        setPurchaseRequests(requestsResponse.data)

        // Check for authenticated user
        const token = localStorage.getItem('auth_token')
        const savedUser = localStorage.getItem('user')
        
        if (token && savedUser) {
          try {
            // Verify token is still valid by fetching current user
            const userResponse = await authAPI.getMe()
            const userData = userResponse.data
            setUser(userData)
            
            // Load user's favorites
            const favoritesResponse = await favoritesAPI.getByUser(userData.id)
            const userFavorites = favoritesResponse.data.map((fav: any) => fav.product_id)
            setFavorites(userFavorites)
          } catch (error) {
            // Token invalid, clear auth data
            localStorage.removeItem('auth_token')
            localStorage.removeItem('user')
            console.error('Auth token invalid:', error)
          }
        }

        setIsHydrated(true)
      } catch (error) {
        console.error('Failed to load initial data:', error)
        setIsHydrated(true)
      }
    }

    loadInitialData()
  }, [])

  const addProduct = async (formData: FormData) => {
    try {
      const response = await productsAPI.create(formData)
      const newProduct = response.data
      setProducts((s) => [newProduct, ...s])
      return newProduct
    } catch (error) {
      console.error('Failed to create product:', error)
      alert(typeof error === 'string' ? error : 'Failed to create product. Please try again.')
      throw error
    }
  }

  const updateProductStatus = async (productId: string, status: Product['status']) => {
    try {
      await productsAPI.update(productId, { status })
      setProducts((s) => s.map((p) => (p.id === productId ? { ...p, status } : p)))
    } catch (error) {
      console.error('Failed to update product status:', error)
      // Fallback to local update
      setProducts((s) => s.map((p) => (p.id === productId ? { ...p, status } : p)))
    }
  }

  const updateUser = async (u: Partial<UserType>) => {
    const currentUser = user || { id: uid('u'), name: 'You' }
    const updatedUser = { ...currentUser, ...u } as UserType
    
    try {
      // Always create new user for now (skip UUID validation issues)
      const response = await usersAPI.create(updatedUser)
      const newUser = { ...updatedUser, id: response.data.id }
      setUser(newUser)
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(newUser))
    } catch (error) {
      console.error('Failed to update user:', error)
      // Fallback to local update
      setUser(updatedUser)
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(updatedUser))
    }
  }

  const addChatIfMissing = async (productId: string, participants: string[]) => {
    const existing = chats.find((c) => c.productId === productId && arraysEq(c.participants, participants))
    if (existing) return existing
    
    // Only create backend chat if all participants have valid UUIDs
    const validParticipants = participants.every(id => id.includes('-'))
    
    try {
      if (validParticipants) {
        const response = await chatsAPI.create({ product_id: productId, participants })
        const newChat = response.data
        setChats((s) => [...s, newChat])
        return newChat
      } else {
        throw new Error('Invalid participant IDs')
      }
    } catch (error) {
      console.error('Failed to create chat:', error)
      // Fallback to local creation
      const chat: Chat = { id: uid('c'), productId, participants, messages: [] }
      setChats((s) => [...s, chat])
      return chat
    }
  }

  const pushMessage = async (chatId: string, from: string, text: string) => {
    if (!user) return
    
    try {
      const response = await chatsAPI.sendMessage(chatId, { from_id: user.id, text })
      const newMessage = response.data
      setChats((s) => s.map((c) => (c.id === chatId ? { ...c, messages: [...c.messages, newMessage] } : c)))
    } catch (error) {
      console.error('Failed to send message:', error)
      // Fallback to local creation
      setChats((s) => s.map((c) => (c.id === chatId ? { ...c, messages: [...c.messages, { id: uid('m'), from, text, at: nowIso() }] } : c)))
    }
  }

  const refreshChat = useCallback(async (chatId: string) => {
    try {
      const response = await chatsAPI.getById(chatId)
      const updatedChat = response.data
      setChats((prev) => {
        const exists = prev.some((chat) => chat.id === chatId)
        if (exists) {
          return prev.map((chat) => (chat.id === chatId ? updatedChat : chat))
        }
        return [...prev, updatedChat]
      })
    } catch (error) {
      console.error('Failed to refresh chat:', error)
    }
  }, [])

  const refreshChats = useCallback(async () => {
    try {
      const response = await chatsAPI.getAll()
      setChats(response.data)
    } catch (error) {
      console.error('Failed to refresh chats:', error)
    }
  }, [])

  const refreshProducts = useCallback(async () => {
    try {
      const response = await productsAPI.getAll()
      setProducts(response.data)
    } catch (error) {
      console.error('Failed to refresh products:', error)
    }
  }, [])

  useEffect(() => {
    if (!isHydrated) return
    const interval = window.setInterval(() => {
      refreshChats()
    }, 6000)

    return () => window.clearInterval(interval)
  }, [isHydrated, refreshChats])

  useEffect(() => {
    if (!isHydrated) return
    const interval = window.setInterval(() => {
      refreshProducts()
    }, 60000)

    return () => window.clearInterval(interval)
  }, [isHydrated, refreshProducts])

  const toggleFavorite = async (productId: string) => {
    if (!user || !user.id.includes('-')) {
      // Handle legacy user IDs - just update locally
      setFavorites((prev) => (prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId]))
      return
    }
    
    try {
      const isFavorited = favorites.includes(productId)
      if (isFavorited) {
        await favoritesAPI.remove(productId, user.id)
        setFavorites((prev) => prev.filter((id) => id !== productId))
      } else {
        await favoritesAPI.add(productId, user.id)
        setFavorites((prev) => [...prev, productId])
      }
    } catch (error) {
      console.error('Failed to toggle favorite:', error)
      // Fallback to local update
      setFavorites((prev) => (prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId]))
    }
  }

  const createPurchaseRequest = async (productId: string) => {
    if (!user?.id) {
      throw new Error('User must be logged in to request a product')
    }

    try {
      const response = await purchaseRequestsAPI.create({ product_id: productId })
      const { request, chat_id } = response.data
      const normalizedRequest: PurchaseRequest = { ...request, chatId: chat_id }

      setPurchaseRequests((prev) => {
        const exists = prev.findIndex((r) => r.id === normalizedRequest.id)
        if (exists >= 0) {
          const next = [...prev]
          next[exists] = normalizedRequest
          return next
        }
        return [normalizedRequest, ...prev]
      })

      if (chat_id) {
        refreshChat(chat_id)
      }

      return { request: normalizedRequest, chatId: chat_id }
    } catch (error) {
      console.error('Failed to create purchase request:', error)
      // Fallback to local creation
      const fallbackRequest: PurchaseRequest = {
        id: uid('pr'),
        productId,
        buyerId: user.id,
        sellerId: products.find((p) => p.id === productId)?.sellerId || '',
        status: 'pending',
        createdAt: nowIso(),
        chatId: null,
      }
      setPurchaseRequests((s) => [fallbackRequest, ...s])

      const existingChat = chats.find((c) => c.productId === productId)
      return { request: fallbackRequest, chatId: existingChat?.id || null }
    }
  }

  const deleteProduct = async (productId: string) => {
    try {
      console.log('Attempting to delete product:', productId)
      const response = await productsAPI.delete(productId)
      console.log('Delete response:', response)
      setProducts((s) => s.filter((p) => p.id !== productId))
      console.log('Product deleted successfully from local state')
    } catch (error: any) {
      console.error('Failed to delete product:', error)
      if (error.response) {
        console.error('Error response:', error.response.data)
        console.error('Error status:', error.response.status)
      }
      alert('❌ Failed to delete product. Please try again.')
    }
  }

  const updatePurchaseRequest = async (requestId: string, status: 'accepted' | 'declined') => {
    try {
      const response = await purchaseRequestsAPI.updateStatus(requestId, status)
      const updatedRequest = response.data
      setPurchaseRequests((s) => s.map((r) => (r.id === requestId ? updatedRequest : r)))
      
      if (status === 'accepted') {
        await updateProductStatus(updatedRequest.productId, 'sold')
      }
    } catch (error) {
      console.error('Failed to update purchase request:', error)
      // Fallback to local update
      setPurchaseRequests((s) => s.map((r) => (r.id === requestId ? { ...r, status } : r)))
      if (status === 'accepted') {
        const request = purchaseRequests.find((r) => r.id === requestId)
        if (request) await updateProductStatus(request.productId, 'sold')
      }
    }
  }

  return (
    <MarketplaceContext.Provider
      value={{
        products,
        setProducts,
        addProduct,
        updateProductStatus,
        deleteProduct,
        user,
        updateUser,
        setUser,
        chats,
        setChats,
        addChatIfMissing,
        pushMessage,
        refreshChat,
        favorites,
        toggleFavorite,
        purchaseRequests,
        createPurchaseRequest,
        updatePurchaseRequest,
        isHydrated,
      }}
    >
      {children}
    </MarketplaceContext.Provider>
  )
}

export const useMarketplace = () => {
  const context = useContext(MarketplaceContext)
  if (!context) throw new Error('useMarketplace must be used within a MarketplaceProvider')
  return context
}


