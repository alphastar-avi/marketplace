import { useState, useRef } from 'react'
import { ArrowLeft, Heart, Share2, Archive, ShieldCheck, Tag } from 'lucide-react'
import { useMarketplace } from '../../state/MarketplaceContext'
import ShareDropdown from '../ui/ShareDropdown'

export default function ProductFull({ productId, onBack, onOpenChat }: { productId: string; onBack: () => void; onOpenChat: (c: string) => void }) {
  const { products, user, createPurchaseRequest, favorites, toggleFavorite, archiveProduct, updateProductStatus, purchaseRequests } = useMarketplace()
  const prod = products.find((p) => p.id === productId)
  const [mainIndex, setMainIndex] = useState(0)
  const [showRequestSent, setShowRequestSent] = useState(false)
  const [isShareOpen, setIsShareOpen] = useState(false)
  const shareButtonRef = useRef<HTMLButtonElement>(null)

  if (!prod) return <div className="p-12 text-center text-gray-400">Product not found</div>

  const isOwner = prod.sellerId === user?.id
  const isFavorited = favorites.includes(prod.id)

  const handleRequestItem = async () => {
    if (!user?.id) return
    try {
      await createPurchaseRequest(prod.id, user.id, prod.sellerId)
      setShowRequestSent(true)
      setTimeout(() => setShowRequestSent(false), 3000)
    } catch (error: any) {
      alert(error.message || 'Failed to send request')
    }
  }

  const handleArchiveListing = async () => {
    if (confirm('This will hide your listing from the marketplace. It will be permanently deleted after 7 days. Are you sure you want to archive?')) {
      try {
        await archiveProduct(prod.id)
        onBack()
      } catch (error) {
        console.error('Failed to archive product:', error)
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
    <div className="min-h-screen text-white fade-in">
      <div className="max-w-[1400px] mx-auto px-4 md:px-8">

        {/* Page Header */}
        <div className="flex items-center justify-between py-5 mb-2">
          {/* Back Button */}
          <button
            onClick={onBack}
            className="group flex items-center gap-2 text-sm font-medium text-gray-400 hover:text-white transition-colors"
          >
            <div className="p-2 rounded-full bg-white/5 group-hover:bg-white/10 transition-colors">
              <ArrowLeft size={16} />
            </div>
            Back to Marketplace
          </button>

          {/* Like & Share Icons */}
          <div className="flex gap-2 relative">
            <button
              onClick={handleToggleFavorite}
              className="p-3 rounded-full bg-zinc-900 border border-white/5 hover:bg-zinc-800 transition-all hover:scale-105 focus:outline-none"
            >
              <Heart size={20} className={isFavorited ? 'fill-red-500 text-red-500 transition-colors' : 'text-gray-400 hover:text-white transition-colors'} />
            </button>
            <button
              ref={shareButtonRef}
              onClick={handleShareClick}
              className="p-3 rounded-full bg-zinc-900 border border-white/5 hover:bg-zinc-800 transition-all hover:scale-105 focus:outline-none text-gray-400 hover:text-white"
            >
              <Share2 size={20} />
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

        <div className="flex flex-col lg:flex-row gap-10 lg:gap-16 items-start pb-10">
          
          {/* LEFT: Image Gallery (55% width on Desktop) */}
          <div className="w-full lg:w-[55%] flex flex-col lg:sticky lg:top-24">

            {/* Main Image Container */}
            <div className="w-full aspect-square bg-zinc-900/50 rounded-3xl overflow-hidden shadow-2xl flex items-center justify-center relative group border border-white/5 backdrop-blur-3xl">
              {prod.images && prod.images.length > 0 ? (
                <img 
                  src={prod.images[mainIndex]} 
                  className="w-full h-full object-contain transition-transform duration-700 ease-in-out group-hover:scale-[1.02]" 
                  alt={prod.title}
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-white/30">
                  <Tag size={48} className="mb-4 opacity-50" />
                  <span className="text-lg">No imagery provided</span>
                </div>
              )}
            </div>

            {/* Thumbnails Row */}
            {prod.images && prod.images.length > 1 && (
              <div className="mt-4 grid grid-cols-4 md:grid-cols-6 gap-3">
                {prod.images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setMainIndex(i)}
                    className={`relative aspect-square overflow-hidden rounded-xl transition-all duration-300 ${
                      i === mainIndex 
                        ? 'ring-2 ring-white/80 opacity-100 scale-95' 
                        : 'opacity-50 hover:opacity-100 hover:scale-95'
                    }`}
                  >
                    <img src={img} className="w-full h-full object-cover" alt={`${prod.title} thumbnail ${i+1}`} />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* RIGHT: Sticky Action Sidebar (48% width on Desktop) */}
          <div className="w-full lg:w-[45%] relative">
            <div className="flex flex-col gap-5">
              
              {/* Product Header Info */}
              <div>
                {/* Title + Condition Tag inline */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <h1 className="text-xl md:text-2xl font-bold tracking-tight leading-snug text-white/90 uppercase">
                    {prod.title}
                  </h1>
                  {prod.condition && (
                    <span className="inline-flex items-center shrink-0 px-4 py-1.5 rounded-full text-sm font-semibold tracking-widest uppercase bg-white/10 text-gray-200 mt-1">
                      {prod.condition}
                    </span>
                  )}
                </div>

                <p className="text-xl font-medium mb-1 text-white">₹{prod.price}</p>
                <p className="text-sm text-gray-500">Listed on {new Date(prod.postedAt).toLocaleDateString()}</p>
              </div>

              {/* Action / Buy Card - Ultra Compact (Mobile) / Responsive (Desktop) */}
              <div className="bg-zinc-900/40 backdrop-blur-3xl rounded-xl p-5 border border-white/10 shadow-xl w-full lg:max-w-md">
                
                {/* Minimalist Seller Banner - Re-balanced Compact */}
                <div className="flex items-center justify-between mb-4 pb-4 border-b border-white/5">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 lg:h-11 lg:w-11 rounded-full overflow-hidden bg-white/5 flex items-center justify-center shrink-0 border border-white/10">
                      {prod.seller?.avatar ? (
                        <img src={prod.seller.avatar} alt={prod.seller.name} className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-sm lg:text-base font-semibold">{prod.seller?.name?.charAt(0).toUpperCase() || 'S'}</span>
                      )}
                    </div>
                    <div>
                      <div className="text-[10px] lg:text-xs uppercase tracking-[0.1em] text-gray-500 mb-0.5 font-medium">Seller</div>
                      <div className="font-semibold text-sm lg:text-base leading-none text-white/90">{prod.seller?.name || 'Unknown Seller'}</div>
                    </div>
                  </div>
                  <div className="text-right text-[10px] lg:text-xs text-gray-600 hidden sm:block">
                    <div>{prod.seller?.department || 'N/A'}</div>
                  </div>
                </div>

                {/* Main Action Buttons - Ultra Compact */}
                <div className="flex flex-col gap-2">
                  {!isOwner ? (
                    prod.status === 'sold' ? (
                      <button className="w-full py-2.5 rounded-lg bg-zinc-800 text-gray-500 font-medium text-xs cursor-not-allowed opacity-70" disabled>
                        Out of Stock
                      </button>
                    ) : (
                      (() => {
                        const existingRequest = purchaseRequests.find(r => r.productId === prod.id && r.buyerId === user?.id && (r.status === 'pending' || r.status === 'accepted'))
                        return existingRequest ? (
                          <button className="w-full py-2.5 rounded-lg bg-zinc-800/50 text-emerald-500 font-medium text-xs cursor-not-allowed border border-emerald-500/20" disabled>
                            Request Sent
                          </button>
                        ) : (
                          <button 
                            onClick={handleRequestItem} 
                            className="w-full py-2.5 rounded-lg bg-white text-black font-bold text-sm hover:bg-gray-100 hover:scale-[1.01] transition-all focus:outline-none"
                          >
                            Request to Buy
                          </button>
                        )
                      })()
                    )
                  ) : (
                    prod.status === 'sold' ? (
                      <button className="w-full py-2.5 rounded-lg bg-zinc-800 text-gray-500 font-medium text-xs cursor-not-allowed" disabled>
                        Item Sold
                      </button>
                    ) : (
                      <button 
                        onClick={() => updateProductStatus(prod.id, 'sold')} 
                        className="w-full py-2.5 rounded-lg bg-white text-black font-bold text-sm hover:bg-gray-100 hover:scale-[1.01] transition-all focus:outline-none"
                      >
                        Mark as Sold
                      </button>
                    )
                  )}

                  {/* Owner Archiving */}
                  {isOwner && (
                    <button 
                      onClick={handleArchiveListing} 
                      className="w-full py-2.5 rounded-lg bg-transparent border border-white/5 text-white/40 font-medium text-xs hover:bg-white/5 hover:text-white/60 transition-all focus:outline-none flex items-center justify-center gap-2"
                    >
                      <Archive size={14} /> Archive Listing
                    </button>
                  )}
                </div>

                {/* Trust Badge */}
                {!isOwner && (
                  <div className="mt-6 flex items-center justify-center gap-2 text-xs text-gray-500 font-medium">
                    <ShieldCheck size={16} className="text-emerald-500/80" />
                    Connect directly on campus
                  </div>
                )}
              </div>

              {/* Unified Description - Desktop and Mobile */}
              <div className="mt-3 pt-4 border-t border-white/10">
                <h2 className="text-xl font-semibold mb-4 text-white/90">About this item</h2>
                <div className="text-gray-300 leading-relaxed font-light text-base whitespace-pre-wrap">
                  {prod.description || <span className="italic opacity-50 text-sm">No description provided for this listing.</span>}
                </div>
              </div>

            </div>
          </div>
          
        </div>

        {/* Floating Success Toast */}
        {showRequestSent && (
          <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-emerald-500 text-white font-medium px-6 py-3 rounded-full shadow-[0_0_40px_rgba(16,185,129,0.4)] z-50 animate-in slide-in-from-bottom-5 fade-in duration-300">
            Request sent to seller!
          </div>
        )}
      </div>
    </div>
  )
}

