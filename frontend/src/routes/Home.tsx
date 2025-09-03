'use client'

import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMarketplace } from '../state/MarketplaceContext'

export default function Home() {
  const { user, isHydrated } = useMarketplace()
  const navigate = useNavigate()

  useEffect(() => {
    if (!isHydrated) return
    if (user) navigate('/marketplace')
  }, [user, navigate, isHydrated])

  if (!isHydrated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0f172a] via-[#0b1220] to-[#061028] text-white font-sans flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    )
  }

  if (user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0f172a] via-[#0b1220] to-[#061028] text-white font-sans flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Redirecting to marketplace...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f172a] via-[#0b1220] to-[#061028] text-white font-sans flex items-center justify-center">
      <div className="text-center max-w-4xl mx-auto px-6">
        <h1 className="text-6xl font-bold mb-6 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
          Campus Marketplace
        </h1>
        <p className="text-xl text-gray-300 mb-12 leading-relaxed">
          Buy and sell with your fellow students. Find textbooks, electronics, furniture, and more from people you trust.
        </p>
        <div className="flex gap-4 justify-center">
          <button
            onClick={() => navigate('/login')}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-3 px-8 rounded-lg transition-all duration-200 transform hover:scale-105"
          >
            Sign In
          </button>
          <button
            onClick={() => navigate('/signup')}
            className="bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/20 text-white font-semibold py-3 px-8 rounded-lg transition-all duration-200"
          >
            Sign Up
          </button>
        </div>
      </div>
    </div>
  )
}


