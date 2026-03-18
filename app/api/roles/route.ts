import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { rateLimitPublic } from '@/lib/rate-limit'

// Labels and icons for UI display — the only non-DB config
const ROLE_META: Record<string, { label: string; searchPath: string; icon: string; color: string }> = {
  DOCTOR: { label: 'Doctors', searchPath: '/search/doctors', icon: 'FaUserMd', color: 'blue' },
  NURSE: { label: 'Nurses', searchPath: '/search/nurses', icon: 'FaUserNurse', color: 'purple' },
  NANNY: { label: 'Childcare', searchPath: '/search/childcare', icon: 'FaBaby', color: 'pink' },
  CAREGIVER: { label: 'Caregivers', searchPath: '/search/caregivers', icon: 'FaHandHoldingHeart', color: 'teal' },
  PHYSIOTHERAPIST: { label: 'Physiotherapy', searchPath: '/search/physiotherapists', icon: 'FaWalking', color: 'lime' },
  DENTIST: { label: 'Dentists', searchPath: '/search/dentists', icon: 'FaTooth', color: 'sky' },
  OPTOMETRIST: { label: 'Eye Care', searchPath: '/search/optometrists', icon: 'FaEye', color: 'violet' },
  NUTRITIONIST: { label: 'Nutrition', searchPath: '/search/nutritionists', icon: 'FaAppleAlt', color: 'yellow' },
  PHARMACIST: { label: 'Pharmacy', searchPath: '/search/medicines', icon: 'FaPills', color: 'orange' },
  LAB_TECHNICIAN: { label: 'Lab Testing', searchPath: '/search/lab', icon: 'FaFlask', color: 'cyan' },
  EMERGENCY_WORKER: { label: 'Emergency', searchPath: '/search/emergency', icon: 'FaAmbulance', color: 'red' },
}

/**
 * GET /api/roles
 * Returns all provider roles with specialties, labels, and search paths.
 * Fully DB-driven — roles come from ProviderSpecialty table.
 */
export async function GET(request: NextRequest) {
  const limited = rateLimitPublic(request)
  if (limited) return limited

  try {
    // Get all active specialties from DB
    const specialties = await prisma.providerSpecialty.findMany({
      where: { isActive: true },
      orderBy: [{ providerType: 'asc' }, { name: 'asc' }],
      select: { providerType: true, name: true, description: true },
    })

    // Get all distinct provider types that have at least one user
    const providerCounts = await prisma.user.groupBy({
      by: ['userType'],
      where: {
        userType: { notIn: ['PATIENT', 'REGIONAL_ADMIN', 'CORPORATE_ADMIN', 'REFERRAL_PARTNER', 'INSURANCE_REP'] },
        accountStatus: 'active',
      },
      _count: true,
    })

    // Group specialties by role
    const grouped: Record<string, { name: string; description: string | null }[]> = {}
    for (const s of specialties) {
      if (!grouped[s.providerType]) grouped[s.providerType] = []
      grouped[s.providerType].push({ name: s.name, description: s.description })
    }

    // Build response — only include roles that have specialties defined OR have users
    const allRoles = new Set([
      ...Object.keys(grouped),
      ...providerCounts.map(c => c.userType),
    ])

    const data = Array.from(allRoles).map(role => {
      const meta = ROLE_META[role] || { label: role, searchPath: `/search/${role.toLowerCase()}`, icon: 'FaUser', color: 'gray' }
      const count = providerCounts.find(c => c.userType === role)?._count ?? 0
      return {
        role,
        label: meta.label,
        searchPath: meta.searchPath,
        icon: meta.icon,
        color: meta.color,
        providerCount: count,
        specialties: grouped[role] || [],
      }
    }).sort((a, b) => a.label.localeCompare(b.label))

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('GET /api/roles error:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}
