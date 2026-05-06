'use client'

import dynamic from 'next/dynamic'

// Dynamic import with ssr:false must live inside a Client Component
const NearMeSection = dynamic(() => import('./NearMeSection'), {
  ssr: false,
  loading: () => (
    <div className="bg-[#001E40] flex items-center justify-center" style={{ minHeight: 420 }}>
      <div className="text-center">
        <div className="w-10 h-10 border-2 border-brand-sky border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-white/50 text-sm">Loading map…</p>
      </div>
    </div>
  ),
})

export default NearMeSection
