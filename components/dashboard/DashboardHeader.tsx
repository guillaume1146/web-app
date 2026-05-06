'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import {
 FaBars,
 FaTimes,
 FaUser,
 FaSignOutAlt,
 FaUserFriends,
 FaHome,
} from 'react-icons/fa'
import HealthwyzLogo from '@/components/ui/HealthwyzLogo'
import LanguageSwitcher from '@/components/shared/LanguageSwitcher'
import { useTranslation } from '@/lib/i18n'
import { useCapacitor } from '@/hooks/useCapacitor'

const NotificationBell = dynamic(() => import('@/components/shared/NotificationBell'), { ssr: false })

interface NotificationItem {
 id: string
 type: string
 title: string
 message: string
 createdAt: string
 readAt: string | null
 referenceId?: string | null
 referenceType?: string | null
}

interface DashboardHeaderProps {
 userName: string
 userImage?: string | null
 userSubtitle: string
 notificationCount: number
 profileHref: string
 networkHref?: string
 sidebarOpen: boolean
 onToggleSidebar: () => void
 onLogout: () => void
 userId?: string
}

function timeAgo(dateStr: string): string {
 const diff = Date.now() - new Date(dateStr).getTime()
 const minutes = Math.floor(diff / 60000)
 if (minutes < 1) return 'Just now'
 if (minutes < 60) return `${minutes}m ago`
 const hours = Math.floor(minutes / 60)
 if (hours < 24) return `${hours}h ago`
 const days = Math.floor(hours / 24)
 return `${days}d ago`
}

// Per-user-type route mapping for notification clicks
// All provider roles use these clean URL paths (mapped within their dashboard)
const DEFAULT_ROUTES: Record<string, string> = {
 appointment: '/practice', booking: '/practice', prescription: '/practice',
 message: '/messages', connection: '/network', lab_result: '/practice',
 emergency: '/practice', corporate_enrollment: '/my-company',
 review_request: '/reviews', workflow: '/practice',
}

// Role-specific overrides for patient (uses my-* paths)
const PATIENT_ROUTES: Record<string, string> = {
 appointment: '/my-consultations', booking: '/bookings',
 prescription: '/my-prescriptions', message: '/messages',
 lab_result: '/my-lab-results', emergency: '/my-emergency',
 connection: '/network', corporate_enrollment: '/my-company',
}

const NOTIFICATION_ROUTES: Record<string, Record<string, string>> = {
 patient: PATIENT_ROUTES,
 insurance: { ...DEFAULT_ROUTES, booking: '/claims' },
 corporate: DEFAULT_ROUTES,
 'referral-partner': DEFAULT_ROUTES,
 regional: DEFAULT_ROUTES,
}

// Normalize notification type/referenceType to a canonical key
function normalizeNotifKey(raw: string): string {
 switch (raw) {
 case 'appointment':
 case 'doctor_booking':
 case 'nurse_booking':
 case 'nanny_booking':
 return 'appointment'
 case 'lab_test_booking':
 case 'lab-test':
 case 'lab_result':
 return 'lab_result'
 case 'emergency_booking':
 case 'emergency':
 return 'emergency'
 case 'prescription':
 return 'prescription'
 case 'message':
 return 'message'
 case 'connection':
 return 'connection'
 case 'booking':
 case 'booking_request':
 case 'booking_cancelled':
 return 'booking'
 default:
 return raw
 }
}

