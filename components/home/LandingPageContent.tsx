'use client'

import { ReactNode, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import MobileSwipeWrapper from './MobileSwipeWrapper'

interface LandingPageContentProps {
  sections: ReactNode[]
  labels: string[]
}

const USER_TYPE_FEEDS: Record<string, string> = {
  PATIENT: '/patient/feed',
  DOCTOR: '/doctor/feed',
  NURSE: '/nurse/feed',
  NANNY: '/nanny/feed',
  PHARMACIST: '/pharmacist/feed',
  LAB_TECHNICIAN: '/lab-technician/feed',
  EMERGENCY_WORKER: '/responder/feed',
  INSURANCE_REP: '/insurance/feed',
  CORPORATE_ADMIN: '/corporate/feed',
  REFERRAL_PARTNER: '/referral-partner/feed',
  REGIONAL_ADMIN: '/regional/feed',
  CAREGIVER: '/caregiver/feed',
  PHYSIOTHERAPIST: '/physiotherapist/feed',
  DENTIST: '/dentist/feed',
  OPTOMETRIST: '/optometrist/feed',
  NUTRITIONIST: '/nutritionist/feed',
}

export default function LandingPageContent({ sections, labels }: LandingPageContentProps) {
  const router = useRouter()
  const [checked, setChecked] = useState(false)

  // Auto-redirect returning users (mobile app) — skip landing, go to dashboard
  useEffect(() => {
    try {
      const stored = localStorage.getItem('mediwyz_user')
      if (stored) {
        const user = JSON.parse(stored)
        if (user?.userType) {
          const feed = USER_TYPE_FEEDS[user.userType] || '/patient/feed'
          router.replace(feed)
          return
        }
      }
    } catch {
      // No stored user — show landing
    }
    setChecked(true)
  }, [router])

  // Don't render until we've checked — prevents flash of landing for returning users
  if (!checked) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  return (
    <MobileSwipeWrapper sectionLabels={labels}>
      {sections}
    </MobileSwipeWrapper>
  )
}
