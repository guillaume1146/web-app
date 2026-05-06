'use client'

import dynamic from 'next/dynamic'
import { useState } from 'react'

type Choice = 'services' | 'providers' | 'community' | 'health-shop' | 'organizations'

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
const OrganizationsSection = dynamic(() => import('./OrganizationsSection'), {
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
  color: string
}

const CHOICES: ChoiceDef[] = [
  { id: 'services',    emoji: '🩺', title: 'Book a Service',  color: '#0C6780' },
  { id: 'providers',   emoji: '👨‍⚕️', title: 'Find a Provider', color: '#001E40' },
  { id: 'organizations', emoji: '🏥', title: 'Organizations 🏥', color: '#C53030' },
  { id: 'community',   emoji: '💬', title: 'Community',        color: '#0a5c73' },
  { id: 'health-shop', emoji: '🛒', title: 'Health Shop',      color: '#1a6b8a' },
]

export default function DiscoverSection() {
  const [selected, setSelected] = useState<Choice>('services')

  const activeColor = CHOICES.find(c => c.id === selected)?.color ?? '#0C6780'

  return (
    <div className="bg-white">
      {/* Question + tab strip */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5">
          {/* Heading */}
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-xl font-black text-white flex-shrink-0"
              style={{ backgroundColor: activeColor }}
            >
              ?
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-[#001E40]">
              What are you looking for today?
            </h2>
          </div>
        </div>

        {/* Tab buttons */}
        <div className="flex gap-2 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden">
          {CHOICES.map(c => {
            const active = selected === c.id
            return (
              <button
                key={c.id}
                onClick={() => setSelected(c.id)}
                className={`flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold
                  transition-all duration-200 border-2 focus:outline-none
                  ${active
                    ? 'text-white shadow-md scale-[1.02]'
                    : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300 hover:text-gray-700'
                  }`}
                style={active ? { backgroundColor: c.color, borderColor: c.color } : {}}
              >
                <span className="text-base leading-none">{c.emoji}</span>
                {c.title}
              </button>
            )
          })}
        </div>
      </div>

      {/* Divider */}
      <div className="h-px bg-gray-100 mx-4 sm:mx-6 lg:mx-8" />

      {/* Dynamically loaded section */}
      <div key={selected}>
        {selected === 'services'    && <ServicesSection />}
        {selected === 'providers'   && <ProvidersSection />}
        {selected === 'organizations' && <OrganizationsSection />}
        {selected === 'community'   && <CommunityPosts />}
        {selected === 'health-shop' && <HealthShopMarketplace />}
      </div>
    </div>
  )
}
