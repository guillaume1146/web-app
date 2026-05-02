'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { useUser } from '@/hooks/useUser'
import Navbar from './Navbar'

const DASHBOARD_PREFIXES = [
  // Role-prefix routes
  '/patient/', '/doctor/', '/nurse/', '/nanny/', '/pharmacist/',
  '/lab-technician/', '/responder/', '/insurance/', '/corporate/',
  '/referral-partner/', '/admin/', '/regional/',
  '/caregiver/', '/physiotherapist/', '/dentist/', '/optometrist/', '/nutritionist/',
  // Dynamic provider route
  '/provider/',
  // Clean URL dashboard routes
  '/practice', '/inventory', '/services', '/workflows',
  '/billing', '/video', '/messages', '/ai-assistant', '/my-health',
  '/profile', '/network', '/booking-requests', '/bookings/',
  '/my-consultations', '/my-nurse-services', '/my-childcare',
  '/my-emergency', '/my-health-records', '/my-lab-results',
  '/my-insurance', '/my-prescriptions', '/roles', '/administration',
  '/pharmacy', '/book', '/my-company',
  // Auth pages — have their own minimal layout
  '/login', '/signup', '/reset-password', '/verify',
]

function isDashboardPath(pathname: string) {
  return DASHBOARD_PREFIXES.some(p => pathname.startsWith(p))
    || DASHBOARD_PREFIXES.some(p => pathname === p.replace(/\/$/, ''))
}

export default function ConditionalNavbar() {
  const pathname = usePathname() || ''
  const { user } = useUser()
  // Tracks whether the client has checked the auth cookie after mount.
  // null  = not yet checked (SSR + first paint)
  // true  = authenticated (cookie present)
  // false = definitely not authenticated
  const [authCookie, setAuthCookie] = useState<boolean | null>(null)

  useEffect(() => {
    setAuthCookie(document.cookie.includes('mediwyz_userType='))
  }, [pathname]) // re-check on every navigation (handles login/logout transitions)

  // Always suppress on dashboard / auth paths — works during SSR and client
  if (isDashboardPath(pathname)) return null

  // If cookie check hasn't run yet (SSR or first paint), or cookie confirms auth → hide
  if (authCookie !== false) return null

  // User loaded from localStorage also confirms auth
  if (user) return null

  return <Navbar />
}
