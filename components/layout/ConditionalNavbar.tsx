'use client'

import { usePathname } from 'next/navigation'
import { useUser } from '@/hooks/useUser'
import Navbar from './Navbar'

const DASHBOARD_PREFIXES = [
 '/patient/', '/doctor/', '/nurse/', '/nanny/', '/pharmacist/',
 '/lab-technician/', '/responder/', '/insurance/', '/corporate/',
 '/referral-partner/', '/admin/', '/regional/',
 '/caregiver/', '/physiotherapist/', '/dentist/', '/optometrist/', '/nutritionist/',
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
