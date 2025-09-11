import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useMarketplace } from '../../state/MarketplaceContext'
import { placeholderImage, nowIso } from '../../utils'
import Header from './Header'
import ProductCard from './ProductCard'
import FloatingActions from './FloatingActions'
import { Product } from '../../types'

export default function Marketplace({ onOpenChat }: { onOpenChat: (chatId: string) => void }) {
  const { products, setProducts, favorites, toggleFavorite, user, deleteProduct } = useMarketplace()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [filtered, setFiltered] = useState<Product[]>(products || [])
  const isAdmin = Boolean(user?.isAdmin)

  useEffect(() => {
    const q = query.trim().toLowerCase()
    // Filter out user's own products from marketplace
    const otherUsersProducts = products?.filter((p: Product) => p.sellerId !== user?.id) || []
    
    if (!q) return setFiltered(otherUsersProducts)
    if (!otherUsersProducts.length) return setFiltered([])
    setFiltered(otherUsersProducts.filter((p: Product) => (p.title + ' ' + p.description + ' ' + p.tags.join(' ')).toLowerCase().includes(q)))
  }, [query, products, user?.id])

  // Removed dummy product creation that was interfering with real data

  const handleDeleteProduct = async (id: string) => {
    await deleteProduct(id)
  }

  return (
    <div className="min-h-screen pb-24">
      <Header query={query} setQuery={setQuery} />
      <main className="max-w-7xl mx-auto px-4 md:px-8 pt-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Explore Marketplace</h2>
          <div className="text-sm opacity-80">Results: {filtered.length}</div>
        </div>
        <motion.div layout className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {filtered.length === 0 ? (
            <div className="col-span-full p-8 text-center opacity-80">No products found — try another search.</div>
          ) : (
            filtered.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                isFavorited={favorites.includes(p.id)}
                onToggleFavorite={() => toggleFavorite(p.id)}
                isAdmin={isAdmin}
                onDeleteProduct={user && p.sellerId === user.id ? () => handleDeleteProduct(p.id) : undefined}
              />
            ))
          )}
        </motion.div>
      </main>
      <FloatingActions />
    </div>
  )
}
