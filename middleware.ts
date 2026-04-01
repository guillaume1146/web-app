import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Verify a JWT token using Web Crypto API (Edge-compatible).
 * Returns decoded payload if valid and not expired, null otherwise.
 */
async function verifyJWT(token: string): Promise<{ sub: string; userType: string; email: string } | null> {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null

    const secret = process.env.JWT_SECRET || 'mediwyz-dev-secret-change-in-production'
    const encoder = new TextEncoder()

    // Import HMAC key for verification
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    )

    // Decode base64url signature
    const signatureB64 = parts[2].replace(/-/g, '+').replace(/_/g, '/')
    const paddedSig = signatureB64 + '='.repeat((4 - signatureB64.length % 4) % 4)
    const signatureBytes = Uint8Array.from(atob(paddedSig), c => c.charCodeAt(0))

    // Verify HMAC signature
    const data = encoder.encode(`${parts[0]}.${parts[1]}`)
    const valid = await crypto.subtle.verify('HMAC', key, signatureBytes, data)
    if (!valid) return null

    // Decode payload
    const payloadB64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const paddedPayload = payloadB64 + '='.repeat((4 - payloadB64.length % 4) % 4)
    const payload = JSON.parse(atob(paddedPayload))

    // Check expiration
    if (payload.exp && payload.exp * 1000 < Date.now()) return null

    if (!payload.sub || !payload.userType) return null

    return { sub: payload.sub, userType: payload.userType, email: payload.email }
  } catch {
    return null
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  if (
    pathname.startsWith('/login') ||
    pathname.startsWith('/signup') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.')
  ) {
    return NextResponse.next()
  }

  const protectedRoutes: Record<string, string[]> = {
    '/doctor': ['doctor'],
    '/nurse': ['nurse'],
    '/nanny': ['child-care-nurse'],
    '/pharmacist': ['pharmacy'],
    '/lab-technician': ['lab'],
    '/responder': ['ambulance'],
    '/admin': ['admin'],
    '/regional': ['regional-admin'],
    '/corporate': ['corporate'],
    '/insurance': ['insurance'],
    '/referral-partner': ['referral-partner'],
    '/caregiver': ['caregiver'],
    '/physiotherapist': ['physiotherapist'],
    '/dentist': ['dentist'],
    '/optometrist': ['optometrist'],
    '/nutritionist': ['nutritionist'],
  }

  // Clean URLs (no role prefix): /feed → /provider/{slug}/feed via rewrite
  const dashboardPages = ['/feed', '/practice', '/inventory', '/services', '/workflows',
    '/billing', '/video', '/messages', '/ai-assistant', '/my-health', '/profile',
    '/network', '/booking-requests', '/bookings', '/my-consultations', '/my-nurse-services',
    '/my-childcare', '/my-emergency', '/my-health-records', '/my-lab-results',
    '/my-insurance', '/my-prescriptions', '/posts', '/reviews',
    '/pharmacy', '/book', '/my-company']
  const isCleanDashboardRoute = dashboardPages.some(p => pathname === p || pathname.startsWith(p + '/'))

  if (isCleanDashboardRoute) {
    const token = request.cookies.get('mediwyz_token')
    if (!token) return NextResponse.redirect(new URL('/login', request.url))
    const payload = await verifyJWT(token.value)
    if (!payload) {
      const response = NextResponse.redirect(new URL('/login', request.url))
      response.cookies.delete('mediwyz_token')
      response.cookies.delete('mediwyz_userType')
      return response
    }

    // Rewrite clean URLs to existing routes
    const cookieVal = request.cookies.get('mediwyz_userType')?.value || 'patient'

    // Non-provider roles keep their dedicated folders (they have unique pages)
    const DEDICATED_ROUTES: Record<string, string> = {
      'regional-admin': '/regional',
      corporate: '/corporate',
      insurance: '/insurance',
      'referral-partner': '/referral-partner',
      admin: '/admin',
    }

    // All provider roles (including patient) use the dynamic /provider/[slug] route
    const PROVIDER_SLUGS: Record<string, string> = {
      patient: 'patients',
      doctor: 'doctors', nurse: 'nurses', 'child-care-nurse': 'childcare',
      pharmacy: 'pharmacists', lab: 'lab-technicians', ambulance: 'emergency',
      caregiver: 'caregivers', physiotherapist: 'physiotherapists',
      dentist: 'dentists', optometrist: 'optometrists',
      nutritionist: 'nutritionists',
    }

    const dedicatedPrefix = DEDICATED_ROUTES[cookieVal]
    if (dedicatedPrefix) {
      return NextResponse.rewrite(new URL(`${dedicatedPrefix}${pathname}`, request.url))
    }

    const providerSlug = PROVIDER_SLUGS[cookieVal] || cookieVal
    return NextResponse.rewrite(new URL(`/provider/${providerSlug}${pathname}`, request.url))
  }

  // Backward compat: /patient/feed → /feed (patient now uses clean URLs via provider route)
  if (pathname.startsWith('/patient/')) {
    const subpath = pathname.replace('/patient', '')
    // Remap old patient paths to clean URLs
    const remap: Record<string, string> = { '/chat': '/messages', '/health': '/my-health' }
    const cleanPath = remap[subpath] || subpath || '/feed'
    return NextResponse.redirect(new URL(cleanPath, request.url))
  }

  // Dynamic /provider/[slug] routes — just require valid JWT (page validates role)
  if (pathname.startsWith('/provider/')) {
    const token = request.cookies.get('mediwyz_token')
    if (!token) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    const payload = await verifyJWT(token.value)
    if (!payload) {
      const response = NextResponse.redirect(new URL('/login', request.url))
      response.cookies.delete('mediwyz_token')
      response.cookies.delete('mediwyz_userType')
      return response
    }
    return NextResponse.next()
  }

  const protectedRoute = Object.keys(protectedRoutes).find(route =>
    pathname.startsWith(route)
  )

  if (protectedRoute) {
    const token = request.cookies.get('mediwyz_token')
    const userType = request.cookies.get('mediwyz_userType')

    if (!token || !userType) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    // Validate JWT signature and expiration
    const payload = await verifyJWT(token.value)
    if (!payload) {
      // Token is invalid or expired — clear cookies and redirect to login
      const response = NextResponse.redirect(new URL('/login', request.url))
      response.cookies.delete('mediwyz_token')
      response.cookies.delete('mediwyz_userType')
      return response
    }

    const allowedTypes = protectedRoutes[protectedRoute]
    if (!allowedTypes.includes(userType.value)) {
      const correctPath = getUserTypeRedirectPath(userType.value)
      return NextResponse.redirect(new URL(correctPath, request.url))
    }
  }

  return NextResponse.next()
}

