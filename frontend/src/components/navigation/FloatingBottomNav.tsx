import { ComponentType } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Home } from 'lucide-react'

const CarpoolIcon = ({ size = 18 }: { size?: number }) => (
	<svg
		width={size}
		height={size}
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		strokeWidth={2}
		strokeLinecap="round"
		strokeLinejoin="round"
		className="opacity-90"
	>
		<path d="M10 2h4" />
		<path d="M21 8l-2 2-1.5-3.7A2 2 0 0 0 15.646 5H8.4A2 2 0 0 0 6.497 6.257L5 10 3 8" />
		<path d="M7 14h.01M17 14h.01" />
		<rect width="18" height="8" x="3" y="10" rx="2" />
		<path d="M5 18v2m14-2v2" />
	</svg>
)

type NavItem = {
	key: 'home' | 'carpool'
	label: string
	path?: string
	icon: ComponentType<{ size?: number }>
	isActive?: (pathname: string) => boolean
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
    path: '/carpool',
    icon: CarpoolIcon,
    isActive: (pathname: string) => pathname.startsWith('/carpool'),
  },
]

export default function FloatingBottomNav() {
  const location = useLocation()
  const navigate = useNavigate()

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
      <div className="flex items-center gap-1.5 rounded-[26px] border border-white/10 bg-[rgba(7,10,20,0.82)] backdrop-blur-2xl px-2 py-1.5 shadow-[0_18px_40px_rgba(4,6,16,0.55)]">
        {navItems.map(({ key, label, path, icon: Icon, isActive }) => {
          const active = Boolean(isActive?.(location.pathname))
          const handleClick = () => {
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
              <span className={`text-sm font-medium tracking-tight ${active ? 'px-1' : 'hidden'}`}>
                {label}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
