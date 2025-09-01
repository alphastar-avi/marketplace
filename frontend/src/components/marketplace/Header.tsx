import { useEffect, useRef } from 'react'
import { Search, User } from 'lucide-react'
import { useMarketplace } from '../../state/MarketplaceContext'
import { useNavigate } from 'react-router-dom'

export default function Header({ query, setQuery }: { query: string; setQuery: (s: string) => void }) {
  const headerRef = useRef<HTMLDivElement | null>(null)
  const { setUser } = useMarketplace()
  const navigate = useNavigate()

  useEffect(() => {
    const onScroll = () => {
      if (!headerRef.current) return
      const y = window.scrollY
      headerRef.current!.style.backdropFilter = `blur(${Math.min(12, y / 30)}px)`
    }
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div ref={headerRef} className="sticky top-0 z-40 bg-white/3 backdrop-blur-md" style={{ borderBottom: '1px solid rgb(134, 139, 156)' }}>
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-3 flex items-center justify-between">
        <div>
          <div className="text-xl font-bold">College Marketplace</div>
          <div className="text-xs opacity-70">Rajalakshmi Engineering College</div>
        </div>
        <div className="flex items-center gap-3 w-1/3 min-w-[220px]">
          <div className="flex items-center bg-white/6 rounded-full px-3 py-2 w-full">
            <Search size={16} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search products..."
              className="bg-transparent outline-none ml-2 w-full text-sm"
            />
          </div>
          <button onClick={() => navigate('/profile')} className="p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors">
            <User size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}
