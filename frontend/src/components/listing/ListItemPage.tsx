import { useState, useRef } from 'react'
import { ArrowLeft, X } from 'lucide-react'
import { useMarketplace } from '../../state/MarketplaceContext'
import { productsAPI } from '../../api/services'
import GlassCard from '../ui/GlassCard'
import Spinner from '../ui/Spinner'
import { Product } from '../../types'

export default function ListItemPage({ onDone }: { onDone: () => void }) {
  const { addProduct, setProducts, user } = useMarketplace()
  const [title, setTitle] = useState('')
  const [price, setPrice] = useState(0)
  const [condition, setCondition] = useState<Product['condition']>('Good')
  const [category, setCategory] = useState('Books')
  const [desc, setDesc] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [images, setImages] = useState<string[]>([])
  const [imageFiles, setImageFiles] = useState<File[]>([])
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const onDrop = (files: FileList | null) => {
    if (!files) return

    // Calculate how many more files we can add (max 6 total)
    const remainingSlots = 6 - imageFiles.length
    if (remainingSlots <= 0) {
      alert('You can upload up to 6 images')
      return
    }

    const newImages: string[] = []
    const newFiles: File[] = []

    // Only process up to the remaining slots
    Array.from(files).slice(0, remainingSlots).forEach((file) => {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert(`File ${file.name} is not an image`)
        return
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert(`File ${file.name} is too large. Maximum size is 5MB.`)
        return
      }

      const reader = new FileReader()
      reader.onload = (e) => {
        newImages.push(e.target?.result as string)
        if (newImages.length === Math.min(files.length, remainingSlots)) {
          setImages((s) => [...s, ...newImages])
        }
      }
      reader.readAsDataURL(file)
      newFiles.push(file)
    })

    setImageFiles((s) => [...s, ...newFiles])
  }

  const removeImg = (i: number) => {
    setImages((s) => s.filter((_, idx) => idx !== i))
    setImageFiles((s) => s.filter((_, idx) => idx !== i))
  }

  const addTag = () => {
    const t = tagInput.trim()
    if (!t) return setTagInput('')
    if (!tags.includes(t)) setTags((s) => [t, ...s])
    setTagInput('')
  }

  const generateDesc = async () => {
    if (!title || imageFiles.length === 0) {
      alert('Please enter a title and upload at least one image to generate description')
      return
    }

    setGenerating(true)
    try {
      const formData = new FormData()
      formData.append('title', title)
      formData.append('category', category)

      // Add image files
      imageFiles.forEach((file) => {
        formData.append('images', file)
      })

      const startTime = Date.now()
      const response = await productsAPI.generateDescriptionWithFiles(formData)
      const processingTime = Date.now() - startTime

      setDesc(response.data.description)

      // Show alert with model and processing time
      const modelInfo = response.data.model === 'gemini-2.0-flash'
        ? 'Generated with Gemini AI'
        : 'Generated with template (Gemini API not configured)'
      alert(`${modelInfo}\nProcessing time: ${response.data.processing_time_ms}ms`)
    } catch (error: any) {
      console.error('Error generating description:', error)
      alert('Failed to generate description. Please try again.')
    } finally {
      setGenerating(false)
    }
  }

  const submit = async () => {
    if (!title || !price || imageFiles.length === 0) return alert('Please enter title, price and upload at least one image')

    setLoading(true)

    try {
      const formData = new FormData()

      // Add all form fields to FormData
      formData.append('title', title)
      formData.append('price', price.toString())
      formData.append('description', desc)
      formData.append('condition', condition)
      formData.append('category', category)
      formData.append('tags', JSON.stringify(tags))

      // Add user ID if available
      if (user?.id) {
        formData.append('sellerId', user.id)
      }

      // Add all image files
      imageFiles.forEach((file) => {
        formData.append('images', file)
      })

      // Log FormData entries for debugging
      for (const pair of formData.entries()) {
        console.log('FormData Entry:', pair[0], pair[1])
      }

      // Call the API with FormData
      const response = await productsAPI.create(formData)

      // Update the local state with the new product
      const productImages = Array.isArray(response.data.images)
        ? response.data.images
        : JSON.parse(response.data.images || '[]')

      setProducts((prev) => [
        {
          ...response.data,
          images: productImages,
        },
        ...prev
      ])

      // Reset form
      setTitle('')
      setPrice(0)
      setDesc('')
      setTags([])
      setImages([])
      setImageFiles([])

      // Close the form
      onDone()
    } catch (error) {
      console.error('Error creating product:', error)
      alert('Failed to create product. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-4xl mx-auto px-4 md:px-8">
        <div className="flex items-center gap-4 mb-6">
          <button onClick={onDone} className="p-2 rounded-full bg-white/6">
            <ArrowLeft />
          </button>
          <h2 className="text-2xl font-bold">List New Item</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-4">
            <GlassCard>
              <div>
                <label className="block text-sm font-semibold">Images</label>
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => { e.preventDefault(); onDrop(e.dataTransfer.files) }}
                  className="mt-2 border-dashed border-2 border-white/6 rounded-md p-4 text-center cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input ref={fileInputRef} type="file" multiple accept="image/*" onChange={(e) => onDrop(e.target.files)} className="hidden" />
                  <div className="text-sm opacity-70">Drag & drop or click to upload (max 6)</div>
                  <div className="mt-3 grid grid-cols-4 gap-2">
                    {images.map((img, i) => (
                      <div key={i} className="relative">
                        <img src={img} className="h-24 w-full object-cover rounded-md" />
                        <button onClick={(e) => { e.stopPropagation(); removeImg(i) }} className="absolute top-1 right-1 p-1 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-lg transition-colors duration-200 z-10">
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </GlassCard>

            <GlassCard>
              <label className="block text-sm font-semibold">Title</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full mt-2 p-2 bg-transparent border rounded-md" />

              <div className="mt-3 grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-semibold">Price (₹)</label>
                  <input type="number" value={price} onChange={(e) => setPrice(Number(e.target.value))} className="w-full mt-2 p-2 bg-transparent border rounded-md" />
                </div>
                <div>
                  <label className="text-sm font-semibold">Condition</label>
                  <select value={condition} onChange={(e) => setCondition(e.target.value as Product['condition'])} className="w-full mt-2 p-2 bg-transparent border rounded-md">
                    <option>New</option>
                    <option>Like New</option>
                    <option>Good</option>
                    <option>Fair</option>
                    <option>For Parts</option>
                  </select>
                </div>
              </div>

              <div className="mt-3">
                <label className="text-sm font-semibold">Category</label>
                <input value={category} onChange={(e) => setCategory(e.target.value)} className="w-full mt-2 p-2 bg-transparent border rounded-md" />
              </div>

              <div className="mt-3">
                <label className="text-sm font-semibold">Description</label>
                <div className="mt-2 flex gap-2">
                  <textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={4} className="flex-1 p-2 bg-transparent border rounded-md" disabled={generating} />
                  <button
                    onClick={generateDesc}
                    className="p-3 rounded-md bg-white/6"
                    title="AI assist"
                    disabled={generating || !title || imageFiles.length === 0}
                  >
                    {generating ? <Spinner /> : 'AI'}
                  </button>
                </div>
              </div>

              <div className="mt-3">
                <label className="text-sm font-semibold">Tags</label>
                <div className="mt-2 flex gap-2 items-center">
                  <input value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addTag()} className="p-2 bg-transparent border rounded-md flex-1" placeholder="press enter to add" />
                  <button onClick={addTag} className="py-2 px-3 rounded-md bg-white/6">Add</button>
                </div>
                <div className="mt-2 flex gap-2 flex-wrap">
                  {tags.map((t, i) => (
                    <div key={i} className="px-3 py-1 bg-white/6 rounded-full flex items-center gap-2 text-sm">
                      {t} <button onClick={() => setTags((s) => s.filter((x) => x !== t))} className="p-1">×</button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4 flex gap-3">
                <button
                  type="button"
                  onClick={submit}
                  disabled={loading}
                  className={`py-2 px-4 rounded-md bg-gradient-to-r from-indigo-500 to-cyan-400 font-semibold ${loading ? 'opacity-75 cursor-not-allowed' : ''}`}
                >
                  {loading ? <Spinner /> : 'List Item'}
                </button>
                <button type="button" onClick={onDone} className="py-2 px-4 rounded-md bg-white/6">Cancel</button>
              </div>
            </GlassCard>
          </div>

          <div className="space-y-4">
            <GlassCard>
              <div className="text-sm font-semibold">Preview</div>
              <div className="mt-2">
                <div className="h-40 rounded-md overflow-hidden bg-black/10 grid place-items-center">
                  {images[0] ? <img src={images[0]} className="w-full h-full object-cover" /> : <div className="opacity-60">No image yet</div>}
                </div>
                <div className="mt-2 font-semibold">{title || 'Item Title'}</div>
                <div className="text-sm opacity-70">₹{price || '0'}</div>
                <div className="text-xs opacity-60 mt-2">{desc || 'Short description will appear here.'}</div>
              </div>
            </GlassCard>

            <GlassCard>
              <div className="text-sm">Tips</div>
              <ul className="mt-2 text-xs opacity-80">
                <li>• Use clear photos and an accurate price.</li>
                <li>• Mention pickup location in description.</li>
              </ul>
            </GlassCard>
          </div>
        </div>
      </div>
    </div>
  )
}
