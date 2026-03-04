import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, Send, Check, X as XIcon, Users } from 'lucide-react'
import { useMarketplace } from '../../state/MarketplaceContext'

interface ChatInterfaceProps {
  chatId: string
  onClose: () => void
  isMobile?: boolean
}

export default function ChatInterface({ chatId, onClose, isMobile = false }: ChatInterfaceProps) {
  const { chats, products, user, pushMessage, purchaseRequests, updatePurchaseRequest, refreshChat } = useMarketplace()
  const chat = chats.find((c) => c.id === chatId)
  const [text, setText] = useState('')
  const [showParticipants, setShowParticipants] = useState(false)
  const messagesRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    messagesRef.current?.scrollTo({ top: messagesRef.current.scrollHeight, behavior: 'smooth' })
  }, [chat?.messages?.length])

  useEffect(() => {
    if (!chatId) return
    refreshChat(chatId)
    const interval = window.setInterval(() => refreshChat(chatId), 2500)
    return () => window.clearInterval(interval)
  }, [chatId, refreshChat])

  if (!chat) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <h3 className="text-xl font-semibold mb-2">Chat not found</h3>
          <p className="text-white/60">This conversation may have been deleted</p>
        </div>
      </div>
    )
  }

  const chatProductId = chat.productId || (chat as any).product_id
  const product = products.find((p) => p.id === chatProductId)
  const isSeller = product?.sellerId === user?.id
  const otherParticipantObj = chat.participants.find((p: any) => {
    const participantId = typeof p === 'string' ? p : p.id
    return participantId !== user?.id
  })

  const relevantRequests = purchaseRequests.filter((pr: any) => {
    const prProductId = pr.productId || pr.product_id;

    if (prProductId !== chatProductId) return false;

    const prBuyerId = pr.buyerId || pr.buyer_id;
    const prSellerId = pr.sellerId || pr.seller_id;
    const chatParticipantIds = chat.participants.map((p: any) => p?.id || (typeof p === 'string' ? p : p))

    return chatParticipantIds.includes(prBuyerId) && chatParticipantIds.includes(prSellerId)
  })
  // Sort by highest ID/date or just pick the latest if multiple exist
  const activeRequest = relevantRequests.length > 0 ? relevantRequests[relevantRequests.length - 1] : null;
  const otherParticipant = typeof otherParticipantObj === 'string'
    ? otherParticipantObj
    : (otherParticipantObj as any)?.name || 'Unknown User'

  const chatTitle = chat.type === 'carpool' ? (chat.name || 'Carpool Group') : otherParticipant

  const send = () => {
    if (!text.trim()) return
    pushMessage(chat.id, user?.id || 'guest', text.trim())
    setText('')
  }

  const handlePurchaseRequest = (requestId: string, status: 'accepted' | 'declined') => {
    updatePurchaseRequest(requestId, status)
  }

  const getInitials = (name: string) => {
    if (!name || typeof name !== 'string') return 'U'
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  return (
    <div className={`flex flex-col h-full bg-gradient-to-b from-[#081028] to-[#04101f] ${isMobile ? 'w-full' : 'flex-1'}`}>
      {/* Chat Header */}
      <div className="p-4 border-b border-white/10 flex items-center gap-3">
        {isMobile && (
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/5 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}

        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-cyan-400 flex items-center justify-center">
          <span className="text-white font-semibold text-sm">
            {getInitials(chatTitle)}
          </span>
        </div>

        <div className="flex-1">
          <h2 className="font-semibold">{chatTitle}</h2>
          <p className="text-sm text-white/60 truncate">
            {chat.type === 'carpool' && chat.carpool_ride
              ? `${chat.carpool_ride.pickup_point} to ${chat.carpool_ride.destination} • ${chat.carpool_ride.departure_time}`
              : (product?.title || 'Unknown Product')}
          </p>
        </div>

        {chat.type === 'carpool' && (
          <div className="relative ml-auto">
            <button
              onClick={() => setShowParticipants(!showParticipants)}
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-white/70 hover:text-white"
              title="View Participants"
            >
              <Users size={18} />
            </button>

            {showParticipants && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-[#0b1220] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50">
                <div className="p-3 border-b border-white/10 text-xs font-semibold text-white/50 uppercase tracking-wider flex justify-between items-center">
                  <span>Participants ({chat.participants.length})</span>
                  <button onClick={() => setShowParticipants(false)} className="hover:text-white transition-colors">
                    <XIcon size={14} />
                  </button>
                </div>
                <div className="max-h-60 overflow-y-auto">
                  {chat.participants.map((p: any) => {
                    const participantId = typeof p === 'string' ? p : p.id
                    const participantName = typeof p === 'string' ? p : p.name || 'Unknown User'
                    return (
                      <div key={participantId} className="px-4 py-3 text-sm flex items-center gap-3 hover:bg-white/5 transition-colors border-b border-white/5 last:border-0">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-cyan-400 flex items-center justify-center shrink-0">
                          <span className="text-white font-semibold text-xs">
                            {getInitials(participantName)}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="truncate text-white font-medium">{participantName}</p>
                          {participantId === user?.id && <p className="text-[10px] text-white/50 uppercase tracking-wider">You</p>}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Messages */}
      <div ref={messagesRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Chat Messages */}
        {chat.messages.map((message) => {
          const senderId =
            typeof message.from === 'string'
              ? message.from
              : message.from?.id || message.from_id || ''
          const isFromUser = senderId === user?.id
          const timestamp = message.at || message.created_at

          const senderName =
            typeof message.from === 'string'
              ? message.from
              : message.from?.name || 'Unknown User'

          return (
            <div key={message.id} className={`flex flex-col ${isFromUser ? 'items-end' : 'items-start'}`}>
              {!isFromUser && chat.type === 'carpool' && (
                <span className="text-xs text-white/50 ml-1 mb-1">{senderName}</span>
              )}
              <div className={`max-w-[75%] p-3 rounded-xl ${isFromUser
                ? 'bg-[#00356B] text-white'
                : 'bg-white/8 text-white'
                }`}>
                <div className="text-sm leading-relaxed">{message.text}</div>
                <div className={`text-xs mt-2 ${isFromUser ? 'text-white/70' : 'text-white/50'}`}>
                  {timestamp ? new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                </div>
              </div>
            </div>
          )
        })}

        {chat.messages.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/5 flex items-center justify-center">
                <Send className="w-8 h-8 text-white/30" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Start the conversation</h3>
              <p className="text-white/60 text-sm">Send a message to begin chatting</p>
            </div>
          </div>
        )}
      </div>

      {/* Message Input or Status Card */}
      <div className="p-4 border-t border-white/10">
        {chat.type === 'carpool' || !activeRequest || activeRequest.status === 'accepted' ? (
          <div className="flex gap-3">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), send())}
              className="flex-1 p-3 rounded-xl bg-white/5 border border-white/10 focus:outline-none focus:border-indigo-500/50 transition-colors"
              placeholder="Type a message..."
            />
            <button
              onClick={send}
              disabled={!text.trim()}
              className="p-3 rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-400 hover:from-indigo-600 hover:to-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <Send className="w-5 h-5 text-white" />
            </button>
          </div>
        ) : activeRequest.status === 'pending' ? (
          <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4">
            <div className="text-sm font-semibold text-green-400 mb-2">Purchase Request</div>
            {isSeller ? (
              <>
                <div className="text-sm opacity-90 mb-3">
                  {otherParticipant} wants to buy {product?.title}. Will you accept?
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handlePurchaseRequest(activeRequest.id, 'accepted')}
                    className="flex-1 py-2 px-3 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm flex items-center justify-center gap-2 transition-colors"
                  >
                    <Check size={16} />
                    Accept
                  </button>
                  <button
                    onClick={() => handlePurchaseRequest(activeRequest.id, 'declined')}
                    className="flex-1 py-2 px-3 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm flex items-center justify-center gap-2 transition-colors"
                  >
                    <XIcon size={16} />
                    Decline
                  </button>
                </div>
              </>
            ) : (
              <div className="text-sm opacity-90">
                Your purchase request for {product?.title} is pending seller approval.
              </div>
            )}
          </div>
        ) : activeRequest.status === 'declined' ? (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-center">
            <div className="text-sm font-semibold text-red-400 mb-1">Chat Closed</div>
            <div className="text-sm opacity-80">This purchase request was declined.</div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
