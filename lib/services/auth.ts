/**
 * Client-side authentication service.
 * JWT tokens live in httpOnly cookies (set by the API).
 * This module manages the lightweight localStorage mirror for UI display.
 */

export interface AuthUser {
  id: string
  firstName: string
  lastName: string
  email: string
  userType: string
  profileImage?: string
}

const STORAGE_KEY = 'mediwyz_user'

const USER_TYPE_PATHS: Record<string, string> = {
  patient: '/patient/dashboard',
  doctor: '/doctor/dashboard',
  nurse: '/nurse/dashboard',
  'child-care-nurse': '/nanny/dashboard',
  pharmacy: '/pharmacist/dashboard',
  lab: '/lab-technician/dashboard',
  ambulance: '/responder/dashboard',
  admin: '/admin/dashboard',
  corporate: '/corporate/dashboard',
  insurance: '/insurance/dashboard',
  'referral-partner': '/referral-partner/dashboard',
  'regional-admin': '/regional/dashboard',
  caregiver: '/caregiver/dashboard',
  physiotherapist: '/physiotherapist/dashboard',
  dentist: '/dentist/dashboard',
  optometrist: '/optometrist/dashboard',
  nutritionist: '/nutritionist/dashboard',
}

export class AuthService {
  static saveToLocalStorage(user: AuthUser): void {
    if (typeof window === 'undefined') return
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user))
  }

  static getFromLocalStorage(): AuthUser | null {
    if (typeof window === 'undefined') return null
    try {
      const data = localStorage.getItem(STORAGE_KEY)
      return data ? (JSON.parse(data) as AuthUser) : null
    } catch {
      return null
    }
  }

  static clearLocalStorage(): void {
    if (typeof window === 'undefined') return
    localStorage.removeItem(STORAGE_KEY)
  }

  static getUserTypeRedirectPath(userType: string): string {
    return USER_TYPE_PATHS[userType] || '/login'
  }

  static async logout(): Promise<void> {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
    } catch {
      // Best-effort server-side cookie clear
    }
    AuthService.clearLocalStorage()
  }

  static async login(email: string, password: string): Promise<{
    success: boolean
    user?: AuthUser
    redirectPath?: string
    message?: string
  }> {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    const data = await res.json()

    if (!res.ok || !data.success) {
      return { success: false, message: data.message || 'Invalid credentials' }
    }

    AuthService.saveToLocalStorage(data.user)
    return { success: true, user: data.user, redirectPath: data.redirectPath }
  }
}
