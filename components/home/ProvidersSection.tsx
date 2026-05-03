'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { FaSearch, FaUserMd, FaStar, FaArrowRight, FaCheckCircle } from 'react-icons/fa'
import HorizontalScrollRow from '@/components/shared/HorizontalScrollRow'
import { avatarSrc } from '@/lib/utils/avatar'

interface ProviderCard {
  id: string
  firstName: string
  lastName: string
  profileImage: string | null
  userType: string
  specialty?: string | null
  rating?: number | null
  reviewCount?: number | null
  verified: boolean
}

interface ProviderGroup {
  code: string
  label: string
  slug: string
  color: string
  providers: ProviderCard[]
}

interface RoleData {
  code: string
  label: string
  slug: string
  color: string
  providerCount: number
}

const PROVIDER_EMOJI: Record<string, string> = {
  DOCTOR: '🩺', NURSE: '💉', NANNY: '🧸', PHARMACIST: '💊',
  LAB_TECHNICIAN: '🧪', EMERGENCY_WORKER: '🚑', CAREGIVER: '🤝',
  PHYSIOTHERAPIST: '🏃', DENTIST: '🦷', OPTOMETRIST: '👁️',
  NUTRITIONIST: '🥗',
}

// DOCTOR always first, then alphabetical by label
function sortRoles(roles: RoleData[]): RoleData[] {
  return [...roles].sort((a, b) => {
    if (a.code === 'DOCTOR') return -1
    if (b.code === 'DOCTOR') return 1
    return a.label.localeCompare(b.label)
  })
}

function mapProviders(raw: any[]): ProviderCard[] {
  return raw.map((p: any) => ({
    id: p.id,
    firstName: p.firstName,
    lastName: p.lastName,
    profileImage: p.profileImage,
    userType: p.userType,
    specialty: p.specialty || p.doctorProfile?.specialty?.[0] || p.nurseProfile?.specializations?.[0] || null,
    rating: p.rating || p.doctorProfile?.rating || null,
    reviewCount: p.reviewCount || p.doctorProfile?.reviewCount || null,
    verified: p.verified,
  }))
}

function hex2rgba(hex: string, alpha = 0.12) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

