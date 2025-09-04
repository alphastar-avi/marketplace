import { useState } from 'react'
import { useMarketplace } from '../state/MarketplaceContext'
import ChatsList from '../components/chat/ChatsList'
import ChatInterface from '../components/chat/ChatInterface'
import Header from '../components/marketplace/Header'

export default function ChatsRoute() {
  const { user } = useMarketplace()
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null)

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#081028] to-[#04101f] flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Please log in to view chats</h2>
          <p className="text-white/60">You need to be logged in to access your messages.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#081028] to-[#04101f]">
      <Header query="" setQuery={() => {}} />
      
      <div className="flex h-[calc(100vh-80px)]">
        {/* Chat List Sidebar */}
        <div className="w-full md:w-96 border-r border-white/10">
          <ChatsList 
            selectedChatId={selectedChatId}
            onSelectChat={setSelectedChatId}
          />
        </div>

        {/* Chat Interface */}
        <div className="hidden md:flex flex-1">
          {selectedChatId ? (
            <ChatInterface 
              chatId={selectedChatId}
              onClose={() => setSelectedChatId(null)}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="w-32 h-32 mx-auto mb-6 rounded-full bg-white/5 flex items-center justify-center">
                  <svg className="w-16 h-16 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-2">Select a chat to start messaging</h3>
                <p className="text-white/60">Choose from your existing conversations on the left</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Chat Interface Overlay */}
      {selectedChatId && (
        <div className="md:hidden fixed inset-0 z-50">
          <ChatInterface 
            chatId={selectedChatId}
            onClose={() => setSelectedChatId(null)}
            isMobile={true}
          />
        </div>
      )}
    </div>
  )
}
