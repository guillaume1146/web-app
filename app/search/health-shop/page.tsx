'use client'

import { useState, useEffect, useCallback } from 'react'
import { FiSearch, FiFilter, FiShoppingCart, FiPackage } from 'react-icons/fi'

interface ShopItem {
  id: string
  providerUserId: string
  providerType: string
  name: string
  genericName?: string
  category: string
  description?: string
  unitOfMeasure: string
  strength?: string
  price: number
  quantity: number
  inStock: boolean
  requiresPrescription: boolean
  isFeatured: boolean
}

interface ShopCategory {
  key: string
  label: string
}

const PROVIDER_LABELS: Record<string, string> = {
  PHARMACIST: 'Pharmacy', DOCTOR: 'Doctor', NURSE: 'Nurse', DENTIST: 'Dental',
  OPTOMETRIST: 'Eye Care', NANNY: 'Childcare', PHYSIOTHERAPIST: 'Physio',
  NUTRITIONIST: 'Nutrition', CAREGIVER: 'Caregiver', LAB_TECHNICIAN: 'Lab',
}

export default function HealthShopPage() {
  const [items, setItems] = useState<ShopItem[]>([])
  const [categories, setCategories] = useState<ShopCategory[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [providerType, setProviderType] = useState('')
  const [offset, setOffset] = useState(0)

  const fetchItems = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (search) params.set('q', search)
    if (category) params.set('category', category)
    if (providerType) params.set('providerType', providerType)
    params.set('limit', '20')
    params.set('offset', String(offset))

    try {
      const res = await fetch(`/api/search/health-shop?${params}`)
      const data = await res.json()
      if (data.success) {
        setItems(data.data.items)
        setTotal(data.data.total)
        if (data.data.categories) setCategories(data.data.categories)
      }
    } catch { /* */ }
    finally { setLoading(false) }
  }, [search, category, providerType, offset])

  useEffect(() => { fetchItems() }, [fetchItems])

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-brand-navy text-white py-10 px-4">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">Health Shop</h1>
          <p className="text-brand-sky text-lg">Browse products from all healthcare providers — medicines, eyewear, dental care, baby products & more</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input type="text" value={search} onChange={(e) => { setSearch(e.target.value); setOffset(0) }} placeholder="Search products..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-teal" />
          </div>
          <div className="flex gap-2">
            <select value={category} onChange={(e) => { setCategory(e.target.value); setOffset(0) }}
              className="border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-brand-teal">
              <option value="">All Categories</option>
              {categories.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
            </select>
            <select value={providerType} onChange={(e) => { setProviderType(e.target.value); setOffset(0) }}
              className="border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-brand-teal">
              <option value="">All Providers</option>
              {Object.entries(PROVIDER_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
        </div>

        {/* Results count */}
        <p className="text-sm text-gray-500 mb-4">{total} product{total !== 1 ? 's' : ''} found</p>

        {/* Items grid */}
        {loading ? (
          <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-teal" /></div>
        ) : items.length === 0 ? (
          <div className="text-center py-16">
            <FiPackage className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-semibold text-gray-600">No products found</h3>
            <p className="text-sm text-gray-400 mt-1">Try adjusting your search or filters</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {items.map(item => (
              <div key={item.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition group">
                {/* Image placeholder */}
                <div className="h-32 bg-gray-100 flex items-center justify-center">
                  <FiPackage className="w-10 h-10 text-gray-300" />
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between mb-1">
                    <h3 className="font-semibold text-gray-900 text-sm line-clamp-2 flex-1">{item.name}</h3>
                    {item.isFeatured && <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-medium ml-1">Featured</span>}
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] bg-sky-50 text-sky-700 px-1.5 py-0.5 rounded">{PROVIDER_LABELS[item.providerType] || item.providerType}</span>
                    <span className="text-[10px] text-gray-400">{item.category}</span>
                  </div>
                  {item.description && <p className="text-xs text-gray-500 line-clamp-2 mb-3">{item.description}</p>}
                  <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                    <span className="text-lg font-bold text-brand-navy">Rs {item.price.toLocaleString()}</span>
                    <div className="flex items-center gap-1">
                      {item.requiresPrescription && <span className="text-[10px] bg-pink-100 text-pink-700 px-1 py-0.5 rounded">Rx</span>}
                      {item.inStock ? (
                        <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded">{item.quantity} left</span>
                      ) : (
                        <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded">Out of stock</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {total > 20 && (
          <div className="flex justify-center gap-2 mt-8">
            <button disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - 20))}
              className="px-4 py-2 text-sm border border-gray-300 rounded-lg disabled:opacity-50 hover:bg-gray-50">Previous</button>
            <span className="px-4 py-2 text-sm text-gray-500">{offset + 1}–{Math.min(offset + 20, total)} of {total}</span>
            <button disabled={offset + 20 >= total} onClick={() => setOffset(offset + 20)}
              className="px-4 py-2 text-sm border border-gray-300 rounded-lg disabled:opacity-50 hover:bg-gray-50">Next</button>
          </div>
        )}
      </div>
    </div>
  )
}
