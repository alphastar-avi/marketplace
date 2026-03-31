import { PlusCircle, MessageCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useScrollHidden } from '../../context/ScrollHideContext'

export default function FloatingActions() {
  const navigate = useNavigate()
  const hidden = useScrollHidden()

  return (
    <div
      className={`fixed bottom-24 sm:bottom-10 right-6 flex flex-col gap-3 sm:gap-4 z-50 transition-transform duration-300 ${
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
        onClick={() => navigate('/list-item')}
        className="h-14 w-14 sm:h-16 sm:w-16 rounded-full bg-gradient-to-br from-[#a7b7ff] via-[#8aa5ff] to-[#6a7dff] text-slate-950 flex items-center justify-center border border-white/20 shadow-[0_12px_28px_rgba(5,8,20,0.4)]"
      >
        <PlusCircle size={24} strokeWidth={2.2} className="sm:hidden" />
        <PlusCircle size={30} strokeWidth={2.2} className="hidden sm:block" />
      </button>
    </div>
  )
}
