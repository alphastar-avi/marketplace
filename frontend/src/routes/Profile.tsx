'use client'

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMarketplace } from '../state/MarketplaceContext'
import Profile from '../components/profile/Profile'
import ChatPage from '../components/chat/ChatPage'
import { motion, AnimatePresence } from 'framer-motion'

export default function ProfileRoute() {
  const navigate = useNavigate()
  const { user, isHydrated } = useMarketplace()
  const [activeChat, setActiveChat] = useState<string | null>(null)

  useEffect(() => {
    if (!isHydrated) return
    if (!user) navigate('/')
  }, [user, navigate, isHydrated])

  const handleBack = () => navigate('/marketplace')
  const handleOpenChat = (chatId: string) => setActiveChat(chatId)
  const closeChat = () => setActiveChat(null)
  const handleViewProduct = (productId: string) => navigate(`/product/${productId}`)

  if (!isHydrated || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0f172a] via-[#0b1220] to-[#061028] text-white font-sans flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f172a] via-[#0b1220] to-[#061028] text-white font-sans">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
        <Profile onOpenChat={handleOpenChat} onBack={handleBack} onViewProduct={handleViewProduct} />
      </motion.div>
      <AnimatePresence>{activeChat && <ChatPage chatId={activeChat} onClose={closeChat} />}</AnimatePresence>
    </div>
  )
}


