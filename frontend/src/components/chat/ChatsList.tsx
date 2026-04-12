import { useState } from 'react'
import { Search, MessageCircle } from 'lucide-react'
import { useMarketplace } from '../../state/MarketplaceContext'
import { motion } from 'framer-motion'

interface ChatsListProps {
  selectedChatId: string | null
  onSelectChat: (chatId: string) => void
}

export default function ChatsList({ selectedChatId, onSelectChat }: ChatsListProps) {
  const { chats, products, user } = useMarketplace()
  const [searchQuery, setSearchQuery] = useState('')

  // Filter and sort chats by latest message
  const sortedChats = chats
    .filter(chat => {
      if (!searchQuery) return true
      const product = products.find(p => p.id === chat.productId)
      const otherParticipant = chat.participants.find((p: any) => {
        const participantId = typeof p === 'string' ? p : p.id
        return participantId !== user?.id
      })
      const participantName = typeof otherParticipant === 'string' ? otherParticipant : (otherParticipant as any)?.name || ''
      return (chat.name && chat.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        product?.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        participantName.toLowerCase().includes(searchQuery.toLowerCase())
    })
    .sort((a, b) => {
      const aLastMessage = a.messages[a.messages.length - 1]
      const bLastMessage = b.messages[b.messages.length - 1]
      if (!aLastMessage && !bLastMessage) return 0
      if (!aLastMessage) return 1
      if (!bLastMessage) return -1

      const aTime = aLastMessage.created_at || aLastMessage.at
      const bTime = bLastMessage.created_at || bLastMessage.at

      const timeA = aTime ? new Date(aTime).getTime() : 0
      const timeB = bTime ? new Date(bTime).getTime() : 0
      return timeB - timeA
    })

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)

    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } else if (diffInHours < 168) { // 7 days
      return date.toLocaleDateString([], { weekday: 'short' })
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
    }
  }

  const getOtherParticipant = (chat: any) => {
    return chat.participants.find((p: any) => {
      const participantId = typeof p === 'string' ? p : p.id
      return participantId !== user?.id
    })
  }

  const getOtherParticipantName = (chat: any) => {
    if (chat.name) return chat.name
    const otherParticipant = getOtherParticipant(chat)
    if (!otherParticipant) return 'Unknown User'
    return typeof otherParticipant === 'string' ? otherParticipant : otherParticipant.name || 'Unknown User'
  }

  const getChatSubtitle = (chat: any) => {
    if (chat.type === 'carpool' && chat.carpool_ride) {
      return `${chat.carpool_ride.pickup_point} to ${chat.carpool_ride.destination} • ${chat.carpool_ride.departure_time}`
    }
    const productId = chat.productId || chat.product_id
    const product = products.find(p => p.id === productId)
    return product?.title || 'Unknown Product'
  }

  const getLastMessage = (chat: any) => {
    const lastValidMessage = [...chat.messages].reverse().find(m => !m.text.startsWith("⚙️ PAYMENT_REQUESTED|"))
    if (!lastValidMessage) return 'No messages yet'

    const isFromUser = lastValidMessage.from === user?.id
    const prefix = isFromUser ? 'You: ' : ''
    return prefix + lastValidMessage.text
  }

  const getInitials = (name: string) => {
    if (!name || typeof name !== 'string') return 'U'
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-white/10">

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/40 w-4 h-4" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-[#7890ff]/50 transition-colors"
          />
        </div>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto">
        {sortedChats.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
              <MessageCircle className="w-8 h-8 text-white/30" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No conversations yet</h3>
            <p className="text-white/60 text-sm">Start chatting with sellers by visiting product pages</p>
          </div>
        ) : (
          <div className="space-y-1 p-2">
            {sortedChats.map((chat) => {
              const lastMessage = chat.messages[chat.messages.length - 1]
              const otherParticipant = getOtherParticipantName(chat)
              const chatSubtitle = getChatSubtitle(chat)
              const isSelected = selectedChatId === chat.id

              return (
                <motion.div
                  key={chat.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => onSelectChat(chat.id)}
                  className={`p-3 rounded-lg cursor-pointer transition-all duration-200 ${isSelected
                    ? 'bg-[#7890ff]/20 border border-[#7890ff]/30'
                    : 'hover:bg-white/5 border border-transparent'
                    }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <div className="w-12 h-12 rounded-full bg-[#7890ff] flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {typeof getOtherParticipant(chat) !== 'string' && (getOtherParticipant(chat) as any)?.avatar ? (
                        <img src={(getOtherParticipant(chat) as any).avatar} alt={otherParticipant} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-white font-semibold text-sm">
                          {getInitials(otherParticipant)}
                        </span>
                      )}
                    </div>

                    {/* Chat Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-semibold text-sm truncate">
                          {otherParticipant}
                        </h3>
                        {lastMessage && (
                          <span className="text-xs text-white/60 flex-shrink-0">
                            {(lastMessage.created_at || lastMessage.at) ? formatTime((lastMessage.created_at || lastMessage.at) as string) : ''}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between mb-1">
                        <p className="text-xs text-white/60 truncate">
                          {chatSubtitle}
                        </p>
                      </div>

                      <p className="text-sm text-white/70 truncate">
                        {getLastMessage(chat)}
                      </p>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