function getUserTypeRedirectPath(userType: string): string {
  // Non-provider roles use their dedicated folder paths
  const dedicatedPaths: Record<string, string> = {
    'admin': '/admin/feed',
    'regional-admin': '/regional/feed',
    'corporate': '/corporate/feed',
    'insurance': '/insurance/feed',
    'referral-partner': '/referral-partner/feed',
  }
  // Provider roles use clean URLs — middleware rewrites /feed → /provider/[slug]/feed
  return dedicatedPaths[userType] || '/feed'
}

export const config = {
  matcher: [
    '/patient/:path*',
    '/doctor/:path*',
    '/nurse/:path*',
    '/nanny/:path*',
    '/pharmacist/:path*',
    '/lab-technician/:path*',
    '/responder/:path*',
    '/admin/:path*',
    '/corporate/:path*',
    '/insurance/:path*',
    '/referral-partner/:path*',
    '/regional/:path*',
    '/caregiver/:path*',
    '/physiotherapist/:path*',
    '/dentist/:path*',
    '/optometrist/:path*',
    '/nutritionist/:path*',
    '/provider/:path*',
    '/feed',
    '/practice/:path*',
    '/inventory/:path*',
    '/services/:path*',
    '/workflows/:path*',
    '/billing/:path*',
    '/video/:path*',
    '/messages/:path*',
    '/ai-assistant/:path*',
    '/my-health/:path*',
    '/profile/:path*',
    '/network/:path*',
    '/settings/:path*',
    '/bookings/:path*',
    '/administration/:path*',
    '/regional-services/:path*',
    '/regional-workflows/:path*',
    '/roles/:path*',
    '/management/:path*',
    '/pharmacy/:path*',
    '/book/:path*',
    '/my-company/:path*',
  ]
}
