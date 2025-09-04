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
  from: string
  text: string
  at: string
}

export type Chat = {
  id: string
  productId: string
  participants: string[]
  messages: Message[]
}

export type PurchaseRequest = {
  id: string
  productId: string
  buyerId: string
  sellerId: string
  status: 'pending' | 'accepted' | 'declined'
  createdAt: string
}


