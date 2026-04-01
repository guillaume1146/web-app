'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import * as FaIcons from 'react-icons/fa'
import { FaUserMd } from 'react-icons/fa'
import HorizontalScrollRow from '@/components/shared/HorizontalScrollRow'

interface ProviderSpecialty {
  name: string
  description: string | null
  icon: string | null
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

// Comprehensive emoji map for medical specialties
const SPECIALTY_EMOJI: Record<string, string> = {
  // Doctor specialties
  'General Practice': '🩺', 'Family Medicine': '👨‍👩‍👧‍👦', 'Internal Medicine': '🫀',
  'Cardiology': '❤️', 'Dermatology': '🧴', 'Endocrinology': '🦠',
  'Gastroenterology': '🫃', 'Geriatrics': '👴', 'Gynecology': '🤰',
  'Neurology': '🧠', 'Oncology': '🎗️', 'Ophthalmology': '👁️',
  'Orthopedics': '🦴', 'Pediatrics': '👶', 'Psychiatry': '🧘',
  'Psychology': '💭', 'Pulmonology': '🫁', 'Radiology': '📡',
  'Rheumatology': '🦵', 'Urology': '🏥', 'Anesthesiology': '💉',
  'Pathology': '🔬', 'Sports Medicine': '⚽', 'Preventive Medicine': '🛡️',
  'Sexual Health': '💕',
  // Nurse specialties
  'General Nursing': '💊', 'ICU / Critical Care': '🚨', 'Wound Care': '🩹',
  'Midwifery': '🤱', 'Pediatric Nursing': '👧', 'Geriatric Nursing': '🧓',
  'Mental Health Nursing': '🧠', 'Oncology Nursing': '🎗️',
  'Community Health': '🏘️', 'Home Care': '🏠',
  // Childcare specialties
  'Newborn Care': '👶', 'Toddler Care': '🧒', 'After-School': '📚',
  'Special Needs': '♿', 'Overnight Care': '🌙',
  // Pharmacist specialties
  'Clinical Pharmacy': '💊', 'Hospital Pharmacy': '🏥', 'Geriatric Pharmacy': '💊',
  'Oncology Pharmacy': '🎗️', 'Pediatric Pharmacy': '🧒',
  // Lab specialties
  'Hematology': '🩸', 'Microbiology': '🦠', 'Clinical Chemistry': '🧪',
  'Histology': '🔬', 'Immunology': '🛡️', 'Molecular Biology': '🧬',
  // Emergency specialties
  'Paramedic': '🚑', 'EMT-Basic': '🚑', 'EMT-Intermediate': '🚑',
  'Critical Care Transport': '🚁', 'Wilderness Rescue': '⛰️',
  // Caregiver specialties
  'Elder Care': '👴', 'Disability Care': '♿', 'Dementia Care': '🧠',
  'Post-Surgery Care': '🩹', 'Palliative Care': '🕊️',
  // Physiotherapy specialties
  'Orthopedic': '🦴', 'Neurological': '🧠', 'Sports': '🏃',
  'Pediatric': '👧', 'Geriatric': '🧓', 'Cardiopulmonary': '🫁',
  // Dentist specialties
  'General Dentistry': '🦷', 'Orthodontics': '😁', 'Periodontics': '🪥',
  'Endodontics': '🦷', 'Oral Surgery': '🏥', 'Cosmetic Dentistry': '✨',
  'Pediatric Dentistry': '👧',
  // Optometrist specialties
  'General Eye Care': '👓', 'Contact Lenses': '🔵', 'Pediatric Eye Care': '👧',
  'Low Vision': '🔍', 'Sports Vision': '🥽',
  // Nutritionist specialties
  'Clinical Nutrition': '🥗', 'Sports Nutrition': '💪', 'Weight Management': '⚖️',
  'Pediatric Nutrition': '🍎', 'Diabetes Nutrition': '🩸', 'Prenatal Nutrition': '🤰',
}

function getSpecialtyEmoji(name: string): string {
  return SPECIALTY_EMOJI[name] || '🏥'
}

function colorToCardStyle(hex: string): { bg: string; text: string; border: string; accent: string } {
  const map: Record<string, { bg: string; text: string; border: string; accent: string }> = {
    '#0C6780': { bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200', accent: 'bg-teal-100' },
    '#001E40': { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', accent: 'bg-blue-100' },
    '#22c55e': { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', accent: 'bg-green-100' },
    '#8b5cf6': { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', accent: 'bg-purple-100' },
    '#ec4899': { bg: 'bg-pink-50', text: 'text-pink-700', border: 'border-pink-200', accent: 'bg-pink-100' },
    '#ef4444': { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', accent: 'bg-red-100' },
    '#f97316': { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', accent: 'bg-orange-100' },
    '#6366f1': { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', accent: 'bg-indigo-100' },
    '#14b8a6': { bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200', accent: 'bg-teal-100' },
    '#0ea5e9': { bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-200', accent: 'bg-sky-100' },
  }
  return map[hex] || { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200', accent: 'bg-gray-100' }
}

export default function ProviderMarketplace() {
  const [roles, setRoles] = useState<ProviderRole[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/roles?searchEnabled=true')
      .then(r => r.json())
      .then(json => {
        if (json.success && json.data) {
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
              <div key={i} className="mb-10">
                <div className="h-5 bg-gray-200 rounded w-32 mb-4" />
                <div className="flex gap-4">
                  {[1, 2, 3, 4].map(j => (
                    <div key={j} className="w-48 h-36 bg-gray-100 rounded-2xl flex-shrink-0" />
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
    <section className="py-8 sm:py-12 bg-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-4">
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1 sm:mb-2">Find Healthcare Providers</h2>
        <p className="text-sm sm:text-base text-gray-600 mb-6 sm:mb-8">Browse by specialty across all provider types</p>

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
                  className={`flex-shrink-0 snap-start w-[140px] sm:w-48 md:w-52 p-3 sm:p-5 rounded-2xl border ${style.border} ${style.bg} hover:shadow-lg hover:scale-[1.02] transition-all group`}
                >
                  {/* Emoji icon — DB icon takes priority, fallback to hardcoded map */}
                  <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl ${style.accent} flex items-center justify-center text-xl sm:text-2xl mb-2 sm:mb-3`}>
                    {spec.icon || getSpecialtyEmoji(spec.name)}
                  </div>
                  <div className={`text-xs sm:text-sm font-bold ${style.text} group-hover:underline mb-1 line-clamp-2`}>
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
