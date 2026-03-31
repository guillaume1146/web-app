'use client'

import { ReactNode, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import MobileSwipeWrapper from './MobileSwipeWrapper'

interface LandingPageContentProps {
 sections: ReactNode[]
 labels: string[]
}

// All roles use clean URLs — middleware rewrites to the correct folder
const USER_TYPE_FEEDS: Record<string, string> = {
 PATIENT: '/feed',
 DOCTOR: '/feed',
 NURSE: '/feed',
 NANNY: '/feed',
 PHARMACIST: '/feed',
 LAB_TECHNICIAN: '/feed',
 EMERGENCY_WORKER: '/feed',
 INSURANCE_REP: '/insurance/feed',
 CORPORATE_ADMIN: '/corporate/feed',
 REFERRAL_PARTNER: '/referral-partner/feed',
 REGIONAL_ADMIN: '/regional/feed',
 CAREGIVER: '/feed',
 PHYSIOTHERAPIST: '/feed',
 DENTIST: '/feed',
 OPTOMETRIST: '/feed',
 NUTRITIONIST: '/feed',
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
 const feed = USER_TYPE_FEEDS[user.userType] || '/feed'
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
