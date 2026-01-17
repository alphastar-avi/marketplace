import { PlusCircle, MessageCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function FloatingActions() {
  const navigate = useNavigate()

  return (
    <div className="fixed bottom-6 right-6 flex flex-col gap-4 z-50">
      <button
        onClick={() => navigate('/chats')}
        className="h-16 w-16 rounded-full bg-white/10 backdrop-blur-xl border border-white/15 text-white flex items-center justify-center"
      >
        <MessageCircle size={26} />
      </button>
      <button
        onClick={() => navigate('/list-item')}
        className="h-16 w-16 rounded-full bg-gradient-to-br from-indigo-500 to-cyan-400 flex items-center justify-center"
      >
        <PlusCircle color="white" size={26} />
      </button>
    </div>
  )
}
