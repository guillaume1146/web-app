'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { FaSearch, FaConciergeBell, FaClock, FaArrowRight } from 'react-icons/fa'
import HorizontalScrollRow from '@/components/shared/HorizontalScrollRow'

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
}

interface RoleData {
  code: string
  label: string
  slug: string
  color: string
}

// Category emoji for service cards
const CATEGORY_EMOJI: Record<string, string> = {
  consultation: '🩺', 'home visit': '🏠', 'video consultation': '📹',
  prescription: '💊', 'lab test': '🧪', vaccination: '💉',
  emergency: '🚑', childcare: '🧸', nursing: '💉',
  pharmacy: '💊', dental: '🦷', eye: '👁️', optical: '👁️',
  physiotherapy: '🏃', nutrition: '🥗', caregiver: '🤝',
  custom: '⚕️',
}

const PROVIDER_EMOJI: Record<string, string> = {
  DOCTOR: '🩺', NURSE: '💉', NANNY: '🧸', PHARMACIST: '💊',
  LAB_TECHNICIAN: '🧪', EMERGENCY_WORKER: '🚑', CAREGIVER: '🤝',
  PHYSIOTHERAPIST: '🏃', DENTIST: '🦷', OPTOMETRIST: '👁️',
  NUTRITIONIST: '🥗',
}

function resolveCategoryEmoji(category: string, providerType: string): string {
  const lower = category.toLowerCase()
  for (const [key, emoji] of Object.entries(CATEGORY_EMOJI)) {
    if (lower.includes(key)) return emoji
  }
  return PROVIDER_EMOJI[providerType] ?? '⚕️'
}

function hex2rgba(hex: string, alpha = 0.12) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

export default function ServicesSection() {
  const [services, setServices] = useState<ServiceItem[]>([])
  const [roles, setRoles] = useState<RoleData[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeRole, setActiveRole] = useState<string>('ALL')

  useEffect(() => {
    Promise.all([
      fetch('/api/search/services?limit=200').then(r => r.json()),
      fetch('/api/roles?searchEnabled=true').then(r => r.json()),
    ]).then(([svcJson, rolesJson]) => {
      if (svcJson.success && Array.isArray(svcJson.data)) setServices(svcJson.data)
      if (rolesJson.success && Array.isArray(rolesJson.data)) setRoles(rolesJson.data)
    }).catch(() => setFetchError(true)).finally(() => setLoading(false))
  }, [])

  // Filter services by search query + active role chip
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

  // Group by providerType — each role gets its own scroll row
  const groupedByRole = useMemo(() => {
    const map: Record<string, ServiceItem[]> = {}
    for (const svc of filtered) {
      if (!map[svc.providerType]) map[svc.providerType] = []
      map[svc.providerType].push(svc)
    }
    return map
  }, [filtered])

  // Get display info (label, color, slug) for a given role code
  const roleInfo = useMemo(() => {
    const info: Record<string, RoleData> = {}
    for (const r of roles) info[r.code] = r
    return info
  }, [roles])

  return (
    <section className="py-8 sm:py-12 bg-white overflow-hidden">
      <div className="w-full px-4 sm:px-6 lg:px-10 xl:px-14">

        {/* Sticky header */}
        <div className="sticky top-0 z-20 -mx-4 sm:-mx-6 lg:-mx-10 xl:-mx-14 px-4 sm:px-6 lg:px-10 xl:px-14
          pt-4 sm:pt-6 pb-3 sm:pb-4 mb-4 sm:mb-6 bg-white/95 backdrop-blur-sm border-b border-gray-100">

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

          {/* Search + role filter row */}
          <div className="flex flex-col sm:flex-row gap-2">
            {/* Search input */}
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

            {/* Role filter chips */}
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
                  className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all border
                    ${activeRole === role.code
                      ? 'text-white'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400 hover:text-gray-800'}`}
                >
                  {PROVIDER_EMOJI[role.code] ?? ''} {role.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="space-y-10">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse">
                <div className="h-5 bg-gray-200 rounded w-40 mb-4" />
                <div className="flex gap-4">
                  {[1, 2, 3, 4, 5].map(j => (
                    <div key={j} className="flex-shrink-0 w-[160px] sm:w-52 h-44 bg-gray-100 rounded-2xl" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : Object.keys(groupedByRole).length === 0 ? (
          <div className="text-center py-16">
            <FaConciergeBell className="text-4xl text-gray-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-600">No services match your search.</p>
            <button onClick={() => { setSearchQuery(''); setActiveRole('ALL') }} className="mt-2 text-xs text-[#0C6780] hover:underline">
              Clear filters
            </button>
          </div>
        ) : (
          Object.entries(groupedByRole).map(([roleCode, roleServices]) => {
            const info = roleInfo[roleCode]
            const color = info?.color ?? '#0C6780'
            const slug = info?.slug ?? roleCode.toLowerCase()
            const label = info?.label ?? roleCode

            return (
              <HorizontalScrollRow
                key={roleCode}
                title={label}
                subtitle={`${roleServices.length} service${roleServices.length !== 1 ? 's' : ''}`}
                icon={<span className="text-xl">{PROVIDER_EMOJI[roleCode] ?? '⚕️'}</span>}
                seeAllHref={`/search/${slug}`}
                seeAllLabel="Browse providers"
              >
                {roleServices.map(svc => (
                  <ServiceCard key={svc.id} service={svc} color={color} slug={slug} />
                ))}
              </HorizontalScrollRow>
            )
          })
        )}

        {/* Mobile see-all link */}
        <div className="text-center mt-4 sm:hidden">
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

function ServiceCard({ service, color, slug }: { service: ServiceItem; color: string; slug: string }) {
  const emoji = resolveCategoryEmoji(service.category, service.providerType)
  const iconBg = hex2rgba(color, 0.12)

  return (
    <Link
      href={`/search/${slug}`}
      className="group flex-shrink-0 snap-start w-[160px] sm:w-52 flex flex-col bg-white rounded-2xl border border-gray-100
        hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 overflow-hidden"
      style={{ borderTopWidth: 3, borderTopColor: color }}
    >
      {/* Icon area */}
      <div className="p-3 sm:p-4 flex-1 flex flex-col">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center mb-2.5 flex-shrink-0"
          style={{ background: iconBg }}
        >
          <span className="text-xl leading-none">{emoji}</span>
        </div>

        <h4
          className="text-sm font-bold leading-snug line-clamp-2 mb-1.5"
          style={{ color }}
        >
          {service.serviceName}
        </h4>

        {service.description && (
          <p className="text-[11px] text-gray-500 leading-relaxed line-clamp-2 flex-1">
            {service.description}
          </p>
        )}
      </div>

      {/* Footer */}
      <div className="px-3 sm:px-4 pb-3 pt-2 border-t border-gray-100 flex items-center justify-between gap-2">
        <span className="text-xs font-bold text-gray-900">
          Rs {service.defaultPrice.toLocaleString()}
        </span>
        {service.duration && (
          <span className="flex items-center gap-0.5 text-[10px] text-gray-400">
            <FaClock className="text-[9px]" /> {service.duration}m
          </span>
        )}
      </div>
    </Link>
  )
}
