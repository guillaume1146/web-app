'use client'

import dynamic from 'next/dynamic'
import { use } from 'react'

const searchPages: Record<string, React.ComponentType> = {
  doctors: dynamic(() => import('@/app/search/doctors/page'), { ssr: false }),
  nurses: dynamic(() => import('@/app/search/nurses/page'), { ssr: false }),
  childcare: dynamic(() => import('@/app/search/childcare/page'), { ssr: false }),
  lab: dynamic(() => import('@/app/search/lab/page'), { ssr: false }),
  emergency: dynamic(() => import('@/app/search/emergency/page'), { ssr: false }),
  medicines: dynamic(() => import('@/app/search/medicines/page'), { ssr: false }),
  insurance: dynamic(() => import('@/app/search/insurance/page'), { ssr: false }),
  caregivers: dynamic(() => import('@/app/search/caregivers/page'), { ssr: false }),
  physiotherapists: dynamic(() => import('@/app/search/physiotherapists/page'), { ssr: false }),
  dentists: dynamic(() => import('@/app/search/dentists/page'), { ssr: false }),
  optometrists: dynamic(() => import('@/app/search/optometrists/page'), { ssr: false }),
  nutritionists: dynamic(() => import('@/app/search/nutritionists/page'), { ssr: false }),
}

export default function DashboardSearchPage({ params }: { params: Promise<{ type: string }> }) {
  const { type } = use(params)
  const SearchComponent = searchPages[type]

  if (!SearchComponent) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Search type not found.</p>
      </div>
    )
  }

  return <SearchComponent />
}
