import { useState, useRef } from 'react'
import { ArrowLeft, Heart, Share2, Trash2 } from 'lucide-react'
import { useMarketplace } from '../../state/MarketplaceContext'
import GlassCard from '../ui/GlassCard'
import ShareDropdown from '../ui/ShareDropdown'

export default function ProductFull({ productId, onBack, onOpenChat }: { productId: string; onBack: () => void; onOpenChat: (c: string) => void }) {
  const { products, addChatIfMissing, user, createPurchaseRequest, setProducts, favorites, toggleFavorite, deleteProduct } = useMarketplace()
  const prod = products.find((p) => p.id === productId)
  const [mainIndex, setMainIndex] = useState(0)
  const [showRequestSent, setShowRequestSent] = useState(false)
  const [isShareOpen, setIsShareOpen] = useState(false)
  const shareButtonRef = useRef<HTMLButtonElement>(null)

  if (!prod) return <div className="p-8">Product not found</div>

  const isOwner = prod.sellerId === user?.id
  const isFavorited = favorites.includes(prod.id)

  const startChat = async () => {
    const c = await addChatIfMissing(prod.id, [user?.id || 'guest', prod.sellerId])
    onOpenChat(c.id)
  }

  const handleRequestItem = () => {
    if (!user?.id) return
    createPurchaseRequest(prod.id, user.id, prod.sellerId)
    setShowRequestSent(true)
    setTimeout(() => setShowRequestSent(false), 3000)
  }

  const handleRemoveListing = async () => {
    if (confirm('Are you sure you want to remove this listing?')) {
      try {
        await deleteProduct(prod.id)
        onBack()
      } catch (error) {
        console.error('Failed to delete product:', error)
      }
    }
  }

  const handleToggleFavorite = () => {
    toggleFavorite(prod.id)
  }

  const handleShareClick = () => {
    setIsShareOpen(!isShareOpen)
  }

  const productUrl = `${window.location.origin}/product/${prod.id}`

  return (
    <div className="min-h-screen">
      <div className="max-w-5xl mx-auto px-4 md:px-8 py-8">
        <div className="flex items-center gap-4 mb-6">
          <button onClick={onBack} className="p-2 rounded-full bg-white/6">
            <ArrowLeft />
          </button>
          <div className="flex-1">
            <div className="text-2xl font-bold">{prod.title}</div>
            <div className="text-sm opacity-70">₹{prod.price} • {prod.condition}</div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleToggleFavorite}
              className={`p-2 rounded-md transition-colors ${isFavorited ? 'text-red-400' : 'bg-white/6'}`}
            >
              <Heart size={20} fill={isFavorited ? 'currentColor' : 'none'} />
            </button>
            <div className="relative">
              <button
                ref={shareButtonRef}
                onClick={handleShareClick}
                className="p-2 rounded-md bg-white/6"
              >
                <Share2 />
              </button>
              <ShareDropdown
                productUrl={productUrl}
                productTitle={prod.title}
                isOpen={isShareOpen}
                onClose={() => setIsShareOpen(false)}
                triggerRef={shareButtonRef}
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2">
            <div className="rounded-xl overflow-hidden bg-black/20">
              <img src={prod.images[mainIndex]} className="w-full h-[420px] object-cover" />
            </div>
            <div className="mt-3 grid grid-cols-4 gap-2">
              {prod.images.map((img, i) => (
                <img
                  key={i}
                  src={img}
                  onClick={() => setMainIndex(i)}
                  className={`h-20 w-full object-cover rounded-md cursor-pointer ${i === mainIndex ? 'ring-2 ring-indigo-400' : ''}`}
                />
              ))}
            </div>
          </div>

          <div>
            <GlassCard>
              <div className="space-y-3">
                <div className="font-semibold">Seller</div>
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 bg-white/10 rounded-full grid place-items-center">
                    {prod.seller?.avatar ? (
                      <img src={prod.seller.avatar} alt={prod.seller.name} className="h-12 w-12 rounded-full object-cover" />
                    ) : (
                      <span className="text-lg font-semibold">{prod.seller?.name?.charAt(0) || 'S'}</span>
                    )}
                  </div>
                  <div>
                    <div className="font-semibold">{prod.seller?.name || 'Unknown Seller'}</div>
                    <div className="text-xs opacity-70">{prod.seller?.year || 'N/A'} • {prod.seller?.department || 'N/A'}</div>
                  </div>
                </div>
                <div className="text-sm opacity-80">Posted: {new Date(prod.postedAt).toLocaleString()}</div>
                <div className="flex gap-2">
                  {!isOwner && prod.status === 'available' ? (
                    <button onClick={handleRequestItem} className="flex-1 py-2 rounded-md bg-gradient-to-r from-emerald-500 to-green-400 font-semibold">
                      Request Item
                    </button>
                  ) : (
                    <button onClick={() => alert('Item not available')} className="flex-1 py-2 rounded-md bg-gray-500 font-semibold cursor-not-allowed" disabled>
                      {prod.status === 'sold' ? 'Sold' : 'Requested'}
                    </button>
                  )}
                  <button onClick={startChat} className="py-2 px-3 rounded-md bg-white/6">
                    Chat
                  </button>
                </div>
                {isOwner && (
                  <button onClick={handleRemoveListing} className="w-full py-2 rounded-md bg-red-500 hover:bg-red-600 font-semibold transition-colors">
                    <Trash2 size={16} className="inline mr-2" />
                    Remove Listing
                  </button>
                )}
              </div>
            </GlassCard>

            <div className="mt-4 p-3 bg-white/3 rounded-xl">
              <div className="font-semibold mb-2">Description</div>
              <div className="text-sm opacity-90">{prod.description}</div>
            </div>
          </div>
        </div>

        {showRequestSent && (
          <div className="fixed top-4 right-4 bg-green-500 text-white p-4 rounded-lg shadow-lg z-50">Request sent to seller!</div>
        )}
      </div>
    </div>
  )
}
