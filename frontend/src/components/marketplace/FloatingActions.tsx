import { PlusCircle, MessageCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function FloatingActions() {
  const navigate = useNavigate()

  return (
    <div className="fixed bottom-6 right-6 flex flex-col gap-3 z-50">
      <button onClick={() => navigate('/chats')} className="p-3 rounded-full bg-white/6 backdrop-blur-md border border-white/6">
        <MessageCircle />
      </button>
      <button onClick={() => navigate('/list-item')} className="p-4 rounded-full bg-gradient-to-br from-indigo-500 to-cyan-400 shadow-lg">
        <PlusCircle color="white" />
      </button>
    </div>
  )
}
