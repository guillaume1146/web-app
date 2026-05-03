'use client'

import dynamic from 'next/dynamic'
import { useState } from 'react'

type Choice = 'services' | 'providers' | 'community' | 'health-shop'

// Each section is loaded only when the user picks that category
const ServicesSection = dynamic(() => import('./ServicesSection'), {
  ssr: false,
  loading: () => <SectionSkeleton />,
})
const ProvidersSection = dynamic(() => import('./ProvidersSection'), {
  ssr: false,
  loading: () => <SectionSkeleton />,
})
const CommunityPosts = dynamic(() => import('./CommunityPosts'), {
  ssr: false,
  loading: () => <SectionSkeleton />,
})
const HealthShopMarketplace = dynamic(() => import('./HealthShopMarketplace'), {
  ssr: false,
  loading: () => <SectionSkeleton />,
})

function SectionSkeleton() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="animate-pulse bg-gray-100 rounded-2xl h-40" />
        ))}
      </div>
    </div>
  )
}

interface ChoiceDef {
  id: Choice
  emoji: string
  title: string
  desc: string
  color: string
  lightBg: string
}

const CHOICES: ChoiceDef[] = [
  {
    id: 'services',
    emoji: '🩺',
    title: 'Book a Service',
    desc: 'Browse medical services and schedule a visit',
    color: '#0C6780',
    lightBg: '#e0f5fb',
  },
  {
    id: 'providers',
    emoji: '👨‍⚕️',
    title: 'Find a Provider',
    desc: 'Discover doctors, nurses, and specialists near you',
    color: '#001E40',
    lightBg: '#e8ecf2',
  },
  {
    id: 'community',
    emoji: '💬',
    title: 'Community',
    desc: 'Read health tips, join discussions, follow providers',
    color: '#0a5c73',
    lightBg: '#dff0f5',
  },
  {
    id: 'health-shop',
    emoji: '🛒',
    title: 'Health Shop',
    desc: 'Order medicines, equipment, and health products',
    color: '#1a6b8a',
    lightBg: '#dceef5',
  },
]

export default function DiscoverSection() {
  const [selected, setSelected] = useState<Choice | null>(null)

  const activeChoice = selected ? CHOICES.find(c => c.id === selected) : null

  return (
    <div className="bg-white">
      <div
        className={`max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 transition-all duration-300 ${
          selected ? 'pt-5 pb-2' : 'py-12 sm:py-16'
        }`}
      >
        {/* ── State A: no choice made — show the big question ── */}
        {!selected && (
          <div className="text-center mb-10 sm:mb-14">
            {/* Animated question mark badge */}
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-[#0C6780]/15 to-[#001E40]/10 mb-5 shadow-inner">
              <span className="text-4xl font-black text-[#0C6780] select-none">?</span>
            </div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#001E40] leading-tight">
              What are you looking for today?
            </h2>
            <p className="mt-3 text-base sm:text-lg text-gray-500 max-w-md mx-auto">
              Pick a category and start exploring MediWyz
            </p>
          </div>
        )}

        {/* ── State B: choice made — compact tab strip ── */}
        {selected && (
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setSelected(null)}
              className="flex-shrink-0 text-sm text-gray-400 hover:text-[#0C6780] transition-colors flex items-center gap-1 py-1.5 pr-3 border-r border-gray-200"
            >
              ← All
            </button>
            {CHOICES.map(c => (
              <button
                key={c.id}
                onClick={() => setSelected(c.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all border flex-shrink-0 ${
                  selected === c.id
                    ? 'text-white border-transparent shadow-sm'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-[#0C6780] hover:text-[#0C6780]'
                }`}
                style={
                  selected === c.id
                    ? { backgroundColor: c.color, borderColor: c.color }
                    : {}
                }
              >
                <span className="text-sm">{c.emoji}</span>
                {c.title}
              </button>
            ))}
          </div>
        )}

        {/* ── Choice cards (only when nothing is selected) ── */}
        {!selected && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
            {CHOICES.map(c => (
              <button
                key={c.id}
                onClick={() => setSelected(c.id)}
                className="group text-left rounded-2xl border-2 border-gray-100 p-5 sm:p-6 flex flex-col gap-4
                  hover:border-[var(--card-color)] hover:shadow-lg hover:-translate-y-0.5
                  active:translate-y-0 transition-all duration-200
                  focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--card-color)]"
                style={{ '--card-color': c.color } as React.CSSProperties}
              >
                {/* Emoji bubble */}
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0
                    group-hover:scale-105 transition-transform duration-200"
                  style={{ backgroundColor: c.lightBg }}
                >
                  {c.emoji}
                </div>

                {/* Text */}
                <div className="flex-1 min-w-0">
                  <p
                    className="font-bold text-[#001E40] text-sm sm:text-base leading-snug"
                  >
                    {c.title}
                  </p>
                  <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                    {c.desc}
                  </p>
                </div>

                {/* Explore arrow */}
                <div
                  className="flex items-center gap-1 text-xs font-semibold mt-auto
                    opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                  style={{ color: c.color }}
                >
                  Explore →
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Dynamically loaded section ── */}
      {selected && (
        <div key={selected}>
          {selected === 'services'   && <ServicesSection />}
          {selected === 'providers'  && <ProvidersSection />}
          {selected === 'community'  && <CommunityPosts />}
          {selected === 'health-shop' && <HealthShopMarketplace />}
        </div>
      )}
    </div>
  )
}
