'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Users, RefreshCw, User, PlusCircle, MessageCircle } from 'lucide-react'
import FloatingBottomNav from '../components/navigation/FloatingBottomNav'
import { ScrollHideProvider, useScrollHidden } from '../context/ScrollHideContext'
import CarpoolCard from '../components/carpool/CarpoolCard'
import CustomTimePicker from '../components/ui/CustomTimePicker'
import { useMarketplace } from '../state/MarketplaceContext'

const emptyForm = {
  title: '',
  destination: '',
  pickupPoint: '',
  capacity: 3,
  departureDate: '',
  departureTime: '',
  direction: 'to_college' as 'to_college' | 'from_college',
  description: '',
}


function CarpoolFloatingActions({ onAdd }: { onAdd: () => void }) {
  const hidden = useScrollHidden()
  const navigate = useNavigate()

  return (
    <div
      className={`fixed bottom-24 sm:bottom-10 right-6 flex flex-col gap-3 sm:gap-4 z-30 transition-transform duration-300 ${
        hidden ? 'translate-y-20' : 'translate-y-0'
      }`}
    >
      <button
        onClick={() => navigate('/chats')}
        className="h-14 w-14 sm:h-16 sm:w-16 rounded-full bg-white/10 backdrop-blur-xl border border-white/15 text-white flex items-center justify-center shadow-[0_10px_25px_rgba(5,8,20,0.35)]"
      >
        <MessageCircle size={22} className="sm:hidden" />
        <MessageCircle size={26} className="hidden sm:block" />
      </button>
      <button
        onClick={onAdd}
        className="h-14 w-14 sm:h-16 sm:w-16 rounded-full bg-gradient-to-br from-[#a7b7ff] via-[#8aa5ff] to-[#6a7dff] text-slate-950 flex items-center justify-center border border-white/20 shadow-[0_12px_28px_rgba(5,8,20,0.4)]"
      >
        <PlusCircle size={24} strokeWidth={2.2} className="sm:hidden" />
        <PlusCircle size={30} strokeWidth={2.2} className="hidden sm:block" />
      </button>
    </div>
  )
}

