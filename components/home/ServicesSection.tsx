'use client'

import '@/lib/utils/register-icons'
import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { FaSearch, FaConciergeBell, FaClock, FaArrowRight } from 'react-icons/fa'
import { Icon } from '@iconify/react'
import { useBookingDrawer } from '@/lib/contexts/booking-drawer-context'

interface ServiceItem {
  id: string
  serviceName: string
  category: string
  description: string | null
  providerType: string
  defaultPrice: number
  currency: string
  duration: number | null
  providerCount: number
  iconKey?: string | null
  emoji?: string | null
  imageUrl?: string | null
}

interface RoleData {
  code: string
  label: string
  slug: string
  color: string
  iconKey?: string | null
}

function hex2rgba(hex: string, alpha = 0.12) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

export default function ServicesSection() {
  const { openDrawer } = useBookingDrawer()
  const [services, setServices] = useState<ServiceItem[]>([])
  const [roles, setRoles] = useState<RoleData[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeRole, setActiveRole] = useState<string>('ALL')

  useEffect(() => {
    Promise.all([
      fetch('/api/search/services?limit=500').then(r => r.json()),
      fetch('/api/roles?searchEnabled=true').then(r => r.json()),
    ]).then(([svcJson, rolesJson]) => {
      if (svcJson.success && Array.isArray(svcJson.data)) setServices(svcJson.data)
      if (rolesJson.success && Array.isArray(rolesJson.data)) setRoles(rolesJson.data)
    }).catch(() => setFetchError(true)).finally(() => setLoading(false))
  }, [])

  const roleMap = useMemo(() => {
    const map: Record<string, RoleData> = {}
    for (const r of roles) map[r.code] = r
    return map
  }, [roles])

  const filtered = useMemo(() => {
    let list = services
    if (activeRole !== 'ALL') list = list.filter(s => s.providerType === activeRole)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      list = list.filter(s =>
        s.serviceName.toLowerCase().includes(q) ||
        (s.description?.toLowerCase().includes(q)) ||
        s.category.toLowerCase().includes(q)
      )
    }
    return list
  }, [services, activeRole, searchQuery])

  return (
    <section className="py-8 sm:py-12 bg-white overflow-hidden">
      <div className="w-full px-4 sm:px-6 lg:px-10 xl:px-14">

        {/* Sticky header */}
        <div className="sticky top-0 z-20 -mx-4 sm:-mx-6 lg:-mx-10 xl:-mx-14 px-4 sm:px-6 lg:px-10 xl:px-14
          pt-4 sm:pt-6 pb-3 sm:pb-4 mb-6 bg-white/95 backdrop-blur-sm border-b border-gray-100">

          <div className="flex items-start justify-between gap-4 mb-3">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2">
                <FaConciergeBell className="text-[#0C6780] text-xl" />
                Find Services
              </h2>
              <p className="text-sm text-gray-500 mt-0.5">Browse what every provider type offers</p>
            </div>
            <Link
              href="/search/services"
              className="hidden sm:flex items-center gap-1 text-sm font-medium text-[#0C6780] hover:text-[#001E40] transition-colors whitespace-nowrap mt-1"
            >
              See All <FaArrowRight className="text-xs" />
            </Link>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-shrink-0 sm:w-64">
              <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
              <input
                type="text"
                placeholder="Search services..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0C6780]/30 focus:border-[#0C6780] bg-gray-50"
              />
            </div>

            <div className="flex gap-1.5 overflow-x-auto pb-0.5 [&::-webkit-scrollbar]:hidden">
              <button
                onClick={() => setActiveRole('ALL')}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all border
                  ${activeRole === 'ALL'
                    ? 'bg-[#0C6780] text-white border-[#0C6780]'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-[#0C6780] hover:text-[#0C6780]'}`}
              >
                All
              </button>
              {roles.map(role => (
                <button
                  key={role.code}
                  onClick={() => setActiveRole(role.code)}
                  style={activeRole === role.code ? { backgroundColor: role.color, borderColor: role.color } : {}}
                  className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all border
                    ${activeRole === role.code
                      ? 'text-white'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400 hover:text-gray-800'}`}
                >
                  {role.iconKey && (
                    <Icon
                      icon={role.iconKey}
                      width={13}
                      height={13}
                      color={activeRole === role.code ? '#ffffff' : role.color}
                    />
                  )}
                  {role.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {Array.from({ length: 18 }).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-36 bg-gray-100 rounded-2xl mb-2" />
                <div className="h-3 bg-gray-100 rounded w-3/4 mb-1.5" />
                <div className="h-3 bg-gray-100 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : fetchError || filtered.length === 0 ? (
          <div className="text-center py-16">
            <FaConciergeBell className="text-4xl text-gray-300 mx-auto mb-3" />
            {fetchError ? (
              <p className="text-sm font-medium text-gray-600">Could not load services — check that the backend is running.</p>
            ) : (
              <>
                <p className="text-sm font-medium text-gray-600">No services match your search.</p>
                <button onClick={() => { setSearchQuery(''); setActiveRole('ALL') }} className="mt-2 text-xs text-[#0C6780] hover:underline">
                  Clear filters
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {filtered.map(svc => {
              const role = roleMap[svc.providerType]
              const color = role?.color ?? '#0C6780'
              const slug = role?.slug ?? svc.providerType.toLowerCase()
              return <ServiceCard key={svc.id} service={svc} color={color} slug={slug} roleLabel={role?.label ?? svc.providerType} onBook={() => openDrawer({ service: { id: svc.id, serviceName: svc.serviceName, category: svc.category, description: svc.description ?? undefined, defaultPrice: svc.defaultPrice, duration: svc.duration ?? undefined, providerType: svc.providerType, iconKey: svc.iconKey, emoji: svc.emoji } })} />
            })}
          </div>
        )}

        <div className="text-center mt-6 sm:hidden">
          <Link
            href="/search/services"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#0C6780] text-white rounded-xl text-sm font-medium"
          >
            See All Services <FaArrowRight className="text-xs" />
          </Link>
        </div>
      </div>
    </section>
  )
}

function ServiceCard({ service, color, slug, roleLabel, onBook }: { service: ServiceItem; color: string; slug: string; roleLabel: string; onBook: () => void }) {
  const bgLight  = hex2rgba(color, 0.10)
  const bgMedium = hex2rgba(color, 0.20)

  return (
    <button
      onClick={onBook}
      className="group flex flex-col bg-white rounded-2xl border border-gray-100 text-left w-full
        hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 overflow-hidden cursor-pointer"
    >
      {/* Illustration header */}
      <div
        className="relative w-full h-28 sm:h-32 flex-shrink-0 flex items-center justify-center overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${bgMedium} 0%, ${bgLight} 100%)` }}
      >
        {/* Blurred background glow */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none" aria-hidden>
          {service.imageUrl ? (
            <img src={service.imageUrl} alt="" className="w-full h-full object-cover scale-150 blur-2xl opacity-40" />
          ) : service.emoji ? (
            <span className="text-[110px] leading-none select-none blur-2xl opacity-30 scale-150">{service.emoji}</span>
          ) : service.iconKey ? (
            <div className="blur-2xl opacity-25 scale-[2]">
              <Icon icon={service.iconKey} width={80} height={80} color={color} />
            </div>
          ) : null}
        </div>

        {/* Sharp foreground icon */}
        <span className="relative group-hover:scale-110 transition-transform duration-300 flex items-center justify-center">
          {service.imageUrl ? (
            <img src={service.imageUrl} alt={service.serviceName} className="h-20 sm:h-24 w-full object-contain px-3" />
          ) : service.emoji ? (
            <span className="text-5xl sm:text-6xl leading-none select-none">{service.emoji}</span>
          ) : service.iconKey ? (
            <Icon icon={service.iconKey} width={64} height={64} color={color} />
          ) : (
            <span className="text-5xl leading-none select-none">🩺</span>
          )}
        </span>

        {/* Provider type badge */}
        <div className="absolute bottom-1.5 left-2 z-10">
          <span className="text-[9px] px-1.5 py-0.5 rounded-full font-semibold" style={{ background: 'rgba(0,0,0,0.35)', color: '#fff', backdropFilter: 'blur(4px)' }}>
            {roleLabel}
          </span>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-1" style={{ backgroundColor: color }} />
      </div>

      {/* Text */}
      <div className="p-3 flex-1 flex flex-col">
        <h4 className="text-xs sm:text-sm font-bold leading-snug line-clamp-2 mb-1" style={{ color }}>
          {service.serviceName}
        </h4>
        {service.description && (
          <p className="text-[10px] sm:text-[11px] text-gray-500 leading-relaxed line-clamp-2 flex-1">
            {service.description}
          </p>
        )}
      </div>

      {/* Footer */}
      <div className="px-3 pb-3 pt-1.5 border-t border-gray-100 flex items-center justify-between gap-1">
        <span className="text-xs font-bold text-gray-900">
          Rs {service.defaultPrice.toLocaleString()}
        </span>
        {service.duration && (
          <span className="flex items-center gap-0.5 text-[10px] text-gray-400">
            <FaClock className="text-[9px]" /> {service.duration}m
          </span>
        )}
      </div>
    </button>
  )
}
