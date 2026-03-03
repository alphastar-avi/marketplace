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

export type CarpoolJoinRequest = {
  id: string
  rideId: string
  requester: UserType
  status: 'pending' | 'accepted' | 'declined'
  createdAt: string
}

export type CarpoolRide = {
  id: string
  destination: string
  pickupPoint: string
  capacity: number
  seatsAvailable: number
  departureDate: string
  departureTime: string
  direction: 'to_college' | 'from_college'
  description: string
  owner: UserType
  participants: UserType[]
  chatId?: string
  joinRequests?: CarpoolJoinRequest[]
  createdAt: string
}