export default function ProvidersSection() {
  const [groups, setGroups] = useState<ProviderGroup[]>([])
  const [roles, setRoles] = useState<RoleData[]>([])
  const [loading, setLoading] = useState(true)

  const [activeRole, setActiveRole] = useState<string>('ALL')
  const [searchQuery, setSearchQuery] = useState('')

  // Dedicated state for the full grid when a specific role is selected
  const [gridProviders, setGridProviders] = useState<ProviderCard[]>([])
  const [gridLoading, setGridLoading] = useState(false)
  const [gridColor, setGridColor] = useState('#0C6780')
  const [gridSlug, setGridSlug] = useState('')

  // Initial load — fetch 8 providers per role for the "All" horizontal rows
  useEffect(() => {
    fetch('/api/roles?searchEnabled=true')
      .then(r => r.json())
      .then(async (json) => {
        if (!json.success || !Array.isArray(json.data)) return
        const sorted = sortRoles(json.data as RoleData[])
        setRoles(sorted)

        const grouped = await Promise.all(
          sorted.map(async (role) => {
            try {
              const res = await fetch(`/api/search/providers?type=${role.code}&limit=8`)
              const data = await res.json()
              const providers = mapProviders(data.providers || data.data || [])
              return { ...role, providers }
            } catch {
              return { ...role, providers: [] }
            }
          })
        )
        setGroups(grouped.filter(g => g.providers.length > 0))
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  // When a specific role chip is clicked, fetch up to 50 providers for the full grid
  const handleRoleSelect = async (code: string) => {
    setActiveRole(code)
    setSearchQuery('')

    if (code === 'ALL') {
      setGridProviders([])
      return
    }

    const role = roles.find(r => r.code === code)
    if (!role) return

    setGridColor(role.color)
    setGridSlug(role.slug)
    setGridLoading(true)
    setGridProviders([])

    try {
      const res = await fetch(`/api/search/providers?type=${code}&limit=50`)
      const data = await res.json()
      setGridProviders(mapProviders(data.providers || data.data || []))
    } catch {
      setGridProviders([])
    } finally {
      setGridLoading(false)
    }
  }

  // Client-side search filter on the grid list
  const filteredGrid = useMemo(() => {
    if (!searchQuery.trim()) return gridProviders
    const q = searchQuery.toLowerCase()
    return gridProviders.filter(p =>
      `${p.firstName} ${p.lastName}`.toLowerCase().includes(q) ||
      (p.specialty?.toLowerCase().includes(q))
    )
  }, [gridProviders, searchQuery])

  // Client-side search filter on horizontal rows
  const filteredGroups = useMemo(() => {
    if (!searchQuery.trim() || activeRole !== 'ALL') return groups
    const q = searchQuery.toLowerCase()
    return groups.map(g => ({
      ...g,
      providers: g.providers.filter(p =>
        `${p.firstName} ${p.lastName}`.toLowerCase().includes(q) ||
        (p.specialty?.toLowerCase().includes(q))
      ),
    })).filter(g => g.providers.length > 0)
  }, [groups, searchQuery, activeRole])

  const activeRoleInfo = roles.find(r => r.code === activeRole)

  return (
    <section className="py-8 sm:py-12 bg-gray-50 overflow-hidden">
      <div className="w-full px-4 sm:px-6 lg:px-10 xl:px-14">

        {/* Sticky header */}
        <div className="sticky top-0 z-20 -mx-4 sm:-mx-6 lg:-mx-10 xl:-mx-14 px-4 sm:px-6 lg:px-10 xl:px-14
          pt-4 sm:pt-6 pb-3 sm:pb-4 mb-4 sm:mb-6 bg-gray-50/95 backdrop-blur-sm border-b border-gray-200">

          <div className="flex items-start justify-between gap-4 mb-3">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2">
                <FaUserMd className="text-[#0C6780] text-xl" />
                Browse Providers
              </h2>
              <p className="text-sm text-gray-500 mt-0.5">Find qualified healthcare professionals near you</p>
            </div>
            {activeRole !== 'ALL' && activeRoleInfo && (
              <Link
                href={`/search/${activeRoleInfo.slug}`}
                className="hidden sm:flex items-center gap-1 text-sm font-medium text-[#0C6780] hover:text-[#001E40] transition-colors whitespace-nowrap mt-1"
              >
                See All {activeRoleInfo.label} <FaArrowRight className="text-xs" />
              </Link>
            )}
          </div>

          {/* Search + role chips */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-shrink-0 sm:w-64">
              <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
              <input
                type="text"
                placeholder="Search by name or specialty..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0C6780]/30 focus:border-[#0C6780] bg-white"
              />
            </div>

            <div className="flex gap-1.5 overflow-x-auto pb-0.5 [&::-webkit-scrollbar]:hidden">
              <button
                onClick={() => handleRoleSelect('ALL')}
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
                  onClick={() => handleRoleSelect(role.code)}
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

        {/* ── Content ── */}
        {loading ? (
          <div className="space-y-10">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse">
                <div className="h-5 bg-gray-200 rounded w-36 mb-4" />
                <div className="flex gap-4">
                  {[1, 2, 3, 4].map(j => (
                    <div key={j} className="flex-shrink-0 w-[140px] sm:w-44 h-48 bg-white rounded-2xl border border-gray-200" />
                  ))}
                </div>
              </div>
            ))}
          </div>

        ) : activeRole === 'ALL' ? (
          /* Horizontal scroll rows — one per role */
          filteredGroups.length === 0 ? (
            <div className="text-center py-16">
              <FaUserMd className="text-4xl text-gray-300 mx-auto mb-3" />
              <p className="text-sm font-medium text-gray-600">No providers match your search.</p>
              <button onClick={() => setSearchQuery('')} className="mt-2 text-xs text-[#0C6780] hover:underline">Clear search</button>
            </div>
          ) : (
            filteredGroups.map(group => (
              <HorizontalScrollRow
                key={group.code}
                title={group.label}
                subtitle={`${group.providers.length} provider${group.providers.length !== 1 ? 's' : ''} shown`}
                icon={<span className="text-xl">{PROVIDER_EMOJI[group.code] ?? '👨‍⚕️'}</span>}
                seeAllHref={`/search/${group.slug}`}
                seeAllLabel="See All"
              >
                {group.providers.map(provider => (
                  <ProviderCardItem key={provider.id} provider={provider} color={group.color} slug={group.slug} />
                ))}
              </HorizontalScrollRow>
            ))
          )

        ) : (
          /* Full responsive grid for selected role */
          gridLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="animate-pulse bg-white rounded-2xl h-52 border border-gray-200" />
              ))}
            </div>
          ) : filteredGrid.length === 0 ? (
            <div className="text-center py-16">
              <FaUserMd className="text-4xl text-gray-300 mx-auto mb-3" />
              <p className="text-sm font-medium text-gray-600">
                {searchQuery ? 'No providers match your search.' : 'No providers found for this category.'}
              </p>
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="mt-2 text-xs text-[#0C6780] hover:underline">Clear search</button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {filteredGrid.map(provider => (
                <ProviderCardItem key={provider.id} provider={provider} color={gridColor} slug={gridSlug} />
              ))}
            </div>
          )
        )}
      </div>
    </section>
  )
}

