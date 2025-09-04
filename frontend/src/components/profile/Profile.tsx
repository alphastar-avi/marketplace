import { useEffect, useState, useRef } from 'react'
import { ArrowLeft, Camera, LogOut } from 'lucide-react'
import { useMarketplace } from '../../state/MarketplaceContext'
import { Product } from '../../types'
import GlassCard from '../ui/GlassCard'

export default function Profile({ onOpenChat, onBack, onViewProduct }: { onOpenChat: (c: string) => void; onBack: () => void; onViewProduct: (productId: string) => void }) {
  const { user, updateUser, setUser, products, chats, favorites } = useMarketplace()
  const [editing, setEditing] = useState(false)
  const [activeTab, setActiveTab] = useState<'listings' | 'favorites'>('listings')
  const [name, setName] = useState(user?.name || '')
  const [year, setYear] = useState(user?.year || '')
  const [dept, setDept] = useState(user?.department || '')
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    setName(user?.name || '')
    setYear(user?.year || '')
    setDept(user?.department || '')
  }, [user])

  const myListings = products.filter((p: Product) => p.sellerId === user?.id)
  const favoriteProducts = products.filter((p: Product) => favorites.includes(p.id))

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => updateUser({ avatar: e.target?.result as string })
      reader.readAsDataURL(file)
    }
  }

  const triggerImageUpload = () => fileInputRef.current?.click()

  const handleLogout = () => {
    if (confirm('Are you sure you want to logout?')) {
      setUser(null)
      localStorage.removeItem('cm_user_v1')
      localStorage.removeItem('auth_token')
      localStorage.removeItem('user')
      localStorage.removeItem('google_access_token')
      localStorage.removeItem('google_refresh_token')
      localStorage.removeItem('google_user_info')
      window.location.href = '/'
    }
  }

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-5xl mx-auto px-4 md:px-8">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={onBack} className="p-2 rounded-full bg-white/6">
            <ArrowLeft />
          </button>
          <h2 className="text-2xl font-bold">Profile</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <GlassCard>
              <div className="flex flex-col items-center gap-3">
                <div className="relative">
                  {user?.avatar ? (
                    <img src={user.avatar} alt={user.name} className="h-24 w-24 rounded-full object-cover" />
                  ) : (
                    <div className="h-24 w-24 rounded-full bg-white/6 grid place-items-center text-2xl font-bold">
                      {user?.name?.charAt(0) || 'U'}
                    </div>
                  )}
                  <button onClick={triggerImageUpload} className="absolute -bottom-1 -right-1 p-2 bg-indigo-500 rounded-full hover:bg-indigo-600 transition-colors">
                    <Camera size={14} />
                  </button>
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                </div>
                {!editing ? (
                  <div className="font-semibold">{user?.name}</div>
                ) : (
                  <input value={name} onChange={(e) => setName(e.target.value)} className="p-2 mt-2 bg-transparent border rounded-md w-full text-center" />
                )}
                <div className="text-xs opacity-70">{user?.year} • {user?.department}</div>
                {editing ? (
                  <div className="mt-3 flex gap-2">
                    <button onClick={() => { updateUser({ name, year, department: dept }); setEditing(false) }} className="py-2 px-3 rounded-md bg-gradient-to-r from-indigo-500 to-cyan-400">Save</button>
                    <button onClick={() => setEditing(false)} className="py-2 px-3 rounded-md bg-white/6">Cancel</button>
                  </div>
                ) : (
                  <div className="mt-3 space-y-2">
                    <button onClick={() => setEditing(true)} className="w-full py-2 px-3 rounded-md bg-white/6 hover:bg-white/10 transition-colors">Edit Profile</button>
                    <button onClick={handleLogout} className="w-full py-2 px-3 rounded-md bg-red-500/20 hover:bg-red-500/30 transition-colors text-red-400 flex items-center justify-center gap-2">
                      <LogOut size={14} />
                      Logout
                    </button>
                  </div>
                )}
              </div>
            </GlassCard>

            <GlassCard className="mt-4">
              <div className="text-sm font-semibold">Active Chats</div>
              <div className="mt-3 space-y-2">
                {chats.map((c) => (
                  <div key={c.id} className="p-2 rounded-md bg-white/4 flex items-center justify-between cursor-pointer" onClick={() => onOpenChat(c.id)}>
                    <div className="flex gap-3 items-center">
                      <div className="h-10 w-10 rounded-md bg-white/6 grid place-items-center">P</div>
                      <div>
                        <div className="font-semibold">Chat for {products.find((p: Product) => p.id === c.productId)?.title}</div>
                        <div className="text-xs opacity-70">{c.messages[c.messages.length - 1]?.text?.slice(0, 40) || 'No messages yet'}</div>
                      </div>
                    </div>
                    <div className="text-xs opacity-60">{c.messages.length ? new Date(c.messages[c.messages.length - 1].at).toLocaleTimeString() : '-'}</div>
                  </div>
                ))}
              </div>
            </GlassCard>
          </div>

          <div className="md:col-span-2">
            <div className="flex items-center gap-4 mb-4">
              <button onClick={() => setActiveTab('listings')} className={`text-lg font-semibold transition-colors ${activeTab === 'listings' ? 'text-white' : 'text-gray-400'}`}>
                My Listings ({myListings.length})
              </button>
              <button onClick={() => setActiveTab('favorites')} className={`text-lg font-semibold transition-colors ${activeTab === 'favorites' ? 'text-white' : 'text-gray-400'}`}>
                Favorites ({favoriteProducts.length})
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {activeTab === 'listings'
                ? myListings.length === 0
                  ? (<div className="col-span-full p-6 text-center opacity-80">You have no listings yet</div>)
                  : myListings.map((p) => (
                      <div key={p.id} className="p-3 bg-white/3 rounded-md cursor-pointer hover:bg-white/6 transition-colors" onClick={() => onViewProduct(p.id)}>
                        <img src={p.images[0]} className="h-28 w-full object-cover rounded-md mb-2" />
                        <div className="font-semibold">{p.title}</div>
                        <div className="text-xs opacity-70">₹{p.price}</div>
                        {p.status === 'sold' && <div className="text-xs text-red-400 mt-1">Sold</div>}
                      </div>
                    ))
                : favoriteProducts.length === 0
                  ? (<div className="col-span-full p-6 text-center opacity-80">You have no favorites yet</div>)
                  : favoriteProducts.map((p) => (
                      <div key={p.id} className="p-3 bg-white/3 rounded-md cursor-pointer hover:bg-white/6 transition-colors" onClick={() => onViewProduct(p.id)}>
                        <img src={p.images[0]} className="h-28 w-full object-cover rounded-md mb-2" />
                        <div className="font-semibold">{p.title}</div>
                        <div className="text-xs opacity-70">₹{p.price}</div>
                        {p.status === 'sold' && <div className="text-xs text-red-400 mt-1">Sold</div>}
                      </div>
                    ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