function getNotificationHref(n: NotificationItem, profileHref: string): string | null {
 const base = profileHref.replace(/\/profile$/, '')
 const userSlug = base.split('/')[1] || 'patient'
 const routes = NOTIFICATION_ROUTES[userSlug] || DEFAULT_ROUTES

 // Workflow notifications deep-link to the booking detail page with timeline
 if (n.type === 'workflow' && n.referenceId && n.referenceType) {
 return `${base}/bookings/${n.referenceType}/${n.referenceId}`
 }

 // Review request notifications also deep-link
 if (n.type === 'review_request' && n.referenceId && n.referenceType) {
 return `${base}/bookings/${n.referenceType}/${n.referenceId}`
 }

 // For booking requests/cancellations, use type (the action) over referenceType (the entity)
 // e.g. type='booking_request' + referenceType='appointment' → should route to requests tab
 const actionTypes = ['booking_request', 'booking_cancelled']
 const rawKey = (n.type && actionTypes.includes(n.type)) ? n.type : (n.referenceType || n.type || '')
 if (rawKey) {
 const canonical = normalizeNotifKey(rawKey)
 if (routes[canonical]) return `${base}${routes[canonical]}`
 }

 // Fallback: match on title keywords
 const title = n.title.toLowerCase()
 if (title.includes('appointment') || title.includes('consultation'))
 return routes.appointment ? `${base}${routes.appointment}` : null
 if (title.includes('booking'))
 return routes.booking ? `${base}${routes.booking}` : null
 if (title.includes('prescription') || title.includes('refill') || title.includes('medication') || title.includes('pickup'))
 return routes.prescription ? `${base}${routes.prescription}` : null
 if (title.includes('lab') || title.includes('result') || title.includes('test'))
 return routes.lab_result ? `${base}${routes.lab_result}` : null
 if (title.includes('message') || title.includes('chat'))
 return routes.message ? `${base}${routes.message}` : null
 if (title.includes('connection') || title.includes('network'))
 return routes.connection ? `${base}${routes.connection}` : null
 if (title.includes('emergency'))
 return routes.emergency ? `${base}${routes.emergency}` : null

 return null
}

