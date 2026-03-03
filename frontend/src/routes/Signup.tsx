
import React, { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useMarketplace } from '../state/MarketplaceContext'
import { authAPI } from '../api/services'
import { ArrowRight, Chrome, LayoutGrid, UserPlus, UserCheck } from 'lucide-react'
import Dither from '../components/ui/Dither'

export default function Signup() {
  const [searchParams] = useSearchParams()

  const [formData, setFormData] = useState({
    name: searchParams.get('name') || '',
    email: searchParams.get('email') || '',
    password: '',
    year: '',
    department: '',
    college: searchParams.get('college') || ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { setUser } = useMarketplace()
  const navigate = useNavigate()

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await authAPI.register(formData)
      const { token, user } = response.data

      // Store token and user data
      localStorage.setItem('auth_token', token)
      localStorage.setItem('user', JSON.stringify(user))

      setUser(user)
      navigate('/marketplace')
    } catch (error: any) {
      setError(error.response?.data?.error || 'Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogle = () => {
    console.info('Google SSO placeholder clicked')
  }

  const handleLoginNavigation = () => {
    navigate('/login')
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

        <div className="flex-1 lg:max-w-lg lg:py-8">
          <div className="rounded-[32px] border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-xl">
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold text-white">Create an account</h2>
              <p className="text-sm text-white/60">Join the marketplace today.</p>
            </div>

            <div className="mt-8 space-y-3">


              <button
                type="button"
                onClick={handleLoginNavigation}
                className="group flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-gradient-to-r from-indigo-500/70 via-indigo-500/60 to-blue-500/70 px-4 py-3 text-left transition hover:shadow-lg hover:shadow-indigo-500/20"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-sm font-semibold text-white">
                  <UserCheck size={18} />
                </span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-white">Already have an account?</p>
                  <p className="text-xs text-white/50">Sign in instead</p>
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
                  <label htmlFor="name" className="text-xs font-semibold uppercase tracking-wide text-white/60">
                    Full Name
                  </label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    placeholder="John Doe"
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/40 outline-none transition focus:border-white/40 focus:bg-transparent"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="email" className="text-xs font-semibold uppercase tracking-wide text-white/60">
                    Email
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
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
                    name="password"
                    type="password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    minLength={6}
                    placeholder="Create a password (min 6 chars)"
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/40 outline-none transition focus:border-white/40 focus:bg-transparent"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label htmlFor="year" className="text-xs font-semibold uppercase tracking-wide text-white/60">
                      Year
                    </label>
                    <select
                      id="year"
                      name="year"
                      value={formData.year}
                      onChange={handleChange}
                      className="w-full appearance-none rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/40 outline-none transition focus:border-white/40 focus:bg-transparent"
                    >
                      <option value="" className="bg-[#030713]">Select</option>
                      <option value="Freshman" className="bg-[#030713]">Freshman</option>
                      <option value="Sophomore" className="bg-[#030713]">Sophomore</option>
                      <option value="Junior" className="bg-[#030713]">Junior</option>
                      <option value="Senior" className="bg-[#030713]">Senior</option>
                      <option value="Graduate" className="bg-[#030713]">Graduate</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="department" className="text-xs font-semibold uppercase tracking-wide text-white/60">
                      Department
                    </label>
                    <input
                      id="department"
                      name="department"
                      type="text"
                      value={formData.department}
                      onChange={handleChange}
                      placeholder="e.g. CS"
                      className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/40 outline-none transition focus:border-white/40 focus:bg-transparent"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="college" className="text-xs font-semibold uppercase tracking-wide text-white/60">
                    College Name
                  </label>
                  <input
                    id="college"
                    name="college"
                    type="text"
                    value={formData.college}
                    onChange={handleChange}
                    required
                    placeholder="e.g. New York University"
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/40 outline-none transition focus:border-white/40 focus:bg-transparent"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-white text-sm font-semibold text-[#030713] transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 py-3"
                >
                  {loading ? 'Creating Account…' : 'Create Account'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
