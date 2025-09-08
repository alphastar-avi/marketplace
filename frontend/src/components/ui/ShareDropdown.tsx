import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Copy, Mail, MessageCircle } from 'lucide-react'

export default function ShareDropdown({ productUrl, productTitle, isOpen, onClose, triggerRef }: { productUrl: string; productTitle: string; isOpen: boolean; onClose: () => void; triggerRef: React.RefObject<HTMLElement | null> }) {
  const [copied, setCopied] = useState(false)
  const dropdownRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        onClose()
      }
    }
    if (isOpen) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen, onClose, triggerRef])

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(productUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      const textArea = document.createElement('textarea')
      textArea.value = productUrl
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleEmailShare = () => {
    const body = `Check it out ${productUrl}`
    const mailtoUrl = `mailto:?body=${encodeURIComponent(body)}`
    window.open(mailtoUrl)
    onClose()
  }

  const handleWhatsAppShare = () => {
    const text = `Check it out ${productUrl}`
    const whatsappUrl = `https://web.whatsapp.com/send?text=${encodeURIComponent(text)}`
    window.open(whatsappUrl, '_blank')
    onClose()
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        ref={dropdownRef}
        initial={{ opacity: 0, scale: 0.95, y: -10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: -10 }}
        transition={{ duration: 0.15 }}
        className="absolute top-full right-0 mt-2 w-48 bg-white/10 backdrop-blur-md border border-white/20 rounded-lg shadow-xl z-50"
      >
        <div className="p-2 space-y-1">
          <button onClick={handleCopyLink} className="w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-white/10 transition-colors text-sm">
            <Copy size={16} />
            <span>{copied ? 'Copied!' : 'Copy Link'}</span>
          </button>
          <button onClick={handleEmailShare} className="w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-white/10 transition-colors text-sm">
            <Mail size={16} />
            <span>Email</span>
          </button>
          <button onClick={handleWhatsAppShare} className="w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-white/10 transition-colors text-sm">
            <MessageCircle size={16} />
            <span>WhatsApp</span>
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
