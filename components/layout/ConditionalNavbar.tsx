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
 // NOTE: '/feed' intentionally omitted — public page, guests need the marketing navbar
 '/practice', '/inventory', '/services', '/workflows',
 '/billing', '/video', '/messages', '/ai-assistant', '/my-health',
 '/profile', '/network', '/booking-requests', '/bookings/',
 '/my-consultations', '/my-nurse-services', '/my-childcare',
 '/my-emergency', '/my-health-records', '/my-lab-results',
 '/my-insurance', '/my-prescriptions', '/roles', '/administration',
 '/pharmacy', '/book', '/my-company',
]

export default function ConditionalNavbar() {
 const pathname = usePathname() || ''
 const { user } = useUser()

 // 1. Fast synchronous check — mediwyz_userType is a non-httpOnly cookie
 //    set on login, readable without waiting for localStorage. Prevents
 //    the public Navbar flashing for one render cycle before useUser
 //    finishes reading from localStorage (double-header flash).
 if (typeof document !== 'undefined' && document.cookie.includes('mediwyz_userType=')) return null

 // 2. Any authenticated user is always inside the dashboard — show the
 //    role-specific header from `DashboardLayout`, never the marketing
 //    Navbar.
 if (user) return null

 // 3. For anonymous visitors, hide on known dashboard-ish paths (login,
 //    signup do NOT want the marketing nav either).
 const isDashboard = DASHBOARD_PREFIXES.some((p) => pathname.startsWith(p))
 || DASHBOARD_PREFIXES.some((p) => pathname === p.slice(0, -1))

 if (isDashboard) return null
 return <Navbar />
}
