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

function hex2rgba(hex: string, alpha = 0.12) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

function resolveServiceEmoji(name: string, category: string, providerType: string): string {
  const text = `${name} ${category}`.toLowerCase()
  if (/cardio|heart/.test(text)) return '🫀'
  if (/lung|pulmon|respir|chest|breath/.test(text)) return '🫁'
  if (/brain|neuro|stroke|cereb/.test(text)) return '🧠'
  if (/dental|teeth|tooth|oral|mouth/.test(text)) return '🦷'
  if (/eye|vision|optom|ophth|sight|retina/.test(text)) return '👁️'
  if (/bone|ortho|joint|spine|fracture|arthrit/.test(text)) return '🦴'
  if (/blood test|hematol|anemia|transfus/.test(text)) return '🩸'
  if (/lab|sample|culture|swab|biopsy|pathol/.test(text)) return '🧪'
  if (/vaccine|immuniz|vaccin|shot/.test(text)) return '💉'
  if (/prescription|medicine|medication|drug|pharmacy|dispens/.test(text)) return '💊'
  if (/home visit|house call|domicil|home care/.test(text)) return '🏠'
  if (/video|telehealth|telemedicine|online consult|remote|virtual/.test(text)) return '📹'
  if (/emergency|ambulance|urgent|trauma|rescue/.test(text)) return '🚑'
  if (/physio|rehabilit|exercise|movement|mobility/.test(text)) return '🏃'
  if (/nutrition|diet|food|meal|weight|obesity/.test(text)) return '🥗'
  if (/caregiver|elder|geriat|elderly|senior care/.test(text)) return '🤝'
  if (/child|pediatr|baby|infant|newborn|neonat/.test(text)) return '👶'
  if (/pregnan|obstetric|maternal|antenatal|prenatal|birth|deliver/.test(text)) return '🤰'
  if (/mental|psych|anxiety|depress|counsel|therap/.test(text)) return '🧠'
  if (/skin|derma|acne|rash/.test(text)) return '🧴'
  if (/ear|hearing|ent|audiol/.test(text)) return '👂'
  if (/kidney|renal|urol|bladder/.test(text)) return '🫘'
  if (/stomach|gastro|digest|bowel|colon|intestin/.test(text)) return '🫃'
  if (/liver|hepat|gallblad/.test(text)) return '🫀'
  if (/diabetes|glucose|insulin|endocrin|thyroid/.test(text)) return '💓'
  if (/nanny|childcare|babysit/.test(text)) return '🧸'
  if (/x.ray|imaging|scan|mri|ultrasound|radiol/.test(text)) return '🩻'
  if (/wound|dress|injury|bandage/.test(text)) return '🩹'
  if (/blood pressure|hypertens|cardiovas/.test(text)) return '💓'
  if (/oxygen|asthma|inhaler/.test(text)) return '💨'
  if (/cancer|oncol|tumor/.test(text)) return '🎗️'
  if (/surgery|operat|procedure/.test(text)) return '🔬'
  if (/consult|checkup|check-up|appointment|visit|general/.test(text)) return '🩺'
  const FALLBACK: Record<string, string> = {
    DOCTOR: '🩺', NURSE: '💉', NANNY: '🧸', PHARMACIST: '💊',
    LAB_TECHNICIAN: '🧪', EMERGENCY_WORKER: '🚑', CAREGIVER: '🤝',
    PHYSIOTHERAPIST: '🏃', DENTIST: '🦷', OPTOMETRIST: '👁️',
    NUTRITIONIST: '🥗',
  }
  return FALLBACK[providerType] ?? '⚕️'
}

const PROVIDER_EMOJI: Record<string, string> = {
  DOCTOR: '🩺', NURSE: '💉', NANNY: '🧸', PHARMACIST: '💊',
  LAB_TECHNICIAN: '🧪', EMERGENCY_WORKER: '🚑', CAREGIVER: '🤝',
  PHYSIOTHERAPIST: '🏃', DENTIST: '🦷', OPTOMETRIST: '👁️',
  NUTRITIONIST: '🥗',
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

  const groupedByRole = useMemo(() => {
    const map: Record<string, ServiceItem[]> = {}
    for (const svc of filtered) {
      if (!map[svc.providerType]) map[svc.providerType] = []
      map[svc.providerType].push(svc)
    }
    return map
  }, [filtered])

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
                    <div key={j} className="flex-shrink-0 w-[160px] sm:w-52 h-52 bg-gray-100 rounded-2xl" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : fetchError || Object.keys(groupedByRole).length === 0 ? (
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
          Object.entries(groupedByRole).map(([roleCode, roleServices]) => {
            const info = roleInfo[roleCode]
            const color = info?.color ?? '#0C6780'
            const slug = info?.slug ?? roleCode.toLowerCase()
            const label = info?.label ?? roleCode

            return (
              <HorizontalScrollRow
                key={roleCode}
                title={`From ${label}`}
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
  const emoji = resolveServiceEmoji(service.serviceName, service.category, service.providerType)
  const bgLight  = hex2rgba(color, 0.10)
  const bgMedium = hex2rgba(color, 0.20)

  return (
    <Link
      href={`/search/${slug}`}
      className="group flex-shrink-0 snap-start w-[160px] sm:w-52 flex flex-col bg-white rounded-2xl border border-gray-100
        hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 overflow-hidden"
    >
      {/* Emoji illustration header */}
      <div
        className="relative w-full h-28 sm:h-32 flex-shrink-0 flex items-center justify-center overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${bgMedium} 0%, ${bgLight} 100%)` }}
      >
        <span
          className="text-5xl sm:text-6xl select-none group-hover:scale-110 transition-transform duration-300"
          role="img"
          aria-label={service.serviceName}
        >
          {emoji}
        </span>
        <div className="absolute bottom-0 left-0 right-0 h-1" style={{ backgroundColor: color }} />
      </div>

      {/* Text */}
      <div className="p-3 sm:p-4 flex-1 flex flex-col">
        <h4 className="text-sm font-bold leading-snug line-clamp-2 mb-1" style={{ color }}>
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
