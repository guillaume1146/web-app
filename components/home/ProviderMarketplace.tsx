'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import * as FaIcons from 'react-icons/fa'
import { FaUserMd, FaSearch } from 'react-icons/fa'
import HorizontalScrollRow from '@/components/shared/HorizontalScrollRow'

interface ProviderSpecialty {
  name: string
  description: string | null
}

interface ProviderRole {
  code: string
  label: string
  singularLabel: string
  slug: string
  icon: string
  color: string
  description: string | null
  providerCount: number
  specialties: ProviderSpecialty[]
}

function resolveIcon(iconName: string) {
  return (FaIcons as Record<string, React.ComponentType<{ className?: string }>>)[iconName] || FaUserMd
}

// Map hex colors to Tailwind bg classes for specialty cards
function colorToCardStyle(hex: string): { bg: string; text: string; border: string } {
  const map: Record<string, { bg: string; text: string; border: string }> = {
    '#0C6780': { bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200' },
    '#001E40': { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
    '#22c55e': { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
    '#8b5cf6': { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
    '#ec4899': { bg: 'bg-pink-50', text: 'text-pink-700', border: 'border-pink-200' },
    '#ef4444': { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
    '#f97316': { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
    '#6366f1': { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200' },
    '#14b8a6': { bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200' },
    '#0ea5e9': { bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-200' },
  }
  return map[hex] || { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200' }
}

export default function ProviderMarketplace() {
  const [roles, setRoles] = useState<ProviderRole[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/roles?searchEnabled=true')
      .then(r => r.json())
      .then(json => {
        if (json.success && json.data) {
          // Only show roles that have specialties
          setRoles(json.data.filter((r: ProviderRole) => r.specialties?.length > 0))
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <section className="py-12 bg-white">
        <div className="container mx-auto px-4">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-64 mb-2" />
            <div className="h-4 bg-gray-100 rounded w-96 mb-8" />
            {[1, 2, 3].map(i => (
              <div key={i} className="mb-8">
                <div className="h-5 bg-gray-200 rounded w-32 mb-4" />
                <div className="flex gap-3">
                  {[1, 2, 3, 4, 5].map(j => (
                    <div key={j} className="w-36 h-24 bg-gray-100 rounded-xl flex-shrink-0" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    )
  }

  if (roles.length === 0) return null

  return (
    <section className="py-12 bg-white">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Find Healthcare Providers</h2>
        <p className="text-gray-600 mb-8">Browse by specialty across all provider types</p>

        {roles.map(role => {
          const Icon = resolveIcon(role.icon)
          const style = colorToCardStyle(role.color)

          return (
            <HorizontalScrollRow
              key={role.code}
              title={role.label}
              subtitle={`${role.providerCount} provider${role.providerCount !== 1 ? 's' : ''} available`}
              icon={<Icon className={style.text} />}
              seeAllHref={`/search/${role.slug}`}
            >
              {role.specialties.map((spec) => (
                <Link
                  key={spec.name}
                  href={`/search/${role.slug}?specialty=${encodeURIComponent(spec.name)}`}
                  className={`flex-shrink-0 snap-start w-40 sm:w-44 p-4 rounded-xl border ${style.border} ${style.bg} hover:shadow-md transition-all group`}
                >
                  <div className={`text-sm font-semibold ${style.text} group-hover:underline mb-1 line-clamp-2`}>
                    {spec.name}
                  </div>
                  {spec.description && (
                    <p className="text-xs text-gray-500 line-clamp-2">{spec.description}</p>
                  )}
                </Link>
              ))}
            </HorizontalScrollRow>
          )
        })}
      </div>
    </section>
  )
}
