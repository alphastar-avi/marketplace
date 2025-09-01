import { useEffect, useRef, useState } from 'react'
import { X, Send, Check, X as XIcon } from 'lucide-react'
import { useMarketplace } from '../../state/MarketplaceContext'

export default function ChatPage({ chatId, onClose }: { chatId: string; onClose: () => void }) {
  const { chats, products, user, pushMessage, purchaseRequests, updatePurchaseRequest } = useMarketplace()
  const chat = chats.find((c) => c.id === chatId)
  const [text, setText] = useState('')
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    ref.current?.scrollTo({ top: ref.current.scrollHeight, behavior: 'smooth' })
  }, [chat?.messages?.length])

  if (!chat) return <div className="p-8">Chat not found</div>

  const product = products.find((p) => p.id === chat.productId)
  const pendingRequests = purchaseRequests.filter((pr) => pr.productId === chat.productId && pr.status === 'pending')

  const send = () => {
    if (!text.trim()) return
    pushMessage(chat.id, user?.id || 'guest', text.trim())
    setText('')
    setTimeout(() => {
      pushMessage(chat.id, chat.participants.find((p) => p !== user?.id) || 'seller', "Thanks! I'm available — let's discuss pickup.")
    }, 900 + Math.random() * 1200)
  }

  const handlePurchaseRequest = (requestId: string, status: 'accepted' | 'declined') => {
    updatePurchaseRequest(requestId, status)
  }

  return (
    <div className="fixed right-0 top-0 h-full w-full md:w-[420px] bg-gradient-to-b from-[#081028] to-[#04101f] z-50 shadow-2xl border-l border-white/10 rounded-l-3xl" style={{
      boxShadow: '0 0 60px rgba(0, 0, 0, 0.4), inset 0 0 30px rgba(255, 255, 255, 0.03), 0 8px 32px rgba(0, 0, 0, 0.2)'
    }}>
      <div className="p-4 flex items-center gap-3 border-b border-white/6 rounded-tl-3xl">
        <div className="text-lg font-semibold">Chat</div>
        <div className="text-sm opacity-70">{product?.title}</div>
        <div className="ml-auto flex gap-2">
          <button onClick={onClose} className="p-2 rounded-md bg-white/6">
            <X />
          </button>
        </div>
      </div>

      <div ref={ref} className="p-4 overflow-auto h-[calc(100vh-160px)] space-y-3">
        {pendingRequests.map((request) => (
          <div key={request.id} className="bg-green-500/20 border border-green-500/30 rounded-lg p-3">
            <div className="text-sm font-semibold text-green-400 mb-2">Purchase Request</div>
            <div className="text-xs opacity-80 mb-3">{user?.name || 'User'} wants to buy this product. Will you accept?</div>
            <div className="flex gap-2">
              <button onClick={() => handlePurchaseRequest(request.id, 'accepted')} className="flex-1 py-1 px-2 bg-green-500 text-white rounded text-xs flex items-center justify-center gap-1">
                <Check size={12} />
                Accept
              </button>
              <button onClick={() => handlePurchaseRequest(request.id, 'declined')} className="flex-1 py-1 px-2 bg-red-500 text-white rounded text-xs flex items-center justify-center gap-1">
                <XIcon size={12} />
                Decline
              </button>
            </div>
          </div>
        ))}

        {chat.messages.map((m) => (
          <div key={m.id} className={`flex ${m.from === user?.id ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] p-3 rounded-xl ${m.from === user?.id ? 'bg-indigo-500 text-white' : 'bg-white/8'}`}>
              <div className="text-sm">{m.text}</div>
              <div className="text-xs opacity-60 text-right mt-1">{new Date(m.at).toLocaleTimeString()}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 border-t border-white/6 flex gap-2 rounded-bl-3xl" style={{ marginBottom: '8px' }}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          className="flex-1 p-3 rounded-md bg-transparent border"
          placeholder="Type a message..."
        />
        <button onClick={send} className="p-3 rounded-md bg-gradient-to-r from-indigo-500 to-cyan-400">
          <Send />
        </button>
      </div>
    </div>
  )
}
