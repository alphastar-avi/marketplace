import { useEffect, useRef, useState } from 'react'
import { Search, User, X } from 'lucide-react'
import { useMarketplace } from '../../state/MarketplaceContext'
import { useNavigate } from 'react-router-dom'

export default function Header({ query, setQuery }: { query: string; setQuery: (s: string) => void }) {
  const headerRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const searchContainerRef = useRef<HTMLDivElement | null>(null)
  const { setUser } = useMarketplace()
  const navigate = useNavigate()
  const [isVisible, setIsVisible] = useState(true)
  const [lastScrollY, setLastScrollY] = useState(0)
  const [searchOpen, setSearchOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => {
      const currentScrollY = window.scrollY
      if (currentScrollY < lastScrollY || currentScrollY < 50) {
        setIsVisible(true)
      } else if (currentScrollY > lastScrollY && currentScrollY > 50) {
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

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setSearchOpen(false)
      }
    }
    if (searchOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [searchOpen])

  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSearchOpen(false)
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [])

  const openSearch = () => {
    setSearchOpen(true)
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  return (
    <div
      ref={headerRef}
      className={`sticky top-0 z-40 bg-white/3 backdrop-blur-md transition-transform duration-300 ease-in-out ${isVisible ? 'translate-y-0' : '-translate-y-full'}`}
      style={{ borderBottom: '1px solid rgb(134, 139, 156)' }}
    >
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-3 flex items-center justify-between">
        {/* Brand — shrinks/hides on mobile when search is open */}
        <div className={`transition-all duration-300 ease-in-out overflow-hidden ${ searchOpen ? 'max-w-0 opacity-0 md:max-w-xs md:opacity-100' : 'max-w-xs opacity-100' }`}>
          <div className="text-base md:text-xl font-bold whitespace-nowrap">College Marketplace</div>
          <div className="text-[10px] md:text-xs opacity-70 whitespace-nowrap hidden sm:block">Rajalakshmi Engineering College</div>
        </div>

        {/* Right: Search icon (expands) + Profile */}
        <div className="flex items-center gap-2">

          {/* Expandable Search */}
          <div ref={searchContainerRef} className="flex items-center justify-end">
            <div
              className={`flex items-center bg-white/6 rounded-full overflow-hidden transition-all duration-300 ease-in-out ${
                searchOpen
                  ? 'w-[calc(100vw-6rem)] sm:w-64 md:w-72 px-3 py-2'
                  : 'w-9 h-9 px-0 py-0 justify-center'
              }`}
            >
              {/* Icon always visible */}
              <button
                onClick={searchOpen ? undefined : openSearch}
                className={`shrink-0 flex items-center justify-center transition-all duration-200 ${
                  searchOpen ? 'mr-2' : 'w-9 h-9'
                }`}
                aria-label="Open search"
              >
                <Search size={16} className="text-white/70" />
              </button>

              {/* Input — shown only when open */}
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search products..."
                className={`bg-transparent outline-none text-sm text-white placeholder-white/40 transition-all duration-300 ${
                  searchOpen ? 'w-full opacity-100' : 'w-0 opacity-0 pointer-events-none'
                }`}
              />

              {/* Clear / close button */}
              {searchOpen && (
                <button
                  onClick={() => { setQuery(''); setSearchOpen(false) }}
                  className="shrink-0 ml-1 text-white/40 hover:text-white/80 transition-colors"
                  aria-label="Close search"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Profile */}
          <button onClick={() => navigate('/profile')} className="p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors shrink-0">
            <User size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}
