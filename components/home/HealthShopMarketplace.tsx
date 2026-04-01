'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  FaPills, FaLeaf, FaFirstAid, FaHeart, FaGlasses, FaEye,
  FaTooth, FaBaby, FaStethoscope, FaHeartbeat, FaDumbbell,
  FaAppleAlt, FaBox, FaShoppingCart, FaPrescription, FaLock,
} from 'react-icons/fa'
import HorizontalScrollRow from '@/components/shared/HorizontalScrollRow'

const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  medication: FaPills, vitamins: FaLeaf, first_aid: FaFirstAid,
  personal_care: FaHeart, eyewear: FaGlasses, eye_care: FaEye,
  dental_care: FaTooth, baby_care: FaBaby, medical_devices: FaStethoscope,
  monitoring: FaHeartbeat, rehab_equipment: FaDumbbell,
  nutrition: FaAppleAlt, other: FaBox,
}

const CATEGORY_EMOJI: Record<string, string> = {
  medication: '💊', vitamins: '🌿', first_aid: '🩹',
  personal_care: '🧴', eyewear: '👓', eye_care: '👁️',
  dental_care: '🦷', baby_care: '👶', medical_devices: '🩺',
  monitoring: '📊', rehab_equipment: '🏋️', nutrition: '🥗', other: '📦',
}

const CATEGORY_COLORS: Record<string, string> = {
  medication: 'text-blue-600', vitamins: 'text-green-600', first_aid: 'text-red-600',
  personal_care: 'text-pink-600', eyewear: 'text-purple-600', eye_care: 'text-indigo-600',
  dental_care: 'text-sky-600', baby_care: 'text-rose-600', medical_devices: 'text-teal-600',
  monitoring: 'text-amber-600', rehab_equipment: 'text-orange-600',
  nutrition: 'text-lime-600', other: 'text-gray-600',
}

interface ShopItem {
  id: string
  name: string
  genericName?: string
  category: string
  imageUrl?: string
  price: number
  quantity: number
  inStock: boolean
  requiresPrescription: boolean
  isFeatured: boolean
  unitOfMeasure: string
  strength?: string
  description?: string
}

interface CategoryWithItems {
  key: string
  label: string
  items: ShopItem[]
}

const CATEGORIES = [
  { key: 'medication', label: 'Medications' },
  { key: 'vitamins', label: 'Vitamins & Supplements' },
  { key: 'first_aid', label: 'First Aid' },
  { key: 'personal_care', label: 'Personal Care' },
  { key: 'dental_care', label: 'Dental Care' },
  { key: 'baby_care', label: 'Baby & Child Care' },
  { key: 'nutrition', label: 'Nutrition & Diet' },
  { key: 'eyewear', label: 'Eyewear & Lenses' },
  { key: 'medical_devices', label: 'Medical Devices' },
  { key: 'monitoring', label: 'Health Monitoring' },
]

function isLoggedIn(): boolean {
  if (typeof document === 'undefined') return false
  return document.cookie.split(';').some(c => c.trim().startsWith('mediwyz_userType='))
}

