import { useState, useRef } from 'react'
import { ArrowLeft, X, Sparkles } from 'lucide-react'
import { useMarketplace } from '../../state/MarketplaceContext'
import { productsAPI } from '../../api/services'
import GlassCard from '../ui/GlassCard'
import Spinner from '../ui/Spinner'
import { Product } from '../../types'

export default function ListItemPage({ onDone }: { onDone: () => void }) {
  const { addProduct, setProducts, user } = useMarketplace()
  const [title, setTitle] = useState('')
  const [price, setPrice] = useState<number | ''>('')
  const [condition, setCondition] = useState<Product['condition']>('Good')
  const [category, setCategory] = useState('')
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
    <div className="min-h-screen">
      {/* Sticky Header */}
      <div className="sticky top-0 z-30 h-16 px-4 md:px-8 flex items-center border-b border-white/10 bg-[#0f172a]/80 backdrop-blur-md">
        <button
          onClick={onDone}
          className="p-2 -ml-2 text-white/60 hover:text-white transition-colors rounded-full hover:bg-white/5"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="ml-4 text-2xl font-bold text-white">List New Item</h1>
      </div>

      <div className="max-w-5xl mx-auto px-4 md:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-[3fr_2fr] gap-6">
          <div className="space-y-4">
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
                  <input
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full mt-2 p-2 bg-transparent border rounded-md h-[42px]"
                    placeholder=""
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold">Condition</label>
                  <select
                    value={condition}
                    onChange={(e) => setCondition(e.target.value as Product['condition'])}
                    className="w-full mt-2 p-2 bg-transparent border rounded-md h-[42px]"
                  >
                    <option className="bg-[#0f172a]">New</option>
                    <option className="bg-[#0f172a]">Like New</option>
                    <option className="bg-[#0f172a]">Good</option>
                    <option className="bg-[#0f172a]">Fair</option>
                    <option className="bg-[#0f172a]">For Parts</option>
                  </select>
                </div>
              </div>

              <div className="mt-3">
                <label className="text-sm font-semibold">Category</label>
                <input value={category} onChange={(e) => setCategory(e.target.value)} className="w-full mt-2 p-2 bg-transparent border rounded-md" />
              </div>

              <div className="mt-3">
                <label className="text-sm font-semibold mb-1 block">Description</label>
                <div className="flex gap-3 h-32">
                  <textarea
                    value={desc}
                    onChange={(e) => setDesc(e.target.value)}
                    className="flex-1 h-full p-4 bg-[#0B1221] border border-white/20 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all resize-none text-white placeholder:text-white/30"
                    placeholder="Enter description or click Enhance Description to generate one..."
                    disabled={generating}
                  />
                  <button
                    onClick={generateDesc}
                    className="w-24 h-full rounded-xl bg-[#1E2536] hover:bg-[#252b3d] text-white/60 hover:text-white flex flex-col items-center justify-center gap-2 transition-all duration-200 border border-white/5 hover:border-white/20 shadow-lg hover:shadow-xl shadow-black/20 group px-2 text-center"
                    title="Generate with AI"
                    disabled={generating || !title || imageFiles.length === 0}
                  >
                    {generating ? (
                      <Spinner />
                    ) : (
                      <span className="text-sm font-medium leading-tight">Enhance Description</span>
                    )}
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

              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  onClick={submit}
                  disabled={loading}
                  className={`flex-1 py-3 px-4 rounded-xl bg-gradient-to-br from-[#a7b7ff] via-[#8aa5ff] to-[#6a7dff] hover:from-[#96a9ff] hover:via-[#7b98ff] hover:to-[#5a6eff] text-slate-950 font-bold shadow-[0_12px_28px_rgba(5,8,20,0.4)] hover:shadow-[0_15px_35px_rgba(5,8,20,0.5)] transition-all duration-200 ${loading ? 'opacity-75 cursor-not-allowed' : ''}`}
                >
                  {loading ? <Spinner /> : 'List Item'}
                </button>
                <button type="button" onClick={onDone} className="px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 font-medium transition-colors">Cancel</button>
              </div>
            </GlassCard>
          </div>

          <div className="space-y-4">
            <div className="h-[70vh] flex flex-col">
              <GlassCard className="h-full flex flex-col">
                <div className="text-sm font-semibold mb-4">Preview</div>
                <div className="flex-1 bg-black/20 rounded-xl overflow-hidden relative group">
                  {/* Phone Frame / Preview Container */}
                  <div className="absolute inset-0 flex flex-col overflow-y-auto custom-scrollbar">
                    <div className="h-[26.6rem] aspect-[3/4] w-auto mx-auto relative bg-black/40 flex-shrink-0">
                      {images[0] ? (
                        <img src={images[0]} className="w-full h-full object-cover" alt="Preview" />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-white/20 flex-col gap-2">
                          <div className="w-16 h-16 rounded-full border-2 border-dashed border-white/20 flex items-center justify-center">
                            <span className="text-2xl">+</span>
                          </div>
                          <span>No image</span>
                        </div>
                      )}
                      <div className="absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
                        <h3 className="text-xl font-bold text-white truncate">{title || 'Item Title'}</h3>
                        <p className="text-indigo-400 font-semibold mt-1">₹{price || ''}</p>
                      </div>
                    </div>

                    <div className="p-4 bg-white/5 backdrop-blur-sm border-t border-white/10 flex-1">
                      <p className="text-sm text-white/70 whitespace-pre-wrap">{desc || 'Description will appear here...'}</p>
                      <div className="flex gap-2 mt-3 flex-wrap">
                        {tags.length > 0 ? tags.map(t => (
                          <span key={t} className="text-xs px-2 py-1 rounded-full bg-white/10 text-white/60">#{t}</span>
                        )) : (
                          <span className="text-xs px-2 py-1 rounded-full bg-white/5 text-white/20">#tags</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </GlassCard>
            </div>

            <GlassCard>
              <div className="text-sm font-semibold text-indigo-400 mb-2">Selling Tips</div>
              <ul className="space-y-2 text-xs text-white/60">
                <li className="flex items-start gap-2">
                  <span className="text-indigo-400">•</span>
                  Use good lighting for photos
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-indigo-400">•</span>
                  Be honest about condition
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-indigo-400">•</span>
                  Check similar items for pricing
                </li>
              </ul>
            </GlassCard>
          </div>
        </div >
      </div >
    </div >
  )
}
