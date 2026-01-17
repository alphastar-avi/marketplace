import { useLocation, useNavigate } from 'react-router-dom'
import { Home, CarFront } from 'lucide-react'

type NavItem = {
  key: 'home' | 'carpool'
  label: string
  path?: string
  icon: typeof Home
  isActive?: (pathname: string) => boolean
  comingSoon?: boolean
}

const navItems: NavItem[] = [
  {
    key: 'home',
    label: 'Home',
    path: '/marketplace',
    icon: Home,
    isActive: (pathname: string) => pathname === '/marketplace' || pathname.startsWith('/product'),
  },
  {
    key: 'carpool',
    label: 'CarPooling',
    icon: CarFront,
    comingSoon: true,
    isActive: () => false,
  },
]

export default function FloatingBottomNav() {
  const location = useLocation()
  const navigate = useNavigate()

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
      <div className="flex items-center gap-1.5 rounded-[26px] border border-white/10 bg-[rgba(7,10,20,0.82)] backdrop-blur-2xl px-2 py-1.5 shadow-[0_18px_40px_rgba(4,6,16,0.55)]">
        {navItems.map(({ key, label, path, icon: Icon, isActive, comingSoon }) => {
          const active = Boolean(isActive?.(location.pathname))
          const handleClick = () => {
            if (comingSoon) {
              alert('CarPooling is coming soon!')
              return
            }
            if (path) navigate(path)
          }
          return (
            <button
              key={key}
              onClick={handleClick}
              type="button"
              className={`flex items-center gap-2 rounded-[20px] px-2.5 py-1.5 text-sm transition-all duration-200 focus-visible:outline-none ${
                active
                  ? 'bg-white/10 text-white shadow-[0_10px_22px_rgba(3,7,18,0.4)]'
                  : 'text-white/55 hover:text-white'
              }`}
            >
              <div className={`h-10 w-10 rounded-[18px] grid place-items-center border border-white/10 ${active ? 'bg-[rgba(255,255,255,0.15)] text-white' : 'bg-white/5 text-white/60'}`}>
                <Icon size={18} />
              </div>
              <span className={`text-sm font-medium tracking-tight ${comingSoon ? 'opacity-60' : ''} ${active ? 'px-1' : 'hidden'}`}>
                {comingSoon ? `${label} · soon` : label}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
