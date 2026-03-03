'use client'

import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, MapPin, Users, Calendar, Clock, Loader2, RefreshCw } from 'lucide-react'
import FloatingBottomNav from '../components/navigation/FloatingBottomNav'
import GlassCard from '../components/ui/GlassCard'
import { useMarketplace } from '../state/MarketplaceContext'
import type { CarpoolRide, CarpoolJoinRequest } from '../types'

const emptyForm = {
  destination: '',
  pickupPoint: '',
  capacity: 3,
  departureDate: '',
  departureTime: '',
  direction: 'to_college' as 'to_college' | 'from_college',
  description: '',
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
  const [creating, setCreating] = useState(false)
  const [joinLoading, setJoinLoading] = useState<string | null>(null)
  const [respondLoading, setRespondLoading] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)

  useEffect(() => {
    if (!isHydrated) return
    if (!user) {
      navigate('/')
      return
    }
    refreshCarpools()
  }, [user, navigate, isHydrated, refreshCarpools])

  // ALL hooks must be called before any early return
  const sortedRides = useMemo(() => {
    return [...carpoolRides].sort((a, b) => new Date(a.departureDate).getTime() - new Date(b.departureDate).getTime())
  }, [carpoolRides])

  const canSubmit = form.destination && form.pickupPoint && form.capacity > 0 && form.departureDate && form.departureTime && form.direction

  if (!isHydrated || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0f172a] via-[#0b1220] to-[#061028] text-white font-sans flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Loading...</p>
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
    } catch (error) {
      alert('Failed to create ride. Please try again.')
    } finally {
      setCreating(false)
    }
  }

  const handleJoin = async (rideId: string) => {
    if (joinLoading) return
    setJoinLoading(rideId)
    try {
      await sendCarpoolJoinRequest(rideId)
    } catch (error) {
      alert('Failed to send join request')
    } finally {
      setJoinLoading(null)
    }
  }

  const handleRespond = async (requestId: string, status: 'accepted' | 'declined') => {
    setRespondLoading(requestId)
    try {
      await respondToCarpoolRequest(requestId, status)
    } catch (error) {
      alert('Failed to update request')
    } finally {
      setRespondLoading(null)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f172a] via-[#0b1220] to-[#061028] text-white font-sans pb-32">
      <div className="max-w-5xl mx-auto px-4 md:px-8 py-10 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.4em] text-white/50">Community</p>
            <h1 className="text-3xl font-bold mt-2">Carpooling Hub</h1>
            <p className="text-sm text-white/70 mt-1">Share rides, split costs, and travel with classmates.</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => refreshCarpools()}
              className="px-4 py-2 rounded-full border border-white/10 text-sm flex items-center gap-2 hover:bg-white/5 transition"
            >
              <RefreshCw size={16} /> Refresh
            </button>
            <button
              onClick={() => setShowCreate(true)}
              className="px-4 py-2 rounded-full bg-white/90 text-slate-900 font-semibold flex items-center gap-2"
            >
              <Plus size={16} /> Create Ride
            </button>
          </div>
        </div>

        <div className="grid gap-4">
          {sortedRides.length === 0 && (
            <div className="p-6 rounded-2xl bg-white/5 text-center text-white/70">No rides yet. Be the first to create one!</div>
          )}
          {sortedRides.map((ride) => (
            <GlassCard key={ride.id}>
              <div className="flex flex-col gap-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-xl font-semibold">{ride.destination}</h3>
                      <span
                        className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${ride.direction === 'to_college'
                          ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          }`}
                      >
                        {ride.direction === 'to_college' ? 'To College' : 'From College'}
                      </span>
                    </div>
                    <p className="text-sm text-white/70">Pickup at {ride.pickupPoint}</p>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1"><Users size={16} />{ride.seatsAvailable} seats left</div>
                    <div className="flex items-center gap-1"><Calendar size={16} />{new Date(ride.departureDate).toLocaleDateString()}</div>
                    <div className="flex items-center gap-1"><Clock size={16} />{ride.departureTime}</div>
                  </div>
                </div>

                <p className="text-sm text-white/80 leading-relaxed">{ride.description || 'No description provided.'}</p>

                <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-white/10 grid place-items-center text-base font-semibold">
                      {ride.owner?.name?.charAt(0) || 'O'}
                    </div>
                    <div>
                      <div className="font-semibold">{ride.owner?.name || 'Unknown Owner'}</div>
                      <div className="text-white/60 text-xs">Host</div>
                    </div>
                  </div>
                  {ride.owner?.id === user.id ? (
                    <div className="text-xs text-white/60">You created this ride</div>
                  ) : (
                    <button
                      disabled={
                        joinLoading === ride.id ||
                        ride.seatsAvailable === 0 ||
                        ride.participants?.some((p) => p.id === user.id) ||
                        ride.joinRequests?.some((req) => req.requester?.id === user.id && req.status === 'pending')
                      }
                      onClick={() => handleJoin(ride.id)}
                      className={`px-4 py-2 rounded-full text-sm font-semibold flex items-center gap-2 transition ${joinLoading === ride.id
                        ? 'bg-white/10 text-white/60'
                        : 'bg-white text-slate-900 hover:bg-white/90'
                        }`}
                    >
                      {joinLoading === ride.id && <Loader2 className="animate-spin" size={16} />}
                      {ride.participants?.some((p) => p.id === user.id)
                        ? 'Joined'
                        : ride.joinRequests?.some((req) => req.requester?.id === user.id && req.status === 'pending')
                          ? 'Request Sent'
                          : ride.seatsAvailable === 0
                            ? 'Full'
                            : 'Send Join Request'}
                    </button>
                  )}
                </div>

                {ride.owner?.id === user.id && (ride.joinRequests?.length ?? 0) > 0 && (
                  <div className="rounded-xl border border-white/10 p-4 space-y-3 bg-white/5">
                    <div className="text-sm font-semibold">Join Requests</div>
                    {ride.joinRequests?.map((req) => (
                      <div key={req.id} className="flex flex-wrap items-center justify-between gap-3 text-sm">
                        <div>
                          <div className="font-medium">{req.requester?.name || 'Unknown'}</div>
                          <div className="text-white/60 text-xs">Status: {req.status}</div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            disabled={respondLoading === req.id || req.status === 'accepted'}
                            onClick={() => handleRespond(req.id, 'accepted')}
                            className="px-3 py-1 rounded-full bg-emerald-500/80 text-white text-xs"
                          >
                            {respondLoading === req.id ? '...' : 'Accept'}
                          </button>
                          <button
                            disabled={respondLoading === req.id || req.status === 'declined'}
                            onClick={() => handleRespond(req.id, 'declined')}
                            className="px-3 py-1 rounded-full bg-red-500/70 text-white text-xs"
                          >
                            Decline
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </GlassCard>
          ))}
        </div>
      </div>

      <button
        onClick={() => setShowCreate(true)}
        className="fixed bottom-6 right-6 h-16 w-16 rounded-full bg-white text-slate-900 flex items-center justify-center shadow-xl"
      >
        <Plus size={22} />
      </button>

      <FloatingBottomNav />

      <AnimatePresence>
        {showCreate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm grid place-items-center px-4"
          >
            <motion.form
              onSubmit={onCreateRide}
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-lg rounded-2xl bg-[#10172b] border border-white/10 p-6 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Create Carpool Ride</h2>
                <button type="button" onClick={() => setShowCreate(false)} className="text-white/60">Close</button>
              </div>

              <div className="grid gap-3">
                <label className="text-sm text-white/70">
                  Direction
                  <select
                    value={form.direction}
                    onChange={(e) => setForm((f) => ({ ...f, direction: e.target.value as 'to_college' | 'from_college' }))}
                    className="mt-1 w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-white appearance-none cursor-pointer"
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
                    className="mt-1 w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2"
                    required
                  />
                </label>
                <label className="text-sm text-white/70">
                  Pickup Point
                  <input
                    value={form.pickupPoint}
                    onChange={(e) => setForm((f) => ({ ...f, pickupPoint: e.target.value }))}
                    className="mt-1 w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2"
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
                      onChange={(e) => setForm((f) => ({ ...f, capacity: Number(e.target.value) }))}
                      className="mt-1 w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2"
                      required
                    />
                  </label>
                  <label className="text-sm text-white/70">
                    Departure Date
                    <input
                      type="date"
                      value={form.departureDate}
                      onChange={(e) => setForm((f) => ({ ...f, departureDate: e.target.value }))}
                      className="mt-1 w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2"
                      required
                    />
                  </label>
                </div>
                <label className="text-sm text-white/70">
                  Departure Time
                  <input
                    type="time"
                    value={form.departureTime}
                    onChange={(e) => setForm((f) => ({ ...f, departureTime: e.target.value }))}
                    className="mt-1 w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2"
                    required
                  />
                </label>
                <label className="text-sm text-white/70">
                  Description
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    className="mt-1 w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2"
                    rows={3}
                  />
                </label>
              </div>

              <button
                type="submit"
                disabled={creating}
                className={`w-full rounded-full py-2.5 font-semibold flex items-center justify-center gap-2 transition ${creating
                  ? 'bg-white/40 text-slate-900/60 cursor-not-allowed'
                  : 'bg-white text-slate-900 hover:bg-white/90 cursor-pointer'
                  }`}
              >
                {creating && <Loader2 className="animate-spin" size={18} />}
                {creating ? 'Publishing...' : 'Publish Ride'}
              </button>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
