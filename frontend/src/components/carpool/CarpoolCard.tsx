import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MapPin, Users, Calendar, Clock, ChevronDown, Loader2 } from 'lucide-react'
import type { CarpoolRide } from '../../types'

interface CarpoolCardProps {
  ride: CarpoolRide
  currentUserId: string
  joinLoading: string | null
  respondLoading: string | null
  onJoin: (rideId: string) => void
  onRespond: (requestId: string, status: 'accepted' | 'declined') => void
}

export default function CarpoolCard({
  ride,
  currentUserId,
  joinLoading,
  respondLoading,
  onJoin,
  onRespond,
}: CarpoolCardProps) {
  const [showRequests, setShowRequests] = useState(false)
  const isFull = ride.seatsAvailable === 0
  const isOwner = ride.owner?.id === currentUserId
  const hasJoined = ride.participants?.some((p) => p.id === currentUserId)
  const hasPendingRequest = ride.joinRequests?.some(
    (req) => req.requester?.id === currentUserId && req.status === 'pending'
  )
  const pendingRequestCount = ride.joinRequests?.filter((r) => r.status === 'pending').length ?? 0

  const formattedDate = new Date(ride.departureDate).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
  })

  // Format time to 12h
  const formatTime = (t: string) => {
    if (!t) return ''
    const [h, m] = t.split(':')
    const hour = parseInt(h)
    const period = hour >= 12 ? 'PM' : 'AM'
    const h12 = hour % 12 || 12
    return `${h12}:${m} ${period}`
  }

  const ownerInitial = ride.owner?.name?.charAt(0)?.toUpperCase() || '?'

  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -5 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      className={`rounded-xl overflow-hidden bg-white/3 cursor-default relative shadow-2xl shadow-black/20 flex flex-col ${isFull ? 'opacity-60' : ''}`}
      style={{ border: '1px solid rgb(50, 56, 68)' }}
    >
      {/* Colored accent top strip — direction indicator */}
      <div
        className={`px-3 py-2 flex items-center justify-between ${
          ride.direction === 'to_college'
            ? 'bg-blue-500/10 border-b border-blue-500/20'
            : 'bg-emerald-500/10 border-b border-emerald-500/20'
        }`}
      >
        <span
          className={`text-[10px] font-bold uppercase tracking-widest ${
            ride.direction === 'to_college' ? 'text-blue-400' : 'text-emerald-400'
          }`}
        >
          {ride.direction === 'to_college' ? '→ To College' : '← From College'}
        </span>
        {isFull && (
          <span className="text-[10px] font-semibold text-white/40 bg-white/5 px-2 py-0.5 rounded-full">
            Full
          </span>
        )}
      </div>

      {/* Main content */}
      <div className="px-3 pt-2.5 pb-3 flex flex-col gap-2 flex-1">
        {/* Title */}
        <div className="font-semibold text-sm leading-snug truncate">{ride.title}</div>

        {/* Route */}
        <div className="flex items-start gap-1 text-[11px] text-white/50">
          <MapPin size={11} className="mt-0.5 shrink-0 text-white/30" />
          <span className="truncate">{ride.pickupPoint} → {ride.destination}</span>
        </div>

        {/* Info pills row */}
        <div className="flex flex-wrap items-center gap-2 text-[11px] text-white/60">
          <div className="flex items-center gap-1">
            <Users size={11} className="text-white/40" />
            <span>{ride.seatsAvailable} left</span>
          </div>
          <div className="h-3 w-[1px] bg-white/10" />
          <div className="flex items-center gap-1">
            <Calendar size={11} className="text-white/40" />
            <span>{formattedDate}</span>
          </div>
          <div className="h-3 w-[1px] bg-white/10" />
          <div className="flex items-center gap-1">
            <Clock size={11} className="text-white/40" />
            <span>{formatTime(ride.departureTime)}</span>
          </div>
        </div>

        {/* Description */}
        {ride.description && (
          <p className="text-[11px] text-white/50 leading-relaxed line-clamp-2">
            {ride.description}
          </p>
        )}

        {/* Owner + action row */}
        <div className="flex items-center justify-between mt-auto pt-1.5 border-t border-white/5">
          {/* Owner */}
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-full bg-white/10 grid place-items-center text-[10px] font-semibold shrink-0">
              {ownerInitial}
            </div>
            <div>
              <div className="text-xs font-medium leading-none">{ride.owner?.name || 'Unknown'}</div>
              <div className="text-[10px] text-white/40 mt-0.5">Host</div>
            </div>
          </div>

          {/* Action */}
          {isOwner ? (
            <div className="text-[10px] text-white/40 italic">Your ride</div>
          ) : (
            <button
              disabled={joinLoading === ride.id || isFull || hasJoined || hasPendingRequest}
              onClick={() => onJoin(ride.id)}
              className={`px-3 py-1.5 rounded-full text-[11px] font-semibold flex items-center gap-1.5 transition-all ${
                hasJoined
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 cursor-default'
                  : hasPendingRequest
                  ? 'bg-white/5 text-white/40 border border-white/10 cursor-default'
                  : isFull
                  ? 'bg-white/5 text-white/30 cursor-not-allowed'
                  : 'bg-white text-slate-900 hover:bg-white/90 cursor-pointer shadow-sm'
              }`}
            >
              {joinLoading === ride.id && <Loader2 size={12} className="animate-spin" />}
              {hasJoined ? 'Joined ✓' : hasPendingRequest ? 'Requested' : isFull ? 'Full' : 'Join'}
            </button>
          )}
        </div>

        {/* Owner: Join Requests toggle */}
        {isOwner && pendingRequestCount > 0 && (
          <div>
            <button
              onClick={() => setShowRequests(!showRequests)}
              className="w-full flex items-center justify-between text-[11px] text-white/60 hover:text-white transition-colors py-1.5 border-t border-white/5 mt-1"
            >
              <span>{pendingRequestCount} join request{pendingRequestCount > 1 ? 's' : ''}</span>
              <ChevronDown
                size={13}
                className={`transition-transform duration-200 ${showRequests ? 'rotate-180' : ''}`}
              />
            </button>

            <AnimatePresence>
              {showRequests && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="pt-1.5 space-y-2">
                    {ride.joinRequests?.map((req) => (
                      <div key={req.id} className="flex items-center justify-between gap-2">
                        <div>
                          <div className="text-xs font-medium">{req.requester?.name || 'Unknown'}</div>
                          <div className="text-[10px] text-white/40 capitalize">{req.status}</div>
                        </div>
                        <div className="flex gap-1.5">
                          <button
                            disabled={respondLoading === req.id || req.status === 'accepted'}
                            onClick={() => onRespond(req.id, 'accepted')}
                            className={`px-2.5 py-1 rounded-full text-[10px] font-semibold transition-colors ${
                              req.status === 'accepted'
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : 'bg-emerald-500/80 hover:bg-emerald-500 text-white'
                            }`}
                          >
                            {respondLoading === req.id ? '...' : 'Accept'}
                          </button>
                          <button
                            disabled={respondLoading === req.id || req.status === 'declined'}
                            onClick={() => onRespond(req.id, 'declined')}
                            className={`px-2.5 py-1 rounded-full text-[10px] font-semibold transition-colors ${
                              req.status === 'declined'
                                ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                                : 'bg-red-500/70 hover:bg-red-500 text-white'
                            }`}
                          >
                            {respondLoading === req.id ? '...' : 'Decline'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </motion.div>
  )
}
