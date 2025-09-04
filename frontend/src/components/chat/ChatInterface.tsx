import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, Send, Check, X as XIcon } from 'lucide-react'
import { useMarketplace } from '../../state/MarketplaceContext'

interface ChatInterfaceProps {
  chatId: string
  onClose: () => void
  isMobile?: boolean
}

export default function ChatInterface({ chatId, onClose, isMobile = false }: ChatInterfaceProps) {
  const { chats, products, user, pushMessage, purchaseRequests, updatePurchaseRequest } = useMarketplace()
  const chat = chats.find((c) => c.id === chatId)
  const [text, setText] = useState('')
  const messagesRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    messagesRef.current?.scrollTo({ top: messagesRef.current.scrollHeight, behavior: 'smooth' })
  }, [chat?.messages?.length])

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

  const product = products.find((p) => p.id === chat.productId)
  const pendingRequests = purchaseRequests.filter((pr) => pr.productId === chat.productId && pr.status === 'pending')
  const otherParticipantObj = chat.participants.find((p: any) => {
    const participantId = typeof p === 'string' ? p : p.id
    return participantId !== user?.id
  })
  const otherParticipant = typeof otherParticipantObj === 'string' 
    ? otherParticipantObj 
    : (otherParticipantObj as any)?.name || 'Unknown User'

  const send = () => {
    if (!text.trim()) return
    pushMessage(chat.id, user?.id || 'guest', text.trim())
    setText('')
    
    // Simulate response
    setTimeout(() => {
      const otherParticipantId = chat.participants.find((p: any) => {
        const participantId = typeof p === 'string' ? p : p.id
        return participantId !== user?.id
      })
      const participantId = typeof otherParticipantId === 'string' ? otherParticipantId : (otherParticipantId as any)?.id || 'seller'
      pushMessage(chat.id, participantId, "Thanks! I'm available — let's discuss pickup.")
    }, 900 + Math.random() * 1200)
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
            {getInitials(otherParticipant)}
          </span>
        </div>
        
        <div className="flex-1">
          <h2 className="font-semibold">{otherParticipant}</h2>
          <p className="text-sm text-white/60 truncate">{product?.title || 'Unknown Product'}</p>
        </div>
      </div>

      {/* Messages */}
      <div ref={messagesRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Purchase Requests */}
        {pendingRequests.map((request) => (
          <div key={request.id} className="bg-green-500/20 border border-green-500/30 rounded-xl p-4">
            <div className="text-sm font-semibold text-green-400 mb-2">Purchase Request</div>
            <div className="text-sm opacity-90 mb-3">
              {user?.name || 'User'} wants to buy this product. Will you accept?
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => handlePurchaseRequest(request.id, 'accepted')} 
                className="flex-1 py-2 px-3 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm flex items-center justify-center gap-2 transition-colors"
              >
                <Check size={16} />
                Accept
              </button>
              <button 
                onClick={() => handlePurchaseRequest(request.id, 'declined')} 
                className="flex-1 py-2 px-3 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm flex items-center justify-center gap-2 transition-colors"
              >
                <XIcon size={16} />
                Decline
              </button>
            </div>
          </div>
        ))}

        {/* Chat Messages */}
        {chat.messages.map((message) => {
          const isFromUser = message.from === user?.id
          
          return (
            <div key={message.id} className={`flex ${isFromUser ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] p-3 rounded-xl ${
                isFromUser 
                  ? 'bg-gradient-to-r from-indigo-500 to-cyan-400 text-white' 
                  : 'bg-white/8 text-white'
              }`}>
                <div className="text-sm leading-relaxed">{message.text}</div>
                <div className={`text-xs mt-2 ${isFromUser ? 'text-white/70' : 'text-white/50'}`}>
                  {new Date(message.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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

      {/* Message Input */}
      <div className="p-4 border-t border-white/10">
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
      </div>
    </div>
  )
}