const DashboardHeader: React.FC<DashboardHeaderProps> = ({
 userName,
 userImage,
 userSubtitle,
 notificationCount: _notificationCount,
 profileHref,
 networkHref,
 sidebarOpen,
 onToggleSidebar,
 onLogout,
 userId,
}) => {
 const { t } = useTranslation()
 const [planLabel, setPlanLabel] = useState<string | null>(null)
 const [pendingConnectionCount, setPendingConnectionCount] = useState(0)

 // Fetch user's subscription plan label
 useEffect(() => {
 if (!userId) return
 fetch(`/api/users/${userId}/subscription`, { credentials: 'include' })
 .then(r => r.json())
 .then(json => {
 if (json.success && json.data?.hasSubscription && json.data.plan) {
 const plan = json.data.plan
 const category = plan.type === 'corporate' ? 'Business' : 'For You'
 setPlanLabel(`${category} · ${plan.name}`)
 }
 })
 .catch(() => {})
 }, [userId])

 // Fetch pending connection request count
 useEffect(() => {
 if (!userId || !networkHref) return
 const fetchPendingConnections = async () => {
 try {
 const res = await fetch(`/api/connections?userId=${userId}&type=received&status=pending`, { credentials: 'include' })
 const data = await res.json()
 if (data.success && Array.isArray(data.data)) {
 setPendingConnectionCount(data.data.length)
 }
 } catch {
 // silent
 }
 }
 fetchPendingConnections()
 const interval = setInterval(fetchPendingConnections, 30000)
 return () => clearInterval(interval)
 }, [userId, networkHref])

 const isCapacitor = useCapacitor()

 return (
 <header role="banner" className="sticky top-0 z-50 flex-shrink-0">
 {/* Spacer for Android status bar in Capacitor WebView */}
 {isCapacitor && (
 <div className="bg-white h-14" />
 )}
 <div className="h-0.5 bg-brand-teal " />
 <div className="bg-white/95 backdrop-blur-md shadow-sm border-b border-gray-100">
 <div className="px-2 sm:px-4 md:px-6 lg:px-8 py-2 sm:py-3 md:py-2.5">
 <div className="flex items-center justify-between gap-1">
 {/* Left: mobile toggle + logo + user info */}
 <div className="flex items-center gap-2 sm:gap-3 md:gap-4">
 <button
 onClick={onToggleSidebar}
 className="md:hidden p-2.5 sm:p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal"
 aria-label={sidebarOpen ? 'Close menu' : 'Open menu'}
 aria-expanded={sidebarOpen}
 >
 {sidebarOpen ? (
 <FaTimes className="text-lg sm:text-lg" aria-hidden="true" />
 ) : (
 <FaBars className="text-lg sm:text-lg" aria-hidden="true" />
 )}
 </button>

 {/* Logo */}
 <Link href="/" className="flex-shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal rounded-md">
 <HealthwyzLogo width={220} height={64} />
 </Link>

 <div className="hidden sm:flex items-center gap-2 sm:gap-3 ml-2 sm:ml-4 pl-2 sm:pl-4 border-l border-gray-200">
 <div>
 <h1 className="text-sm sm:text-base md:text-lg font-bold text-gray-900 truncate max-w-[150px] sm:max-w-[200px] md:max-w-none">
 {userName}
 </h1>
 <div className="flex items-center gap-1.5">
 <p className="text-[10px] sm:text-xs text-gray-500">
 {userSubtitle}
 </p>
 {planLabel && (
 <span className="text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded-full text-amber-700 font-medium whitespace-nowrap border border-amber-200">
 {planLabel}
 </span>
 )}
 </div>
 </div>
 </div>
 </div>

 {/* Right: profile, notifications, logout */}
 <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 lg:gap-4 flex-shrink min-w-0">
 {/* Profile avatar link */}
 <Link
 href={profileHref}
 className="flex-shrink-0"
 aria-label="My Profile"
 >
 {userImage ? (
 <img
 src={userImage}
 alt={userName}
 className="w-8 h-8 sm:w-9 sm:h-9 rounded-full object-cover border-2 border-brand-teal/30 hover:border-brand-teal transition-colors"
 />
 ) : (
 <div className="w-8 h-8 sm:w-9 sm:h-9 bg-brand-navy rounded-full flex items-center justify-center text-white text-xs sm:text-sm font-bold border-2 border-brand-teal/30 hover:border-brand-teal transition-colors">
 {userName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
 </div>
 )}
 </Link>

 {/* Network / Connections — hidden on very small mobile */}
 {networkHref && (
 <Link
 href={networkHref}
 className="hidden sm:flex relative p-2.5 md:p-3 text-gray-600 hover:text-brand-teal bg-gray-100 rounded-lg hover:bg-sky-100 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal"
 aria-label={`My Network${pendingConnectionCount > 0 ? `, ${pendingConnectionCount} pending requests` : ''}`}
 >
 <FaUserFriends className="text-base sm:text-base md:text-lg" aria-hidden="true" />
 {pendingConnectionCount > 0 && (
 <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 flex items-center justify-center font-bold" aria-hidden="true">
 {pendingConnectionCount > 9 ? '9+' : pendingConnectionCount}
 </span>
 )}
 </Link>
 )}

 {/* Notification bell + dropdown (real-time, socket-powered) */}
 {userId && (
 <NotificationBell userId={userId} profileHref={profileHref} />
 )}

 {/* Language switcher — hidden on small mobile to save space */}
 <div className="hidden sm:block">
 <LanguageSwitcher variant="header" />
 </div>

 {/* Home button — always visible, returns to landing page */}
 <Link
   href="/"
   className="p-2 sm:px-3 sm:py-2 rounded-lg bg-gray-100 hover:bg-sky-100 text-gray-600 hover:text-brand-teal flex items-center gap-1.5 transition flex-shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal"
   aria-label="Return to home page"
 >
   <FaHome className="text-sm" aria-hidden="true" />
   <span className="hidden sm:inline text-xs font-medium">Home</span>
 </Link>

 {/* Logout button */}
 <button
 onClick={onLogout}
 className="bg-red-500 hover:bg-red-600 text-white p-2 sm:px-3 sm:py-2 rounded-lg flex items-center gap-1.5 transition flex-shrink-0"
 aria-label="Log out"
 >
 <FaSignOutAlt className="text-sm" aria-hidden="true" />
 <span className="hidden sm:inline text-xs">
 {t('common.logout')}
 </span>
 </button>
 </div>
 </div>
 </div>
 </div>
 </header>
 )
}

export default DashboardHeader
