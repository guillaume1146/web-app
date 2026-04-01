'use client'

import { usePathname } from 'next/navigation'
import { useUser } from '@/hooks/useUser'
import Navbar from './Navbar'

const DASHBOARD_PREFIXES = [
 // Legacy role-prefix routes
 '/patient/', '/doctor/', '/nurse/', '/nanny/', '/pharmacist/',
 '/lab-technician/', '/responder/', '/insurance/', '/corporate/',
 '/referral-partner/', '/admin/', '/regional/',
 '/caregiver/', '/physiotherapist/', '/dentist/', '/optometrist/', '/nutritionist/',
 // Dynamic provider route
 '/provider/',
 // Clean URL dashboard routes (no role prefix)
 '/feed', '/practice', '/inventory', '/services', '/workflows',
 '/billing', '/video', '/messages', '/ai-assistant', '/my-health',
 '/profile', '/network', '/booking-requests', '/bookings/',
 '/my-consultations', '/my-nurse-services', '/my-childcare',
 '/my-emergency', '/my-health-records', '/my-lab-results',
 '/my-insurance', '/my-prescriptions', '/roles', '/administration',
 '/pharmacy', '/book', '/my-company',
]

export default function ConditionalNavbar() {
 const pathname = usePathname()
 const { user } = useUser()
 const isDashboard = DASHBOARD_PREFIXES.some((p) => pathname.startsWith(p))
 || DASHBOARD_PREFIXES.some((p) => pathname === p.slice(0, -1))

 // Hide public navbar on search pages when user is logged in (dashboard sidebar takes over)
 const isSearchWithDashboard = pathname.startsWith('/search') && !!user

 if (isDashboard || isSearchWithDashboard) return null
 return <Navbar />
}
