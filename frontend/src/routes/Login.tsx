import React, { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMarketplace } from '../state/MarketplaceContext'
import { authAPI } from '../api/services'
import { ArrowRight, Chrome, LayoutGrid, UserPlus } from 'lucide-react'
import Dither from '../components/ui/Dither'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { setUser } = useMarketplace()
  const navigate = useNavigate()
  const emailInputRef = useRef<HTMLInputElement>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await authAPI.login({ email, password })
      const { token, user } = response.data

      // Store token and user data
      localStorage.setItem('auth_token', token)
      localStorage.setItem('user', JSON.stringify(user))

      setUser(user)
      navigate('/marketplace')
    } catch (error: any) {
      setError(error.response?.data?.error || 'Login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogle = () => {
    window.location.href = 'http://localhost:8080/api/auth/google/login'
  }

  const handleMicrosoft = () => {
    console.info('Microsoft SSO placeholder clicked')
  }

  const handleSignupNavigation = () => {
    navigate('/signup')
  }

  const handleEmailCTA = () => {
    emailInputRef.current?.focus()
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#030713] text-white">
      <div className="absolute inset-0 z-0 opacity-50">
        <Dither
          waveColor={[0.5, 0.5, 0.5]}
          disableAnimation={false}
          enableMouseInteraction={true}
          mouseRadius={0.3}
          colorNum={4}
          waveAmplitude={0.3}
          waveFrequency={3}
          waveSpeed={0.05}
        />
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-col gap-12 px-6 py-12 lg:flex-row lg:items-start lg:justify-between lg:py-0">
        <div className="flex-1 space-y-8 lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col lg:justify-center">

          <h1 className="text-5xl font-black leading-tight text-white sm:text-6xl lg:text-7xl">
            College Marketplace
          </h1>
          <p className="text-lg text-white/70 sm:text-xl">
            Buy and sell within your college community. Showcase listings, chat instantly, and discover campus deals—all in one modern interface.
          </p>
          <ul className="space-y-3 text-sm text-white/60">
            <li className="flex items-start gap-3">
              <span className="mt-1 h-1.5 w-1.5 rounded-full bg-white/60" />
              Curated feed tuned for college trends and micro-communities.
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-1 h-1.5 w-1.5 rounded-full bg-white/60" />
              Built-in chat so buyers and sellers can coordinate instantly.
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-1 h-1.5 w-1.5 rounded-full bg-white/60" />
              Trusted verification to keep every interaction safe.
            </li>
          </ul>
        </div>

        <div className="flex-1 lg:max-w-lg lg:py-24">
          <div className="rounded-[32px] border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-xl">
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold text-white">Welcome back</h2>
              <p className="text-sm text-white/60">Log in to continue to the marketplace.</p>
            </div>

            <div className="mt-8 space-y-3">
              <button
                type="button"
                onClick={handleGoogle}
                className="group flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left transition hover:border-white/30 hover:bg-white/10"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f1f5ff]/10 text-sm font-semibold text-white">
                  <Chrome size={18} />
                </span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-white">Continue with Google</p>
                  <p className="text-xs text-white/50">Single sign-on</p>
                </div>
                <ArrowRight size={16} className="text-white/40 group-hover:text-white/70" />
              </button>

              <button
                type="button"
                onClick={handleMicrosoft}
                className="group flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left transition hover:border-white/30 hover:bg-white/8"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5 text-sm font-semibold text-white">
                  <LayoutGrid size={18} />
                </span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-white">Continue with Microsoft</p>
                  <p className="text-xs text-white/50">Use your college credentials</p>
                </div>
                <ArrowRight size={16} className="text-white/40 group-hover:text-white/70" />
              </button>

              <button
                type="button"
                onClick={handleSignupNavigation}
                className="group flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-gradient-to-r from-indigo-500/70 via-indigo-500/60 to-blue-500/70 px-4 py-3 text-left transition hover:shadow-lg hover:shadow-indigo-500/20"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-sm font-semibold text-white">
                  <UserPlus size={18} />
                </span>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-white">Create a marketplace account</p>
                  <p className="text-xs text-white/80">Use the full signup experience</p>
                </div>
                <ArrowRight size={16} className="text-white/80" />
              </button>
            </div>

            <div className="mt-8 border-t border-white/10 pt-6">
              {error && (
                <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <label htmlFor="email" className="text-xs font-semibold uppercase tracking-wide text-white/60">
                    Email
                  </label>
                  <input
                    ref={emailInputRef}
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="student@college.edu"
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/40 outline-none transition focus:border-white/40 focus:bg-transparent"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="password" className="text-xs font-semibold uppercase tracking-wide text-white/60">
                    Password
                  </label>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="Enter your password"
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/40 outline-none transition focus:border-white/40 focus:bg-transparent"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-white text-sm font-semibold text-[#030713] transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 py-3"
                >
                  {loading ? 'Signing In…' : 'Sign in and continue'}
                </button>
              </form>


            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
