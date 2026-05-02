'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import * as FaIcons from 'react-icons/fa'
import { FaUserMd, FaShoppingCart, FaPills, FaLeaf, FaFirstAid, FaHeart, FaGlasses, FaEye, FaTooth, FaBaby, FaStethoscope, FaBox } from 'react-icons/fa'

/**
 * Combined two-column marketplace preview for the landing page hero area.
 *
 *   Desktop (≥lg):   [ Providers · 3 cols ] [ Health Shop · 2 cols ]
 *   Tablet / Mobile: stacked (providers on top, shop below)
 *
 * This replaces the previous stacked "ProviderMarketplace then
 * HealthShopMarketplace" layout — visitors now see both the booking and
 * ecommerce sides of the platform above the fold without scrolling.
 */

interface ProviderRole {
  code: string
  label: string
  singularLabel: string
  slug: string
  icon: string
  color: string
  description: string | null
  providerCount: number
}

interface ShopItem {
  id: string
  name: string
  category: string
  imageUrl?: string
  price: number
  unitOfMeasure?: string
  requiresPrescription?: boolean
}

const SHOP_CATEGORY_META: Record<string, { emoji: string; label: string; color: string }> = {
  medication: { emoji: '💊', label: 'Medications', color: 'text-blue-600' },
  vitamins: { emoji: '🌿', label: 'Vitamins', color: 'text-green-600' },
  first_aid: { emoji: '🩹', label: 'First Aid', color: 'text-red-600' },
  personal_care: { emoji: '🧴', label: 'Personal Care', color: 'text-pink-600' },
  eyewear: { emoji: '👓', label: 'Eyewear', color: 'text-purple-600' },
  eye_care: { emoji: '👁️', label: 'Eye Care', color: 'text-indigo-600' },
  dental_care: { emoji: '🦷', label: 'Dental Care', color: 'text-sky-600' },
  baby_care: { emoji: '👶', label: 'Baby Care', color: 'text-rose-600' },
  medical_devices: { emoji: '🩺', label: 'Medical Devices', color: 'text-teal-600' },
  monitoring: { emoji: '📊', label: 'Monitoring', color: 'text-amber-600' },
  nutrition: { emoji: '🥗', label: 'Nutrition', color: 'text-lime-600' },
  other: { emoji: '📦', label: 'Other', color: 'text-gray-600' },
}

function resolveIcon(iconName: string) {
  return (FaIcons as Record<string, React.ComponentType<{ className?: string }>>)[iconName] || FaUserMd
}

export default function MarketplacePreviews() {
  const [roles, setRoles] = useState<ProviderRole[]>([])
  const [shopItems, setShopItems] = useState<ShopItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/roles?searchEnabled=true').then(r => r.json()),
      fetch('/api/search/health-shop?limit=10&featured=true').then(r => r.json()),
    ])
      .then(([rolesJson, shopJson]) => {
        if (rolesJson.success && Array.isArray(rolesJson.data)) setRoles(rolesJson.data)
        const items = Array.isArray(shopJson?.data?.items)
          ? shopJson.data.items
          : Array.isArray(shopJson?.data)
          ? shopJson.data
          : []
        setShopItems(items.slice(0, 10))
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <section className="py-8 sm:py-10 bg-white">
      <div className="w-full px-4 sm:px-6 lg:px-12 xl:px-20">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 lg:gap-8">
          {/* LEFT — Provider categories (3/5 on desktop) */}
          <div className="lg:col-span-3">
            <div className="flex items-baseline justify-between mb-4">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Book a Provider</h2>
                <p className="text-xs sm:text-sm text-gray-500">Find certified professionals near you</p>
              </div>
              <Link href="/search/doctors" className="text-xs sm:text-sm text-brand-teal hover:text-brand-navy font-semibold">
                Browse all →
              </Link>
            </div>

            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 animate-pulse">
                {Array.from({ length: 9 }).map((_, i) => (
                  <div key={i} className="h-24 bg-gray-100 rounded-xl" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {roles.slice(0, 12).map(role => {
                  const Icon = resolveIcon(role.icon)
                  return (
                    <Link
                      key={role.code}
                      href={`/search/${role.slug}`}
                      className="group bg-white border border-gray-200 hover:border-brand-teal hover:shadow-md rounded-xl p-3 transition-all"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <div
                          className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 text-white"
                          style={{ backgroundColor: role.color || '#0C6780' }}
                        >
                          <Icon className="text-sm" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-sm text-gray-900 truncate">{role.label}</p>
                          <p className="text-[10px] text-gray-500">
                            {role.providerCount > 0 ? `${role.providerCount} available` : 'Coming soon'}
                          </p>
                        </div>
                      </div>
                      {role.description && (
                        <p className="text-[11px] text-gray-500 line-clamp-1">{role.description}</p>
                      )}
                    </Link>
                  )
                })}
              </div>
            )}
          </div>

          {/* RIGHT — Health Shop (2/5 on desktop) */}
          <div className="lg:col-span-2">
            <div className="flex items-baseline justify-between mb-4">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <FaShoppingCart className="text-brand-teal text-lg" />
                  Health Shop
                </h2>
                <p className="text-xs sm:text-sm text-gray-500">Essentials delivered to your door</p>
              </div>
              <Link href="/search/health-shop" className="text-xs sm:text-sm text-brand-teal hover:text-brand-navy font-semibold">
                Shop all →
              </Link>
            </div>

            {/* Category quick chips */}
            <div className="flex gap-2 mb-4 flex-wrap">
              {['medication', 'vitamins', 'first_aid', 'baby_care', 'personal_care'].map(cat => {
                const meta = SHOP_CATEGORY_META[cat]
                return (
                  <Link
                    key={cat}
                    href={`/search/health-shop?category=${cat}`}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium bg-gray-50 hover:bg-brand-teal/10 border border-gray-200 hover:border-brand-teal rounded-full text-gray-700 transition"
                  >
                    <span>{meta.emoji}</span>
                    <span>{meta.label}</span>
                  </Link>
                )
              })}
            </div>

            {/* Product tiles */}
            {loading ? (
              <div className="grid grid-cols-2 gap-3 animate-pulse">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-32 bg-gray-100 rounded-xl" />
                ))}
              </div>
            ) : shopItems.length === 0 ? (
              <div className="bg-gray-50 rounded-xl p-6 text-center text-xs text-gray-500">
                No featured products yet. <Link href="/search/health-shop" className="text-brand-teal font-medium">Browse all →</Link>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {shopItems.slice(0, 4).map(item => {
                  const meta = SHOP_CATEGORY_META[item.category] || SHOP_CATEGORY_META.other
                  return (
                    <Link
                      key={item.id}
                      href={`/search/health-shop?q=${encodeURIComponent(item.name)}`}
                      className="bg-white border border-gray-200 hover:border-brand-teal hover:shadow-md rounded-xl p-3 transition-all"
                    >
                      <div className="flex items-start gap-2 mb-2">
                        <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center text-lg flex-shrink-0">
                          {meta.emoji}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-gray-900 line-clamp-2 leading-tight">{item.name}</p>
                          {item.unitOfMeasure && (
                            <p className="text-[10px] text-gray-400">{item.unitOfMeasure}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-brand-navy">Rs {item.price}</span>
                        {item.requiresPrescription && (
                          <span className="text-[9px] bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded">Rx</span>
                        )}
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
