'use client'

import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMarketplace } from '../state/MarketplaceContext'

export default function AuthCallback() {
  const { updateUser } = useMarketplace()
  const navigate = useNavigate()

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search)
      const userInfoRaw = params.get('user_info')
      if (userInfoRaw) {
        const info = JSON.parse(userInfoRaw) as { id: string; name: string; email?: string; picture?: string }
        updateUser({ id: info.id, name: info.name, email: info.email, avatar: info.picture })
      }
    } catch {}
    navigate('/marketplace')
  }, [navigate, updateUser])

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f172a] via-[#0b1220] to-[#061028] text-white font-sans flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
        <p>Signing you in...</p>
      </div>
    </div>
  )
}


