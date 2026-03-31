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
    '/patient': ['patient'],
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

  // Unified dashboard routes (no role prefix) — just require valid JWT
  const unifiedPaths = ['/feed', '/practice', '/inventory', '/services', '/workflows',
    '/billing', '/video', '/messages', '/ai-assistant', '/my-health', '/profile',
    '/network', '/settings', '/bookings', '/administration',
    '/regional-services', '/regional-workflows', '/roles', '/management']
  const isUnifiedRoute = unifiedPaths.some(p => pathname === p || pathname.startsWith(p + '/'))

  if (isUnifiedRoute) {
    const token = request.cookies.get('mediwyz_token')
    if (!token) return NextResponse.redirect(new URL('/login', request.url))
    const payload = await verifyJWT(token.value)
    if (!payload) {
      const response = NextResponse.redirect(new URL('/login', request.url))
      response.cookies.delete('mediwyz_token')
      response.cookies.delete('mediwyz_userType')
      return response
    }
    return NextResponse.next()
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
  const redirectPaths: Record<string, string> = {
    'patient': '/patient/feed',
    'doctor': '/doctor/feed',
    'nurse': '/nurse/feed',
    'child-care-nurse': '/nanny/feed',
    'pharmacy': '/pharmacist/feed',
    'lab': '/lab-technician/feed',
    'ambulance': '/responder/feed',
    'admin': '/admin/feed',
    'regional-admin': '/regional/feed',
    'corporate': '/corporate/feed',
    'insurance': '/insurance/feed',
    'referral-partner': '/referral-partner/feed',
    'caregiver': '/caregiver/feed',
    'physiotherapist': '/physiotherapist/feed',
    'dentist': '/dentist/feed',
    'optometrist': '/optometrist/feed',
    'nutritionist': '/nutritionist/feed',
  }
  return redirectPaths[userType] || '/patient/feed'
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
  ]
}
