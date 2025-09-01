import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { User, Mail, Chrome } from 'lucide-react'
import { useMarketplace } from '../../state/MarketplaceContext'
import GlassCard from '../ui/GlassCard'
import Spinner from '../ui/Spinner'
import { uid } from '../../utils'

export default function Login({ onLogin }: { onLogin?: () => void }) {
  const { updateUser } = useMarketplace()
  const [loading, setLoading] = useState(false)
  const [showAdminForm, setShowAdminForm] = useState(false)
  const [otpSent, setOtpSent] = useState(false)
  const [form, setForm] = useState({ email: '', password: '', otp: '' })

  const handleSignInClick = (provider: 'google' | 'microsoft' | 'admin' | 'demo') => {
    if (provider === 'google') {
      return
    }
    if (provider === 'admin') {
      setShowAdminForm(true)
      setForm((prev) => ({ ...prev, email: 'admin@gmail.com' }))
      return
    }
    const info = provider === 'microsoft'
      ? { id: uid('u'), name: 'Microsoft User', email: 'user@outlook.com', avatar: 'https://via.placeholder.com/150', role: 'user' }
      : { id: uid('u'), name: 'Demo User', email: 'demo@example.com', avatar: 'https://via.placeholder.com/150', role: 'user' }

    updateUser(info)
    onLogin?.()
  }

  const handleAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!otpSent) {
      setLoading(true)
      setTimeout(() => { setOtpSent(true); setLoading(false) }, 1000)
    } else {
      setLoading(true)
      setTimeout(() => {
        const emailLower = form.email.toLowerCase()
        if (emailLower === 'admin@gmail.com') {
          updateUser({ id: uid('u'), name: form.email.split('@')[0], email: form.email, avatar: 'https://via.placeholder.com/150', role: 'admin' })
          setLoading(false)
          onLogin?.()
          return
        }
      }, 1000)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
        <div className="space-y-6">
          <motion.h1 initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="text-4xl md:text-6xl font-extrabold">College Marketplace</motion.h1>
          <motion.p initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="text-sm opacity-80">Buy, sell and chat with fellow students — built for campus life.</motion.p>
          <AnimatePresence mode="wait">
            {!showAdminForm && (
              <motion.div key="signin" initial={{ opacity: 1 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }}>
                <GlassCard>
                  <div className="space-y-4">
                    <p className="font-semibold">Sign in</p>
                    <div className="flex gap-3">
                      <button onClick={() => handleSignInClick('google')} className="flex-1 py-2 rounded-lg transition-colors flex items-center justify-center gap-2 bg-white/6 hover:bg-white/8" title="Google sign-in disabled">
                        <Chrome size={16} /> <span className="text-sm">Google</span>
                      </button>
                      <button onClick={() => handleSignInClick('microsoft')} className="flex-1 py-2 rounded-lg transition-colors flex items-center justify-center gap-2 bg-white/6 hover:bg-white/8">
                        <User size={16} /> <span className="text-sm">Microsoft</span>
                      </button>
                      <button onClick={() => handleSignInClick('admin')} className="flex-1 py-2 rounded-lg transition-colors flex items-center justify-center gap-2 bg-white/6 hover:bg-white/8">
                        <Mail size={16} /> <span className="text-sm">Admin</span>
                      </button>
                    </div>
                    <div className="pt-1">
                      <button onClick={() => handleSignInClick('demo')} className="w-full py-2 rounded-lg bg-gradient-to-r from-indigo-500 to-cyan-400 font-semibold">
                        Continue as Demo User
                      </button>
                    </div>
                  </div>
                </GlassCard>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <AnimatePresence mode="wait">
          {!showAdminForm ? (
            <motion.div key="tour" initial={{ scale: 0.98, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.98, opacity: 0, y: 20 }} transition={{ duration: 0.3 }} className="w-full">
              <div className="rounded-3xl overflow-hidden shadow-2xl border border-white/5">
                <div className="p-6 bg-gradient-to-b from-white/3 to-transparent h-full min-h-[320px]">
                  <h3 className="text-lg font-bold">Quick Tour</h3>
                  <ul className="mt-3 space-y-2 text-sm opacity-90">
                    <li>• Search and filter products instantly.</li>
                    <li>• Full-screen product views with gallery.</li>
                    <li>• Real-time chat simulation with sellers.</li>
                    <li>• List items with drag & drop upload.</li>
                  </ul>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div key="admin-form" initial={{ scale: 0.98, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.98, opacity: 0, y: 20 }} transition={{ duration: 0.3 }} className="w-full">
              <div className="rounded-3xl overflow-hidden shadow-2xl border border-white/5">
                <div className="p-6 bg-gradient-to-b from-white/3 to-transparent">
                  <h3 className="text-lg font-bold mb-4">Admin Login</h3>
                  <form onSubmit={handleAdminSubmit} className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold mb-2">Email ID</label>
                      <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full p-3 bg-white/10 rounded-lg border border-white/20 focus:border-indigo-400 focus:outline-none transition-colors text-white placeholder-gray-300" placeholder="Enter your email" required />
                    </div>
                    {!otpSent && (
                      <div>
                        <label className="block text-sm font-semibold mb-2">Password</label>
                        <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="w-full p-3 bg-white/10 rounded-lg border border-white/20 focus:border-indigo-400 focus:outline-none transition-colors text-white placeholder-gray-300" placeholder="Enter your password" required />
                      </div>
                    )}
                    {otpSent && (
                      <div>
                        <label className="block text-sm font-semibold mb-2">OTP Code</label>
                        <input type="text" value={form.otp} onChange={(e) => setForm({ ...form, otp: e.target.value })} className="w-full p-3 bg-white/10 rounded-lg border border-white/20 focus:border-indigo-400 focus:outline-none transition-colors text-white placeholder-gray-300" placeholder="Enter 6-digit OTP" maxLength={6} required />
                        <p className="text-xs text-gray-300 mt-1">We've sent a 6-digit code to your email</p>
                      </div>
                    )}
                    <button type="submit" className="w-full py-3 rounded-lg bg-gradient-to-r from-indigo-500 to-cyan-400 font-semibold mt-6 hover:from-indigo-600 hover:to-cyan-500 transition-all duration-200" disabled={loading}>
                      {loading ? <Spinner /> : (otpSent ? 'Verify' : 'Send OTP')}
                    </button>
                  </form>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
