import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Clock } from 'lucide-react'

interface CustomTimePickerProps {
  value: string // Expects HH:mm (24h)
  onChange: (value: string) => void
  label?: string
}

export default function CustomTimePicker({ value, onChange, label }: CustomTimePickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [direction, setDirection] = useState<'up' | 'down'>('down')
  const containerRef = useRef<HTMLDivElement>(null)

  // Parse initial 24h value into 12h pieces
  const parseVal = (v: string) => {
    if (!v) return { hour: 9, minute: 0, period: 'AM' }
    const [h24Str, mStr] = v.split(':')
    let h24 = parseInt(h24Str)
    const m = parseInt(mStr) || 0
    const period = h24 >= 12 ? 'PM' : 'AM'
    let h12 = h24 % 12
    if (h12 === 0) h12 = 12
    return { hour: h12, minute: m, period }
  }

  const [time, setTime] = useState(parseVal(value))
  const [mode, setMode] = useState<'hours' | 'minutes'>('hours')

  useEffect(() => {
    setTime(parseVal(value))
  }, [value])

  const commitTime = (t: typeof time) => {
    let h24 = t.hour
    if (t.period === 'PM' && h24 !== 12) h24 += 12
    if (t.period === 'AM' && h24 === 12) h24 = 0
    
    const formatted = `${h24.toString().padStart(2, '0')}:${t.minute.toString().padStart(2, '0')}`
    onChange(formatted)
  }

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Don't close if clicking inside container
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  // Math for clock face
  const radius = 55
  const center = 72

  // Generate numbers for the clock face
  const numbers = mode === 'hours' 
    ? [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
    : [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55]

  // Currently selected value (use exact match)
  const currentValue = mode === 'hours' ? time.hour : time.minute

  const getAngle = (val: number) => {
    if (mode === 'hours') {
      const idx = val === 12 ? 0 : val
      return (idx * 30 * Math.PI) / 180
    } else {
      return (val / 5 * 30 * Math.PI) / 180
    }
  }

  const exactAngle = mode === 'hours' 
    ? getAngle(time.hour) 
    : (time.minute * 6 * Math.PI) / 180

  const handleNumberClick = (val: number) => {
    if (mode === 'hours') {
      const newTime = { ...time, hour: val }
      setTime(newTime)
      setMode('minutes') // Auto transition to minutes
    } else {
      const newTime = { ...time, minute: val }
      setTime(newTime)
    }
  }

  const handlePeriodChange = (p: 'AM' | 'PM') => {
    setTime({ ...time, period: p })
  }

  const handleOk = () => {
    commitTime(time)
    setIsOpen(false)
  }

  return (
    <div className="relative w-full" ref={containerRef}>
      {label && <span className="text-sm text-white/70 block mb-1">{label}</span>}
      
      {/* Input Trigger */}
      <button
        type="button"
        onClick={() => {
          if (!isOpen) {
            // Check vertical space
            if (containerRef.current) {
              const rect = containerRef.current.getBoundingClientRect()
              const spaceBelow = window.innerHeight - rect.bottom
              const spaceAbove = rect.top
              // Picker height is approx 240px after scaling
              if (spaceBelow < 240 && spaceAbove > spaceBelow) {
                setDirection('up')
              } else {
                setDirection('down')
              }
            }
            setMode('hours')
          }
          setIsOpen(!isOpen)
        }}
        className="w-full flex items-center justify-between bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm hover:border-white/20 transition-all group"
      >
        <div className="flex items-center gap-2">
          <Clock size={16} className="text-white/40 group-hover:text-white/60 transition-colors" />
          <span className="text-white">{`${time.hour.toString().padStart(2, '0')}:${time.minute.toString().padStart(2, '0')} ${time.period}`}</span>
        </div>
      </button>

      {/* Popover */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Subtle screen backdrop overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/30 z-[990] backdrop-blur-[2px]"
            />

            <motion.div
              initial={{ opacity: 0, y: direction === 'down' ? 5 : -5, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: direction === 'down' ? 5 : -5, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className={`absolute left-1/2 -translate-x-1/2 z-[999] bg-[#1a2236] backdrop-blur-3xl border border-white/20 rounded-xl shadow-[0_30px_70px_rgba(0,0,0,0.8)] overflow-hidden w-[190px] max-w-[90vw] ${
              direction === 'up' ? 'bottom-full mb-2' : 'top-full mt-2'
            }`}
          >
            {/* High-intensity 3D top-edge highlight & inner glow */}
            <div className="absolute inset-0 border border-white/10 rounded-xl pointer-events-none" />
            <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-white/40 to-transparent" />
            
            {/* Header / Digital Display */}
            <div className="bg-white/5 p-2 flex items-center justify-center gap-2">
              <div className="flex text-2xl font-light items-baseline">
                <button 
                  type="button"
                  onClick={() => setMode('hours')}
                  className={`px-2 py-1 rounded-lg transition-colors ${mode === 'hours' ? 'bg-indigo-500/20 text-indigo-400' : 'text-white/50 hover:text-white/80'}`}
                >
                  {time.hour.toString().padStart(2, '0')}
                </button>
                <span className="text-white/30 px-0.5">:</span>
                <button 
                  type="button"
                  onClick={() => setMode('minutes')}
                  className={`px-1.5 py-0.5 rounded-md transition-colors ${mode === 'minutes' ? 'bg-indigo-500/20 text-indigo-400 font-medium' : 'text-white/50 hover:text-white/80'}`}
                >
                  {time.minute.toString().padStart(2, '0')}
                </button>
              </div>

              {/* AM PM Toggle */}
              <div className="flex flex-col border border-white/10 rounded-md overflow-hidden ml-1 shrink-0 scale-90">
                <button 
                  type="button"
                  onClick={() => handlePeriodChange('AM')}
                  className={`px-2 py-1 text-xs font-semibold transition-colors ${time.period === 'AM' ? 'bg-indigo-500/20 text-indigo-400' : 'text-white/50 hover:bg-white/5'}`}
                >
                  AM
                </button>
                <div className="h-[1px] bg-white/10" />
                <button 
                  type="button"
                  onClick={() => handlePeriodChange('PM')}
                  className={`px-2 py-1 text-xs font-semibold transition-colors ${time.period === 'PM' ? 'bg-indigo-500/20 text-indigo-400' : 'text-white/50 hover:bg-white/5'}`}
                >
                  PM
                </button>
              </div>
            </div>

            {/* Clock Face */}
            <div className="p-1 flex justify-center bg-[#1a2236]">
              <div className="relative w-36 h-36 rounded-full bg-white/5 scale-90">
                {/* Center dot */}
                <div className="absolute top-[68px] left-[68px] w-2 h-2 rounded-full bg-indigo-500" />
                
                {/* Connecting Line */}
                <div 
                  className="absolute left-[71px] bottom-[72px] w-[2px] bg-indigo-500 origin-bottom transition-transform duration-300 pointer-events-none"
                  style={{
                    height: `${radius}px`,
                    transform: `rotate(${exactAngle}rad)`
                  }}
                >
                  {/* The big pointer ball at the end */}
                  <div className="absolute -top-[10px] -left-[9px] w-5 h-5 rounded-full bg-indigo-500" />
                </div>

                {/* The Numbers */}
                {numbers.map((num, i) => {
                  const angle = (i * 30 * Math.PI) / 180;
                  const x = center + radius * Math.sin(angle);
                  const y = center - radius * Math.cos(angle); 
                  const isSelected = num === currentValue;
                  
                  return (
                    <button
                      key={num}
                      type="button"
                      onClick={() => handleNumberClick(num)}
                      className={`absolute w-6 h-6 -translate-x-1/2 -translate-y-1/2 rounded-full flex items-center justify-center text-[10px] transition-colors z-10 ${
                        isSelected 
                          ? 'text-white font-semibold' 
                          : 'text-white/70 hover:bg-white/10'
                      }`}
                      style={{ left: x, top: y }}
                    >
                      {num.toString().padStart(2, '0')}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="p-2 flex justify-end gap-1 bg-[#1a2236] border-t border-white/5 mt-1">
              <button 
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-3 py-1.5 text-xs font-medium text-white/40 hover:text-white transition-colors"
              >
                CANCEL
              </button>
              <button 
                type="button"
                onClick={handleOk}
                className="px-3 py-1.5 text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                OK
              </button>
            </div>
          </motion.div>
        </>
        )}
      </AnimatePresence>
    </div>
  )
}
