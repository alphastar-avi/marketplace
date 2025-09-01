'use client'

import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMarketplace } from '../state/MarketplaceContext'
import ListItemPage from '../components/listing/ListItemPage'
import { motion } from 'framer-motion'

export default function ListItemRoute() {
  const navigate = useNavigate()
  const { user, isHydrated } = useMarketplace()

  useEffect(() => {
    if (!isHydrated) return
    if (!user) navigate('/')
  }, [user, navigate, isHydrated])

  const handleDone = () => navigate('/marketplace')

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
      <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -40, opacity: 0 }}>
        <ListItemPage onDone={handleDone} />
      </motion.div>
    </div>
  )
}


