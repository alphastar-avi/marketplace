import { motion } from 'framer-motion'
import { Heart, Trash2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Product } from '../../types'

export default function ProductCard({ product, isFavorited, onToggleFavorite, isAdmin, onDeleteProduct }: { product: Product; isFavorited: boolean; onToggleFavorite: () => void; isAdmin?: boolean; onDeleteProduct?: () => void }) {
  const navigate = useNavigate()
  const sellerName = product?.seller?.name || 'Unknown Seller'
  const sellerInitial = product?.seller?.name?.charAt(0)?.toUpperCase() || sellerName.charAt(0)

  const handleProductClick = () => {
    navigate(`/product/${product.id}`)
  }

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onToggleFavorite()
  }

  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -6 }}
      className={`rounded-lg sm:rounded-xl overflow-hidden bg-white/3 cursor-pointer relative shadow-2xl shadow-black/20 ${product.status === 'requested' || product.status === 'sold' ? 'opacity-60' : ''}`}
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

      {/* Image: edge-to-edge on both mobile and desktop, top corners match card */}
      <div className="aspect-[4/5] sm:aspect-auto sm:h-80 overflow-hidden mb-0 bg-black/20 grid place-items-center rounded-t-lg sm:rounded-t-xl">
        {product.images && product.images.length > 0 ? (
          <img src={product.images[0]} alt={product.title} className="h-full w-full object-cover" />
        ) : (
          <div className="text-xs opacity-70">No image</div>
        )}
      </div>

      {/* Text content: padded wrapper on mobile, no wrapper needed on desktop (card already padded) */}
      <div className="px-2.5 pt-2.5 pb-2.5">
        <div className="flex items-center justify-between mb-1.5 sm:mb-2">
          <div className="min-w-0 flex-1 mr-2">
            <div className="font-semibold text-xs sm:text-sm leading-snug mb-0.5 sm:mb-1 truncate">{product.title}</div>
            <div className="text-[10px] sm:text-xs opacity-60 sm:opacity-70">{product.category}</div>
          </div>
          <div className="text-xs sm:text-sm font-bold shrink-0">₹{product.price}</div>
        </div>
        <div className="flex items-center justify-between text-[10px] sm:text-xs opacity-80">
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
            <div className="h-5 w-5 sm:h-7 sm:w-7 rounded-full bg-white/10 grid place-items-center text-[9px] sm:text-xs font-semibold shrink-0">
              {sellerInitial}
            </div>
            <div className="text-[11px] sm:text-sm font-medium truncate">{sellerName}</div>
          </div>
          <div className="flex items-center shrink-0 ml-1">
            <button
              onClick={handleFavoriteClick}
              className={`p-1 rounded-md transition-colors ${isFavorited ? 'text-red-400' : 'hover:text-red-400'}`}
            >
              <Heart size={12} className="sm:hidden" fill={isFavorited ? 'currentColor' : 'none'} />
              <Heart size={14} className="hidden sm:block" fill={isFavorited ? 'currentColor' : 'none'} />
            </button>
          </div>
        </div>
      </div>

      {(product.status === 'requested' || product.status === 'sold') && (
        <div className="absolute bottom-3 right-3 bg-red-500 text-white text-xs px-2 py-1 rounded-full">
          {product.status === 'sold' ? 'Sold' : 'Being sold'}
        </div>
      )}
    </motion.div>
  )
}