export default function CarpoolRoute() {
  const navigate = useNavigate()
  const {
    user,
    isHydrated,
    carpoolRides,
    createCarpoolRide,
    sendCarpoolJoinRequest,
    respondToCarpoolRequest,
    refreshCarpools,
  } = useMarketplace()

  const [showCreate, setShowCreate] = useState(false)
  const [showOnlyMine, setShowOnlyMine] = useState(false)
  const [creating, setCreating] = useState(false)
  const [joinLoading, setJoinLoading] = useState<string | null>(null)
  const [respondLoading, setRespondLoading] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)

  // Sticky header scroll-hide — mirrors marketplace Header.tsx
  const headerRef = useRef<HTMLDivElement>(null)
  const [headerVisible, setHeaderVisible] = useState(true)
  const [lastScrollY, setLastScrollY] = useState(0)

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY
      if (y < lastScrollY || y < 50) setHeaderVisible(true)
      else if (y > lastScrollY && y > 50) setHeaderVisible(false)
      setLastScrollY(y)
      if (headerRef.current) {
        headerRef.current.style.backdropFilter = `blur(${Math.min(12, y / 30)}px)`
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [lastScrollY])

  useEffect(() => {
    if (!isHydrated) return
    if (!user) { navigate('/'); return }
    refreshCarpools()
  }, [user, navigate, isHydrated, refreshCarpools])

  const displayRides = useMemo(() => {
    if (!user) return carpoolRides
    const rides = showOnlyMine
      ? carpoolRides.filter((ride) => ride.owner.id === user.id)
      : carpoolRides.filter((ride) => ride.owner.id !== user.id)
    return [...rides].sort(
      (a, b) => new Date(a.departureDate).getTime() - new Date(b.departureDate).getTime()
    )
  }, [carpoolRides, showOnlyMine, user])

  const canSubmit =
    form.title &&
    form.destination &&
    form.pickupPoint &&
    form.capacity > 0 &&
    form.departureDate &&
    form.departureTime &&
    form.direction

  if (!isHydrated || !user) {
    return (
      <div className="min-h-screen text-white font-sans flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4" />
          <p className="text-white/60">Loading...</p>
        </div>
      </div>
    )
  }

  const onCreateRide = async (e: React.FormEvent) => {
    e.preventDefault()
    if (creating) return
    setCreating(true)
    try {
      await createCarpoolRide(form)
      setForm(emptyForm)
      setShowCreate(false)
    } catch {
      alert('Failed to create ride. Please try again.')
    } finally {
      setCreating(false)
    }
  }

  const handleJoin = async (rideId: string) => {
    if (joinLoading) return
    setJoinLoading(rideId)
    try { await sendCarpoolJoinRequest(rideId) }
    catch { alert('Failed to send join request') }
    finally { setJoinLoading(null) }
  }

  const handleRespond = async (requestId: string, status: 'accepted' | 'declined') => {
    setRespondLoading(requestId)
    try { await respondToCarpoolRequest(requestId, status) }
    catch { alert('Failed to update request') }
    finally { setRespondLoading(null) }
  }

  return (
    <ScrollHideProvider>
      <div className="min-h-screen text-white font-sans pb-32">

        {/* ─── Sticky Header (matches Marketplace header style) ─── */}
        <div
          ref={headerRef}
          className={`sticky top-0 z-40 bg-white/3 backdrop-blur-md transition-transform duration-300 ease-in-out ${headerVisible ? 'translate-y-0' : '-translate-y-full'}`}
          style={{ borderBottom: '1px solid rgb(134, 139, 156)' }}
        >
          <div className="max-w-7xl mx-auto px-4 md:px-8 py-3 flex items-center justify-between gap-4">
            {/* Brand */}
            <div className="min-w-0">
              <div className="text-base md:text-xl font-bold whitespace-nowrap truncate">Carpooling Hub</div>
              <div className="text-[10px] md:text-xs opacity-70 whitespace-nowrap hidden sm:block truncate">
                Share rides · Split costs · Travel together
              </div>
            </div>

            {/* Right controls */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <button
                onClick={() => refreshCarpools()}
                className="p-2 rounded-full border border-white/10 text-white/50 hover:bg-white/5 transition hover:text-white shrink-0"
                title="Refresh"
              >
                <RefreshCw size={14} />
              </button>

              {/* All Rides / My Listings toggle pill */}
              <div className="flex bg-white/5 p-0.5 rounded-full border border-white/10">
                <button
                  onClick={() => setShowOnlyMine(false)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition-all duration-200 ${
                    !showOnlyMine
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-white/50 hover:text-white'
                  }`}
                >
                  All Rides
                </button>
                <button
                  onClick={() => setShowOnlyMine(true)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition-all duration-200 ${
                    showOnlyMine
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-white/50 hover:text-white'
                  }`}
                >
                  My Rides
                </button>
              </div>

              <button
                onClick={() => navigate('/profile')}
                className="p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors shrink-0"
              >
                <User size={15} />
              </button>
            </div>
          </div>
        </div>

        {/* ─── Main content ─── */}
        <main className="max-w-7xl mx-auto px-4 md:px-8 pt-8">
          {/* Section title — mirrors "Explore Marketplace" + result count */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">
              {showOnlyMine ? 'My Rides' : 'Available Rides'}
            </h2>
            <div className="text-sm opacity-70">
              {displayRides.length} ride{displayRides.length !== 1 ? 's' : ''}
            </div>
          </div>

          {/* ─── Grid — matches marketplace grid ─── */}
          <motion.div
            layout
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
          >
            {displayRides.length === 0 ? (
              <div className="col-span-full p-12 text-center flex flex-col items-center gap-4">
                <div className="h-16 w-16 rounded-full bg-white/5 grid place-items-center">
                  <Users size={28} className="opacity-20" />
                </div>
                <p className="opacity-50 text-sm">
                  {showOnlyMine
                    ? "You haven't posted any rides yet."
                    : carpoolRides.length === 0
                    ? 'No rides yet. Be the first to create one!'
                    : 'No other rides available right now.'}
                </p>
              </div>
            ) : (
              displayRides.map((ride) => (
                <CarpoolCard
                  key={ride.id}
                  ride={ride}
                  currentUserId={user.id}
                  joinLoading={joinLoading}
                  respondLoading={respondLoading}
                  onJoin={handleJoin}
                  onRespond={handleRespond}
                />
              ))
            )}
          </motion.div>
        </main>

        <CarpoolFloatingActions onAdd={() => setShowCreate(true)} />

        <FloatingBottomNav />

        {/* ─── Create Ride Modal ─── */}
        <AnimatePresence>
          {showCreate && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm grid place-items-center px-4"
              onClick={(e) => { if (e.target === e.currentTarget) setShowCreate(false) }}
            >
              <motion.form
                onSubmit={onCreateRide}
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="w-full max-w-lg rounded-2xl bg-[#10172b] border border-white/10 p-6 space-y-4 max-h-[90vh] overflow-y-auto"
                style={{ borderTop: '1px solid rgba(255,255,255,0.15)' }}
              >
                {/* top highlight */}
                <div className="absolute top-0 left-6 right-6 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent rounded-full" />

                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold">Create Carpool Ride</h2>
                  <button
                    type="button"
                    onClick={() => setShowCreate(false)}
                    className="text-white/40 hover:text-white transition-colors text-sm"
                  >
                    Close
                  </button>
                </div>

                <div className="grid gap-3">
                  <label className="text-sm text-white/70">
                    Ride Title
                    <input
                      value={form.title}
                      onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                      className="mt-1 w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 outline-none focus:border-white/30 transition text-white placeholder-white/30"
                      placeholder="e.g. Morning ride to college"
                      required
                    />
                  </label>

                  <label className="text-sm text-white/70">
                    Direction
                    <select
                      value={form.direction}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          direction: e.target.value as 'to_college' | 'from_college',
                        }))
                      }
                      className="mt-1 w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-white appearance-none cursor-pointer outline-none focus:border-white/30 transition"
                      required
                    >
                      <option value="to_college" className="bg-[#10172b]">To College</option>
                      <option value="from_college" className="bg-[#10172b]">From College</option>
                    </select>
                  </label>

                  <label className="text-sm text-white/70">
                    Destination
                    <input
                      value={form.destination}
                      onChange={(e) => setForm((f) => ({ ...f, destination: e.target.value }))}
                      className="mt-1 w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 outline-none focus:border-white/30 transition text-white placeholder-white/30"
                      placeholder="e.g. Rajalakshmi Engineering College"
                      required
                    />
                  </label>

                  <label className="text-sm text-white/70">
                    Pickup Point
                    <input
                      value={form.pickupPoint}
                      onChange={(e) => setForm((f) => ({ ...f, pickupPoint: e.target.value }))}
                      className="mt-1 w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 outline-none focus:border-white/30 transition text-white placeholder-white/30"
                      placeholder="e.g. Porur Metro Station"
                      required
                    />
                  </label>

                  <div className="grid grid-cols-2 gap-3">
                    <label className="text-sm text-white/70">
                      Capacity
                      <input
                        type="number"
                        min={1}
                        value={form.capacity}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, capacity: Number(e.target.value) }))
                        }
                        className="mt-1 w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 outline-none focus:border-white/30 transition text-white"
                        required
                      />
                    </label>
                    <label className="text-sm text-white/70">
                      Departure Date
                      <input
                        type="date"
                        value={form.departureDate}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, departureDate: e.target.value }))
                        }
                        className="mt-1 w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 outline-none focus:border-white/30 transition text-white"
                        required
                      />
                    </label>
                  </div>

                  <CustomTimePicker
                    label="Departure Time"
                    value={form.departureTime}
                    onChange={(val) => setForm((f) => ({ ...f, departureTime: val }))}
                  />

                  <label className="text-sm text-white/70">
                    Description
                    <textarea
                      value={form.description}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, description: e.target.value }))
                      }
                      className="mt-1 w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 outline-none focus:border-white/30 transition text-white placeholder-white/30 resize-none"
                      rows={3}
                      placeholder="Any extra details for riders..."
                    />
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={!canSubmit || creating}
                  className={`w-full rounded-full py-2.5 font-semibold flex items-center justify-center gap-2 transition ${
                    creating || !canSubmit
                      ? 'bg-white/20 text-white/40 cursor-not-allowed'
                      : 'bg-white text-slate-900 hover:bg-white/90 cursor-pointer'
                  }`}
                >
                  {creating && (
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                  )}
                  {creating ? 'Publishing...' : 'Publish Ride'}
                </button>
              </motion.form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </ScrollHideProvider>
  )
}
