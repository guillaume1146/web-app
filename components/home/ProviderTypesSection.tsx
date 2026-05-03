'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import * as FaIcons from 'react-icons/fa'
import { FaUserMd, FaArrowRight } from 'react-icons/fa'

interface RoleData {
  code: string
  label: string
  singularLabel: string
  slug: string
  icon: string
  color: string
  description: string | null
  providerCount: number
}

// Large illustrative emoji per provider type shown at the top of each card
const ROLE_EMOJI: Record<string, string> = {
  DOCTOR:           '🩺',
  NURSE:            '💉',
  NANNY:            '🧸',
  PHARMACIST:       '💊',
  LAB_TECHNICIAN:   '🧪',
  EMERGENCY_WORKER: '🚑',
  CAREGIVER:        '🤝',
  PHYSIOTHERAPIST:  '🏃',
  DENTIST:          '🦷',
  OPTOMETRIST:      '👁️',
  NUTRITIONIST:     '🥗',
}

// Fallback descriptions shown when DB description is missing
const FALLBACK_DESC: Record<string, string> = {
  DOCTOR:           'Book certified GPs and specialists for consultations, prescriptions, and referrals.',
  NURSE:            'Professional nursing care for home visits, wound care, and post-surgery recovery.',
  NANNY:            'Certified childcare providers for daily care, activities, and overnight supervision.',
  PHARMACIST:       'Prescription dispensing, medication reviews, and health screenings.',
  LAB_TECHNICIAN:   'Home sample collection and fast results for all standard lab tests.',
  EMERGENCY_WORKER: '24/7 ambulance dispatch and first-response paramedics.',
  CAREGIVER:        'Daily assistance and companionship for the elderly and those with special needs.',
  PHYSIOTHERAPIST:  'Rehabilitation sessions for sports injuries, post-surgery recovery, and chronic pain.',
  DENTIST:          'Routine check-ups, fillings, orthodontics, and cosmetic dental treatments.',
  OPTOMETRIST:      'Eye exams, glasses prescriptions, and contact lens fittings.',
  NUTRITIONIST:     'Personalized diet plans for weight management, diabetes, and sports performance.',
}

function resolveIcon(iconName: string) {
  return (FaIcons as Record<string, React.ComponentType<{ className?: string }>>)[iconName] || FaUserMd
}

function hex2rgba(hex: string, alpha = 0.12) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

export default function ProviderTypesSection() {
  const [roles, setRoles] = useState<RoleData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/roles?searchEnabled=true')
      .then(r => r.json())
      .then(json => {
        if (json.success && json.data) {
          setRoles(
            (json.data as RoleData[])
              .filter(r => r.providerCount > 0 || process.env.NODE_ENV === 'development')
              .sort((a, b) => (b.providerCount ?? 0) - (a.providerCount ?? 0))
          )
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (!loading && roles.length === 0) return null

  return (
    <section className="py-10 sm:py-14 bg-white">
      <div className="w-full px-4 sm:px-6 lg:px-10 xl:px-14">

        {/* Section header */}
        <div className="text-center mb-8 sm:mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
            Our Healthcare Services
          </h2>
          <p className="text-gray-500 text-sm sm:text-base max-w-xl mx-auto">
            Qualified professionals across every discipline, bookable in minutes.
          </p>
        </div>

        {/* Cards grid */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="animate-pulse bg-gray-100 rounded-2xl h-52" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {roles.map(role => {
              const IconComponent = resolveIcon(role.icon)
              const emoji = ROLE_EMOJI[role.code] ?? '🏥'
              const desc = role.description || FALLBACK_DESC[role.code] || ''
              const bgSoft = hex2rgba(role.color, 0.08)
              const iconBg = hex2rgba(role.color, 0.15)

              return (
                <Link
                  key={role.code}
                  href={`/search/${role.slug}`}
                  className="group flex flex-col rounded-2xl border border-gray-100 bg-white p-5 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                  style={{ borderTopWidth: 3, borderTopColor: role.color }}
                >
                  {/* Icon area */}
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center mb-3 flex-shrink-0"
                    style={{ background: iconBg }}
                  >
                    <span className="text-2xl leading-none">{emoji}</span>
                  </div>

                  {/* Title */}
                  <h3
                    className="text-sm font-bold mb-1.5 leading-tight"
                    style={{ color: role.color }}
                  >
                    {role.label}
                  </h3>

                  {/* Description */}
                  <p className="text-xs text-gray-500 leading-relaxed flex-1 line-clamp-3">
                    {desc}
                  </p>

                  {/* Footer */}
                  <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between">
                    <span className="text-[11px] text-gray-400 font-medium">
                      {role.providerCount > 0
                        ? `${role.providerCount} provider${role.providerCount !== 1 ? 's' : ''}`
                        : 'Available'}
                    </span>
                    <span
                      className="flex items-center gap-1 text-[11px] font-semibold group-hover:gap-2 transition-all"
                      style={{ color: role.color }}
                    >
                      Find <FaArrowRight className="text-[9px]" />
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}
