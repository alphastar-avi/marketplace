import { useEffect, useRef, useState } from 'react'
import { Search, User } from 'lucide-react'
import { useMarketplace } from '../../state/MarketplaceContext'
import { useNavigate } from 'react-router-dom'

export default function Header({ query, setQuery }: { query: string; setQuery: (s: string) => void }) {
  const headerRef = useRef<HTMLDivElement | null>(null)
  const { setUser } = useMarketplace()
  const navigate = useNavigate()
  const [isVisible, setIsVisible] = useState(true)
  const [lastScrollY, setLastScrollY] = useState(0)

  useEffect(() => {
    const onScroll = () => {
      const currentScrollY = window.scrollY

      // Show header if scrolling up or at the top
      if (currentScrollY < lastScrollY || currentScrollY < 50) {
        setIsVisible(true)
      } else if (currentScrollY > lastScrollY && currentScrollY > 50) {
        // Hide header if scrolling down and past threshold
        setIsVisible(false)
      }

      setLastScrollY(currentScrollY)

      if (headerRef.current) {
        headerRef.current.style.backdropFilter = `blur(${Math.min(12, currentScrollY / 30)}px)`
      }
    }

    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [lastScrollY])

  return (
    <div
      ref={headerRef}
      className={`sticky top-0 z-40 bg-white/3 backdrop-blur-md transition-transform duration-300 ease-in-out ${isVisible ? 'translate-y-0' : '-translate-y-full'
        }`}
      style={{ borderBottom: '1px solid rgb(134, 139, 156)' }}
    >
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
