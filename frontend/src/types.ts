export type Product = {
  id: string
  title: string
  price: number
  description: string
  images: string[]
  condition: 'New' | 'Like New' | 'Good' | 'Fair' | 'For Parts'
  category: string
  tags: string[]
  sellerId: string
  postedAt: string
  status: 'available' | 'requested' | 'sold'
  seller?: {
    id: string
    name: string
    email: string
    year: string
    department: string
    avatar: string
  }
}

export type UserType = {
  id: string
  name: string
  email?: string
  avatar?: string
  year?: string
  department?: string
  isAdmin?: boolean
}

export type Message = {
  id: string
  from: string | { id: string; name?: string; email?: string }
  from_id?: string
  text: string
  at?: string
  created_at?: string
}

export type Chat = {
  id: string
  productId: string
  product?: {
    id: string
    title: string
    price?: number
    status?: Product['status']
    seller?: UserType
  }
  participants: (string | UserType)[]
  messages: Message[]
  created_at?: string
}

export type PurchaseRequest = {
  id: string
  productId: string
  product?: {
    id: string
    title: string
    price?: number
    status?: Product['status']
    sellerId?: string
    seller?: UserType
  }
  buyerId: string
  buyer?: UserType
  sellerId: string
  seller?: UserType
  status: 'pending' | 'accepted' | 'declined'
  createdAt: string
  updatedAt?: string
  chatId?: string | null
}