export default function HealthShopMarketplace() {
  const [categories, setCategories] = useState<CategoryWithItems[]>([])
  const [loading, setLoading] = useState(true)
  const [authenticated, setAuthenticated] = useState(false)
  const router = useRouter()

  useEffect(() => {
    setAuthenticated(isLoggedIn())

    const topCategories = CATEGORIES.slice(0, 6)
    Promise.all(
      topCategories.map(cat =>
        fetch(`/api/search/health-shop?category=${cat.key}&limit=12`)
          .then(r => r.json())
          .then(json => ({
            key: cat.key,
            label: cat.label,
            items: json.success ? json.data?.items || [] : [],
          }))
          .catch(() => ({ key: cat.key, label: cat.label, items: [] as ShopItem[] }))
      )
    ).then(results => {
      setCategories(results.filter(c => c.items.length > 0))
      setLoading(false)
    })
  }, [])

  const handleAddToCart = (item: ShopItem) => {
    if (!authenticated) {
      router.push(`/login?returnUrl=${encodeURIComponent('/search/health-shop')}`)
      return
    }
    // Navigate to health shop with item context
    router.push(`/search/health-shop?category=${item.category}`)
  }

  if (loading) {
    return (
      <section className="py-12 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-48 mb-2" />
            <div className="h-4 bg-gray-100 rounded w-80 mb-8" />
            {[1, 2, 3].map(i => (
              <div key={i} className="mb-10">
                <div className="h-5 bg-gray-200 rounded w-40 mb-4" />
                <div className="flex gap-4">
                  {[1, 2, 3, 4].map(j => (
                    <div key={j} className="w-52 h-48 bg-white rounded-2xl border border-gray-200 flex-shrink-0" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    )
  }

  if (categories.length === 0) return null

  return (
    <section className="py-12 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center gap-3 mb-2">
          <FaShoppingCart className="text-2xl text-[#0C6780]" />
          <h2 className="text-3xl font-bold text-gray-900">Health Shop</h2>
        </div>
        <p className="text-gray-600 mb-8">Order medicines, supplements & health products from verified providers</p>

        {/* Category Quick Links */}
        <div className="flex flex-wrap gap-2 mb-8">
          {CATEGORIES.map(cat => (
            <Link
              key={cat.key}
              href={`/search/health-shop?category=${cat.key}`}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-white border border-gray-200 text-sm text-gray-700 hover:border-[#0C6780] hover:text-[#0C6780] transition-all"
            >
              <span className="text-base">{CATEGORY_EMOJI[cat.key] || '📦'}</span>
              {cat.label}
            </Link>
          ))}
        </div>

        {/* Category Rows with Products */}
        {categories.map(cat => {
          const Icon = CATEGORY_ICONS[cat.key] || FaBox
          const iconColor = CATEGORY_COLORS[cat.key] || 'text-gray-600'

          return (
            <HorizontalScrollRow
              key={cat.key}
              title={cat.label}
              subtitle={`${cat.items.length}+ products`}
              icon={<Icon className={iconColor} />}
              seeAllHref={`/search/health-shop?category=${cat.key}`}
            >
              {cat.items.map(item => (
                <div
                  key={item.id}
                  className={`flex-shrink-0 snap-start w-52 sm:w-56 bg-white rounded-2xl border ${
                    item.isFeatured ? 'border-[#0C6780] ring-1 ring-[#0C6780]/10' : 'border-gray-200'
                  } overflow-hidden hover:shadow-lg transition-all group`}
                >
                  {/* Product image */}
                  {item.imageUrl ? (
                    <div className="h-28 bg-gray-100 overflow-hidden">
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    </div>
                  ) : (
                    <div className="h-28 bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
                      <span className="text-4xl">{CATEGORY_EMOJI[item.category] || '💊'}</span>
                    </div>
                  )}

                  <div className="p-4">
                    <div className="flex items-start justify-between mb-1">
                      <h4 className="text-sm font-bold text-gray-900 line-clamp-2 flex-1 min-w-0">
                        {item.name}
                      </h4>
                      {item.requiresPrescription && (
                        <span className="ml-1 flex-shrink-0 inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">
                          <FaPrescription className="text-[8px]" /> Rx
                        </span>
                      )}
                    </div>

                    {item.genericName && (
                      <p className="text-[11px] text-gray-400 truncate mb-1">{item.genericName}</p>
                    )}

                    {item.strength && (
                      <p className="text-[11px] text-gray-500 mb-2">{item.strength}</p>
                    )}

                    <div className="flex items-end justify-between mt-2">
                      <div>
                        <span className="text-lg font-bold text-gray-900">Rs {item.price}</span>
                        <span className="text-[10px] text-gray-400 ml-0.5">/{item.unitOfMeasure}</span>
                      </div>
                      <span className={`text-[10px] font-medium ${item.inStock ? 'text-green-600' : 'text-red-500'}`}>
                        {item.inStock ? 'In Stock' : 'Out'}
                      </span>
                    </div>

                    {/* Add to Cart / Login button */}
                    <button
                      onClick={() => handleAddToCart(item)}
                      disabled={!item.inStock}
                      className={`w-full mt-3 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                        !item.inStock
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : authenticated
                            ? 'bg-[#0C6780] text-white hover:bg-[#0a5568]'
                            : 'bg-gray-200 text-gray-500 hover:bg-gray-300'
                      }`}
                    >
                      {!item.inStock ? (
                        'Unavailable'
                      ) : authenticated ? (
                        <><FaShoppingCart className="text-[10px]" /> Add to Cart</>
                      ) : (
                        <><FaLock className="text-[10px]" /> Login to Buy</>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </HorizontalScrollRow>
          )
        })}

        {/* Browse All Link */}
        <div className="text-center mt-4">
          <Link
            href="/search/health-shop"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#0C6780] text-white rounded-xl font-medium hover:bg-[#0a5568] transition-colors"
          >
            <FaShoppingCart className="text-sm" />
            Browse All Products
          </Link>
        </div>
      </div>
    </section>
  )
}
