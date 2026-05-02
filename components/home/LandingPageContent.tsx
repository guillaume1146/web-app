'use client'

import { ReactNode, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import MobileSwipeWrapper from './MobileSwipeWrapper'

interface LandingPageContentProps {
 sections: ReactNode[]
 labels: string[]
}

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

export default function LandingPageContent({ sections, labels }: LandingPageContentProps) {
 const router = useRouter()
 const [checked, setChecked] = useState(false)

 // Auto-redirect returning users — skip landing, go directly to their dashboard
 useEffect(() => {
 try {
 const stored = localStorage.getItem('mediwyz_user')
 if (stored) {
 const user = JSON.parse(stored)
 if (user?.id) {
 // Go directly to the right route — no intermediate stops that would flash spinners
 const dest = DEDICATED_FEEDS[user.userType] ??
   `/provider/${PROVIDER_SLUGS[user.userType] ?? 'patients'}/feed`
 router.replace(dest)
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