function ProviderCardItem({ provider, color, slug }: { provider: ProviderCard; color: string; slug: string }) {
  const bgSoft = hex2rgba(color, 0.08)

  return (
    <Link
      href={`/profile/${provider.id}`}
      className="group flex flex-col items-center
        bg-white rounded-2xl border border-gray-100 p-3 sm:p-4
        hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 snap-start flex-shrink-0 w-[140px] sm:w-44"
      style={{ borderTopWidth: 3, borderTopColor: color }}
    >
      <div className="relative mb-2.5">
        <img
          src={avatarSrc(provider.profileImage, provider.firstName, provider.lastName)}
          alt={`${provider.firstName} ${provider.lastName}`}
          className="w-14 h-14 sm:w-16 sm:h-16 rounded-full object-cover border-2 border-white shadow"
        />
        {provider.verified && (
          <FaCheckCircle
            className="absolute -bottom-0.5 -right-0.5 text-blue-500 text-sm bg-white rounded-full"
            title="Verified"
          />
        )}
      </div>

      <h4 className="text-xs sm:text-sm font-bold text-gray-900 text-center line-clamp-2 leading-snug mb-1">
        {provider.firstName} {provider.lastName}
      </h4>

      <span
        className="text-[10px] font-semibold px-2 py-0.5 rounded-full mb-1.5"
        style={{ background: bgSoft, color }}
      >
        {PROVIDER_EMOJI[provider.userType] ?? ''} {slug.replace(/-/g, ' ')}
      </span>

      {provider.specialty && (
        <p className="text-[10px] text-gray-500 text-center line-clamp-2 mb-1.5">
          {Array.isArray(provider.specialty) ? provider.specialty[0] : provider.specialty}
        </p>
      )}

      {provider.rating && provider.rating > 0 && (
        <div className="flex items-center gap-0.5 text-[10px] text-amber-500 font-medium">
          <FaStar className="text-[9px]" />
          {Number(provider.rating).toFixed(1)}
          {provider.reviewCount && (
            <span className="text-gray-400 ml-0.5">({provider.reviewCount})</span>
          )}
        </div>
      )}

      <div
        className="mt-auto pt-2.5 w-full text-center text-[10px] font-semibold flex items-center justify-center gap-1 group-hover:gap-2 transition-all"
        style={{ color }}
      >
        View Profile <FaArrowRight className="text-[8px]" />
      </div>
    </Link>
  )
}
