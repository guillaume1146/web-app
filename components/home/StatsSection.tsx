'use client'

import { useState, useEffect } from 'react'

interface StatItem {
  number: string | number
  label: string
  color?: string
  icon?: string
}

const LOADING_STATS: StatItem[] = [
  { number: '—', label: 'Healthcare Providers', color: 'text-blue-500', icon: '🩺' },
  { number: '—', label: 'Registered Patients', color: 'text-green-500', icon: '👥' },
  { number: '—', label: 'Medical Specialties', color: 'text-purple-500', icon: '🏥' },
  { number: '—', label: 'Health Products', color: 'text-orange-500', icon: '💊' },
  { number: '—', label: 'Consultations', color: 'text-teal-500', icon: '📋' },
  { number: '—', label: 'Regions Covered', color: 'text-cyan-500', icon: '🌍' },
]

function formatNumber(n: string | number): string {
  const num = typeof n === 'string' ? parseInt(n) : n
  if (isNaN(num)) return String(n)
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
  return num.toLocaleString()
}

export default function StatsSection() {
  const [stats, setStats] = useState<StatItem[]>(LOADING_STATS)

  useEffect(() => {
    fetch('/api/stats')
      .then(r => r.json())
      .then(data => {
        if (data.success && data.data) setStats(data.data)
      })
      .catch(() => {})
  }, [])

  return (
    <section className="bg-white py-8 sm:py-12">
      <div className="max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          {stats.map((stat, i) => (
            <div
              key={i}
              className="bg-gray-50 rounded-2xl p-4 sm:p-5 text-center hover:shadow-md transition-shadow"
            >
              {stat.icon && (
                <span className="text-2xl sm:text-3xl block mb-1">{stat.icon}</span>
              )}
              <div className={`text-2xl sm:text-3xl font-bold ${stat.color || 'text-gray-900'}`}>
                {formatNumber(stat.number)}
              </div>
              <div className="text-xs sm:text-sm text-gray-500 mt-1 leading-tight">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
