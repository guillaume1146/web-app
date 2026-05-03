'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { FaShieldAlt, FaBuilding, FaArrowRight } from 'react-icons/fa'

interface Company {
  id: string
  companyName: string
  industry: string | null
  isInsuranceCompany: boolean
}

// Deterministic color from company name — no random on each render
function companyColor(name: string): string {
  const COLORS = [
    '#0C6780', '#001E40', '#0a5c73', '#1a6b8a',
    '#0e4a6b', '#2d7d8f', '#1e5f74', '#0f3460',
  ]
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return COLORS[Math.abs(hash) % COLORS.length]
}

function companyInitials(name: string): string {
  return name.split(/\s+/).map(w => w[0] ?? '').join('').toUpperCase().slice(0, 2)
}

// Fallback static list so the bar is never empty on first paint
const FALLBACK: Company[] = [
  { id: '1', companyName: 'MediShield Mauritius', industry: 'Insurance', isInsuranceCompany: true },
  { id: '2', companyName: 'Rogers Group', industry: 'Financial Services', isInsuranceCompany: false },
  { id: '3', companyName: 'Swan Life Ltd', industry: 'Insurance', isInsuranceCompany: true },
  { id: '4', companyName: 'MUA Insurance', industry: 'Insurance', isInsuranceCompany: true },
  { id: '5', companyName: 'MediCare Clinic', industry: 'Healthcare', isInsuranceCompany: false },
]

export default function CompanyTrustBar() {
  const [companies, setCompanies] = useState<Company[]>(FALLBACK)

  useEffect(() => {
    fetch('/api/corporate/companies?type=all')
      .then(r => r.json())
      .then(json => {
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          setCompanies(json.data)
        }
      })
      .catch(() => {})
  }, [])

  // Duplicate list so the seamless loop never shows a gap
  const track = [...companies, ...companies, ...companies]

  return (
    <div className="bg-gradient-to-r from-[#001E40] via-[#0C6780] to-[#001E40] py-4 sm:py-5 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 mb-3">
        <div className="flex items-center justify-between">
          <p className="text-white/70 text-xs sm:text-sm font-medium tracking-wide uppercase">
            Trusted by companies across the region
          </p>
          <Link
            href="/search/company"
            className="flex items-center gap-1 text-xs text-[#9AE1FF] hover:text-white transition-colors font-medium"
          >
            Find Companies <FaArrowRight className="text-[9px]" />
          </Link>
        </div>
      </div>

      {/* Marquee track */}
      <div className="relative">
        {/* Left + right fade masks */}
        <div className="absolute left-0 top-0 bottom-0 w-16 z-10 pointer-events-none"
          style={{ background: 'linear-gradient(to right, #001E40, transparent)' }} />
        <div className="absolute right-0 top-0 bottom-0 w-16 z-10 pointer-events-none"
          style={{ background: 'linear-gradient(to left, #001E40, transparent)' }} />

        <div
          className="flex gap-4 px-4"
          style={{
            animation: 'marquee 28s linear infinite',
            width: 'max-content',
          }}
        >
          {track.map((company, idx) => {
            const color = companyColor(company.companyName)
            const initials = companyInitials(company.companyName)
            return (
              <Link
                key={`${company.id}-${idx}`}
                href="/search/company"
                className="flex items-center gap-2.5 bg-white/10 hover:bg-white/20 backdrop-blur-sm
                  border border-white/15 rounded-xl px-4 py-2.5 flex-shrink-0 transition-colors group"
              >
                {/* Logo placeholder — colored initials circle */}
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                  style={{ backgroundColor: color }}
                >
                  {initials}
                </div>
                <div className="min-w-0">
                  <p className="text-white text-xs sm:text-sm font-semibold whitespace-nowrap leading-tight">
                    {company.companyName}
                  </p>
                  <p className="text-white/50 text-[10px] whitespace-nowrap flex items-center gap-1">
                    {company.isInsuranceCompany
                      ? <><FaShieldAlt className="text-[8px]" /> Insurance</>
                      : <><FaBuilding className="text-[8px]" /> {company.industry ?? 'Corporate'}</>
                    }
                  </p>
                </div>
              </Link>
            )
          })}
        </div>
      </div>

      {/* Keyframe — injected once via a style tag */}
      <style>{`
        @keyframes marquee {
          0%   { transform: translateX(0); }
          100% { transform: translateX(calc(-100% / 3)); }
        }
        @media (prefers-reduced-motion: reduce) {
          .marquee-track { animation: none !important; }
        }
      `}</style>
    </div>
  )
}
