'use client'

import { ReactNode, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

const DEDICATED_FEEDS: Record<string, string> = {
  insurance:          '/insurance/feed',
  corporate:          '/corporate/feed',
  'referral-partner': '/referral-partner/feed',
  'regional-admin':   '/regional/feed',
  admin:              '/admin/feed',
}

const PROVIDER_SLUGS: Record<string, string> = {
  patient: 'patients', doctor: 'doctors', nurse: 'nurses',
  'child-care-nurse': 'childcare', pharmacy: 'pharmacists',
  lab: 'lab-technicians', ambulance: 'emergency',
  caregiver: 'caregivers', physiotherapist: 'physiotherapists',
  dentist: 'dentists', optometrist: 'optometrists', nutritionist: 'nutritionists',
}

export default function LandingAuthWrapper({ children }: { children: ReactNode }) {
  const router = useRouter()
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    try {
      const stored = localStorage.getItem('mediwyz_user')
      if (stored) {
        const user = JSON.parse(stored)
        if (user?.id) {
          const dest =
            DEDICATED_FEEDS[user.userType] ??
            `/provider/${PROVIDER_SLUGS[user.userType] ?? 'patients'}/feed`
          router.replace(dest)
          return
        }
      }
    } catch {
      // no stored user — show landing
    }
    setChecked(true)
  }, [router])

  if (!checked) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0C6780]" />
      </div>
    )
  }

  return <>{children}</>
}
