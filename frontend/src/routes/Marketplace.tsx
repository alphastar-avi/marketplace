'use client'

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMarketplace } from '../state/MarketplaceContext'
import Marketplace from '../components/marketplace/Marketplace'
import ChatPage from '../components/chat/ChatPage'
import { motion, AnimatePresence } from 'framer-motion'

export default function MarketplaceRoute() {
  const navigate = useNavigate()
  const { user, isHydrated } = useMarketplace()
  const [activeChat, setActiveChat] = useState<string | null>(null)

  useEffect(() => {
    if (!isHydrated) return
    if (!user) navigate('/')
  }, [user, navigate, isHydrated])

  const openChat = (chatId: string) => setActiveChat(chatId)
  const closeChat = () => setActiveChat(null)

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
      <motion.div initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -40, opacity: 0 }}>
        <Marketplace onOpenChat={openChat} />
      </motion.div>
      <AnimatePresence>{activeChat && <ChatPage chatId={activeChat} onClose={closeChat} />}</AnimatePresence>
    </div>
  )
}


