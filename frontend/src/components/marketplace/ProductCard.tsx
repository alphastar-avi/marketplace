import { motion } from 'framer-motion'
import { Heart, Share2, Trash2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useState, useRef } from 'react'
import ShareDropdown from '../ui/ShareDropdown'
import { Product } from '../../types'

export default function ProductCard({ product, isFavorited, onToggleFavorite, isAdmin, onDeleteProduct }: { product: Product; isFavorited: boolean; onToggleFavorite: () => void; isAdmin?: boolean; onDeleteProduct?: () => void }) {
  const navigate = useNavigate()
  const [isShareOpen, setIsShareOpen] = useState(false)
  const shareButtonRef = useRef<HTMLButtonElement | null>(null)

  const handleProductClick = () => {
    navigate(`/product/${product.id}`)
  }

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onToggleFavorite()
  }

  const handleShareClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsShareOpen(!isShareOpen)
  }

  const productUrl = `${window.location.origin}/product/${product.id}`

  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -6 }}
      className={`rounded-xl overflow-hidden bg-white/3 p-2.5 cursor-pointer relative shadow-2xl shadow-black/20 ${product.status === 'sold' ? 'opacity-60' : ''}`}
      style={{ border: '1px solid rgb(50, 56, 68)' }}
      onClick={handleProductClick}
    >
      {onDeleteProduct && (
        <button
          onClick={(e) => { e.stopPropagation(); onDeleteProduct(); }}
          className="absolute top-2 left-2 z-10 p-1.5 bg-red-500/80 hover:bg-red-600 text-white rounded-full shadow-lg"
          title="Delete product"
        >
          <Trash2 size={14} />
        </button>
      )}
      <div className="h-72 rounded-md overflow-hidden mb-3 bg-black/20 grid place-items-center">
        <img src={product.images[0]} alt={product.title} className="h-full w-full object-cover" />
      </div>
      <div className="flex items-center justify-between mb-2">
        <div>
          <div className="font-semibold text-sm mb-1">{product.title}</div>
          <div className="text-xs opacity-70">{product.category}</div>
        </div>
        <div className="text-sm font-bold">₹{product.price}</div>
      </div>
      <div className="flex items-center justify-between text-xs opacity-80">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-full bg-white/10 grid place-items-center text-xs">S</div>
          <div>Seller</div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleFavoriteClick}
            className={`p-1 rounded-md transition-colors ${isFavorited ? 'text-red-400' : 'hover:text-red-400'}`}
          >
            <Heart size={14} fill={isFavorited ? 'currentColor' : 'none'} />
          </button>
          <div className="relative">
            <button
              ref={shareButtonRef}
              onClick={handleShareClick}
              className="p-1 rounded-md hover:text-blue-400 transition-colors"
            >
              <Share2 size={14} />
            </button>
            <ShareDropdown
              productUrl={productUrl}
              productTitle={product.title}
              isOpen={isShareOpen}
              onClose={() => setIsShareOpen(false)}
              triggerRef={shareButtonRef}
            />
          </div>
        </div>
      </div>

      {product.status === 'sold' && (
        <div className="absolute bottom-3 right-3 bg-red-500 text-white text-xs px-2 py-1 rounded-full">
          Being sold
        </div>
      )}
    </motion.div>
  )
}
