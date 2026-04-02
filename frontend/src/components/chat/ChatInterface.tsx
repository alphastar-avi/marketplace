import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Send, Check, X as XIcon, Users, QrCode, CheckCircle } from 'lucide-react'
import { useMarketplace } from '../../state/MarketplaceContext'
import { api } from '../../api/client'
import QRCode from 'react-qr-code'

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
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [nowTime, setNowTime] = useState(Date.now())
  const messagesRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const timer = setInterval(() => setNowTime(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])

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
  const otherParticipantObj = chat.participants.find((p: any) => {
    const participantId = typeof p === 'string' ? p : p.id
    return participantId !== user?.id
  })
  const otherParticipantId = typeof otherParticipantObj === 'string' ? otherParticipantObj : (otherParticipantObj as any)?.id
  const otherParticipantName = typeof otherParticipantObj === 'string' ? otherParticipantObj : (otherParticipantObj as any)?.name || 'Unknown User'

  const relevantRequests = purchaseRequests.filter((pr: any) => {
    const prProductId = pr.productId || pr.product_id;
    if (prProductId !== chatProductId) return false;

    const prBuyerId = pr.buyerId || pr.buyer_id;
    const prSellerId = pr.sellerId || pr.seller_id;
    const chatParticipantIds = chat.participants.map((p: any) => p?.id || (typeof p === 'string' ? p : p))

    return chatParticipantIds.includes(prBuyerId) && chatParticipantIds.includes(prSellerId)
  })
  
  const activeRequest = relevantRequests.length > 0 ? relevantRequests[relevantRequests.length - 1] : null;

  const chatTitle = chat.type === 'carpool' ? (chat.name || 'Carpool Group') : otherParticipantName

  const isProductChat = chat.type !== 'carpool'
  const isSeller = isProductChat && (product?.sellerId || (chat as any).product?.seller_id) === user?.id
  const isBuyer = isProductChat && user?.id && !isSeller

  const chatProductSeller = product?.seller || (chat as any).product?.seller
  const sellerUpiId = chatProductSeller?.upiId || chatProductSeller?.upi_id

  const paymentRequests = chat.messages.filter(m => m.text.startsWith("⚙️ PAYMENT_REQUESTED|"))
  const paymentCompletes = chat.messages.filter(m => m.text.includes("💳 Payment Completed"))
  
  const latestReq = paymentRequests.length > 0 ? paymentRequests[paymentRequests.length - 1] : null
  const [, reqAmountStr, reqTxnId] = latestReq ? latestReq.text.split('|') : ['', '0', '']
  const reqAmount = parseFloat(reqAmountStr || '0')
  
  const latestComp = paymentCompletes.length > 0 ? paymentCompletes[paymentCompletes.length - 1] : null
  
  const getMsgTime = (msg: any) => msg && (msg.at || msg.created_at) ? new Date((msg.at || msg.created_at) as string).getTime() : 0
  const reqTime = getMsgTime(latestReq)
  const compTime = getMsgTime(latestComp)
  
  const isGloballyPaid = product?.status === 'sold' || paymentCompletes.length > 0
  
  const WINDOW_MS = 5 * 60 * 1000
  const isPaymentWindowActive = reqTime > compTime && (nowTime - reqTime) < WINDOW_MS && !isGloballyPaid
  const timeLeftMs = Math.max(0, WINDOW_MS - (nowTime - reqTime))
  const timeLeftStr = `${Math.floor(timeLeftMs / 60000)}:${Math.floor((timeLeftMs % 60000) / 1000).toString().padStart(2, '0')}`

  const send = () => {
    if (!text.trim()) return
    pushMessage(chat.id, user?.id || 'guest', text.trim())
    setText('')
  }

  const handlePurchaseRequest = (requestId: string, status: 'accepted' | 'declined') => {
    updatePurchaseRequest(requestId, status)
  }

  const handleSendPaymentRequest = async () => {
    try {
      const res = await api.post('/transactions', {
        product_id: product?.id,
        buyer_id: otherParticipantId,
        amount: parseFloat(paymentAmount)
      })
      
      pushMessage(chat.id, user?.id || 'guest', `⚙️ PAYMENT_REQUESTED|${paymentAmount}|${res.data.id}`)
      setShowPaymentModal(false)
      setPaymentAmount('')
    } catch (e: any) {
      alert(e.response?.data?.error || "Failed to request payment")
    }
  }

  const handleConfirmPayment = async () => {
    try {
      if (reqTxnId) {
        await api.put(`/transactions/${reqTxnId}/complete`)
      }
      pushMessage(chat.id, user?.id || 'guest', "💳 Payment Completed via UPI! The transaction has been marked as complete.")
      if (product) product.status = 'sold'
    } catch (e: any) {
      alert(e.response?.data?.error || "Failed to confirm payment")
    }
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

        <div className="w-10 h-10 rounded-full bg-[#7890ff] flex items-center justify-center overflow-hidden">
          {(otherParticipantObj as any)?.avatar ? (
            <img src={(otherParticipantObj as any).avatar} alt={chatTitle} className="w-full h-full object-cover" />
          ) : (
            <span className="text-white font-semibold text-sm">
              {getInitials(chatTitle)}
            </span>
          )}
        </div>

        <div className="flex-1">
          <h2 className="font-semibold">{chatTitle}</h2>
          <p className="text-sm text-white/60 truncate">
            {chat.type === 'carpool' && chat.carpool_ride
              ? `${chat.carpool_ride.pickup_point} to ${chat.carpool_ride.destination} • ${chat.carpool_ride.departure_time}`
              : (product?.title || 'Unknown Product')}
          </p>
        </div>

        {isSeller && product?.status !== 'sold' && (
          !isPaymentWindowActive ? (
            <button 
              onClick={() => setShowPaymentModal(true)}
              className="py-1.5 px-3 bg-[#7890ff] hover:opacity-90 rounded-lg text-[11px] font-bold text-white shadow-sm transition-colors uppercase tracking-wider"
            >
              Request Pay
            </button>
          ) : (
            <div className="relative group">
              <button 
                onClick={handleConfirmPayment}
                className="py-1.5 px-3 bg-green-500 hover:bg-green-600 rounded-lg text-[11px] font-bold text-white shadow-sm transition-colors uppercase tracking-wider flex items-center gap-1.5"
              >
                <CheckCircle size={12} /> Confirm Payment
              </button>
              <div className="absolute top-full mt-2 right-0 w-max bg-[#10172b] border border-white/10 rounded-lg p-2.5 shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 flex flex-col gap-0.5">
                <div className="text-[10px] font-semibold text-indigo-300 uppercase tracking-widest">Waiting for Buyer</div>
                <div className="text-[11px] text-white/70">Window closes in <span className="font-mono text-rose-300">{timeLeftStr}</span></div>
              </div>
            </div>
          )
        )}

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
                        <div className="w-8 h-8 rounded-full bg-[#7890ff] flex items-center justify-center shrink-0 overflow-hidden">
                          {(p as any)?.avatar ? (
                            <img src={(p as any).avatar} alt={participantName} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-white font-semibold text-xs">
                              {getInitials(participantName)}
                            </span>
                          )}
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
        {chat.messages.filter(m => !m.text.startsWith("⚙️ PAYMENT_REQUESTED|")).map((message) => {
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
      <div className="p-4 border-t border-white/10 flex flex-col gap-3">
        {/* Buyer View */}
        {isBuyer && isPaymentWindowActive && !isGloballyPaid && (
          <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-4 flex flex-col items-center transition-all">
            <div className="flex flex-col items-center w-full animate-in fade-in zoom-in duration-300">
              <div className="flex flex-col gap-1 text-center w-full mb-3">
                <div className="text-sm font-semibold text-indigo-300 flex items-center justify-center gap-2"><QrCode size={16}/> Seller requested Payment of Rs. {reqAmount}</div>
                <div className="text-xs opacity-80 text-rose-300 font-mono">Expires in {timeLeftStr}</div>
              </div>
              <div className="bg-white p-3 rounded-xl mb-4 shadow-xl relative">
                <QRCode value={`upi://pay?pa=${sellerUpiId || 'demo@upi'}&pn=${encodeURIComponent(otherParticipantName)}&am=${reqAmount}`} size={160} />
              </div>
              <div className="w-full max-w-[160px]">
                <a href={`upi://pay?pa=${sellerUpiId || 'demo@upi'}&pn=${encodeURIComponent(otherParticipantName)}&am=${reqAmount}`} className="w-full py-2.5 px-3 bg-white/10 hover:bg-white/20 border border-white/10 rounded-xl text-xs font-semibold text-white flex items-center justify-center transition-colors">
                   Tap to open UPI App
                </a>
              </div>
              <p className="text-xs text-center text-white/50 mt-4">
                Or scan via any UPI app manually:
                <span className="font-semibold text-white/80 tracking-wide block mt-1">{sellerUpiId || 'demo@upi'}</span>
              </p>
            </div>
          </div>
        )}



        {chat.type === 'carpool' || !activeRequest || activeRequest.status === 'accepted' ? (
          <div className="flex gap-3 w-full">
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
              className="p-3 rounded-xl bg-[#7890ff] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
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
                  {otherParticipantName} wants to buy {product?.title}. Will you accept?
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

      <AnimatePresence>
        {showPaymentModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm grid place-items-center px-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-sm rounded-2xl bg-[#10172b] border border-white/10 p-6 shadow-2xl relative"
            >
              <h3 className="text-xl font-bold text-white mb-1">Request Payment</h3>
              <p className="text-sm text-white/50 mb-6">Enter the finalized amount to request from the buyer.</p>
              
              <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl p-4 mb-6">
                <span className="text-white/40 font-bold ml-1">Rs.</span>
                <input 
                  type="number"
                  value={paymentAmount}
                  onChange={e => setPaymentAmount(e.target.value)}
                  className="w-full bg-transparent text-white text-lg font-mono placeholder:text-white/20 focus:outline-none"
                  placeholder="e.g. 150"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && paymentAmount && !isNaN(Number(paymentAmount)) && Number(paymentAmount) > 0) {
                      handleSendPaymentRequest();
                    }
                  }}
                />
              </div>

              <div className="flex gap-3">
                <button onClick={() => setShowPaymentModal(false)} className="flex-1 py-2.5 font-semibold bg-white/5 hover:bg-white/10 rounded-full text-sm text-white/70 hover:text-white transition-colors">Cancel</button>
                <button 
                  onClick={handleSendPaymentRequest}
                  disabled={!paymentAmount || isNaN(Number(paymentAmount)) || Number(paymentAmount) <= 0}
                  className="flex-1 py-2.5 font-semibold bg-[#7890ff] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed rounded-full text-sm text-white transition-colors shadow-lg shadow-indigo-500/20"
                >
                  Send Request
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
