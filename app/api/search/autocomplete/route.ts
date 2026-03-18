import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { rateLimitSearch } from '@/lib/rate-limit'

type SearchCategory = 'all' | 'doctors' | 'nurses' | 'nannies' | 'medicines' | 'emergency' | 'pharmacy' | 'lab'

interface AutocompleteResult {
  id: string
  label: string
  sublabel: string
  category: SearchCategory
  href: string
  image?: string | null
}

export async function GET(request: NextRequest) {
  const limited = rateLimitSearch(request)
  if (limited) return limited

  try {
    const { searchParams } = request.nextUrl
    const query = (searchParams.get('q') || '').trim().toLowerCase()
    const category = (searchParams.get('category') || 'all') as SearchCategory
    const limit = Math.min(parseInt(searchParams.get('limit') || '8'), 20)

    if (!query || query.length < 2) {
      return NextResponse.json({ success: true, data: [] })
    }

    const results: AutocompleteResult[] = []

    // Search Doctors
    if (category === 'all' || category === 'doctors') {
      const doctors = await prisma.doctorProfile.findMany({
        where: {
          user: { accountStatus: 'active' },
          OR: [
            { user: { firstName: { contains: query, mode: 'insensitive' } } },
            { user: { lastName: { contains: query, mode: 'insensitive' } } },
            { specialty: { hasSome: [query] } },
            { bio: { contains: query, mode: 'insensitive' } },
            { location: { contains: query, mode: 'insensitive' } },
          ],
        },
        include: {
          user: { select: { id: true, firstName: true, lastName: true, profileImage: true } },
        },
        take: limit,
      })

      for (const doc of doctors) {
        results.push({
          id: doc.user.id,
          label: `Dr. ${doc.user.firstName} ${doc.user.lastName}`,
          sublabel: doc.specialty.join(', ') || 'General Practice',
          category: 'doctors',
          href: `/search/doctors/${doc.user.id}`,
          image: doc.user.profileImage,
        })
      }
    }

    // Search Nurses
    if (category === 'all' || category === 'nurses') {
      const nurses = await prisma.nurseProfile.findMany({
        where: {
          user: { accountStatus: 'active' },
          OR: [
            { user: { firstName: { contains: query, mode: 'insensitive' } } },
            { user: { lastName: { contains: query, mode: 'insensitive' } } },
          ],
        },
        include: {
          user: { select: { id: true, firstName: true, lastName: true, profileImage: true } },
        },
        take: limit,
      })

      for (const nurse of nurses) {
        results.push({
          id: nurse.user.id,
          label: `${nurse.user.firstName} ${nurse.user.lastName}`,
          sublabel: nurse.specializations.join(', ') || `${nurse.experience} yrs experience`,
          category: 'nurses',
          href: `/search/nurses/${nurse.user.id}`,
          image: nurse.user.profileImage,
        })
      }
    }

    // Search Nannies
    if (category === 'all' || category === 'nannies') {
      const nannies = await prisma.nannyProfile.findMany({
        where: {
          user: { accountStatus: 'active' },
          OR: [
            { user: { firstName: { contains: query, mode: 'insensitive' } } },
            { user: { lastName: { contains: query, mode: 'insensitive' } } },
          ],
        },
        include: {
          user: { select: { id: true, firstName: true, lastName: true, profileImage: true } },
        },
        take: limit,
      })

      for (const nanny of nannies) {
        results.push({
          id: nanny.user.id,
          label: `${nanny.user.firstName} ${nanny.user.lastName}`,
          sublabel: nanny.certifications.join(', ') || `${nanny.experience} yrs experience`,
          category: 'nannies',
          href: `/search/childcare/${nanny.user.id}`,
          image: nanny.user.profileImage,
        })
      }
    }

    // Search Medicines
    if (category === 'all' || category === 'medicines') {
      const medicines = await prisma.pharmacyMedicine.findMany({
        where: {
          isActive: true,
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { genericName: { contains: query, mode: 'insensitive' } },
            { category: { contains: query, mode: 'insensitive' } },
          ],
        },
        select: {
          id: true,
          name: true,
          genericName: true,
          category: true,
          price: true,
          currency: true,
          imageUrl: true,
        },
        take: limit,
      })

      for (const med of medicines) {
        results.push({
          id: med.id,
          label: med.name,
          sublabel: `${med.category} — ${med.currency} ${med.price.toFixed(0)}`,
          category: 'medicines',
          href: `/search/medicines?q=${encodeURIComponent(med.name)}`,
          image: med.imageUrl,
        })
      }
    }

    // Search Pharmacies
    if (category === 'all' || category === 'pharmacy') {
      const pharmacies = await prisma.pharmacistProfile.findMany({
        where: {
          user: { accountStatus: 'active' },
          OR: [
            { pharmacyName: { contains: query, mode: 'insensitive' } },
            { pharmacyAddress: { contains: query, mode: 'insensitive' } },
            { user: { firstName: { contains: query, mode: 'insensitive' } } },
          ],
        },
        include: {
          user: { select: { id: true, firstName: true, lastName: true, profileImage: true } },
        },
        take: limit,
      })

      for (const pharm of pharmacies) {
        results.push({
          id: pharm.user.id,
          label: pharm.pharmacyName,
          sublabel: pharm.pharmacyAddress,
          category: 'pharmacy',
          href: `/search/medicines?pharmacy=${pharm.user.id}`,
          image: pharm.user.profileImage,
        })
      }
    }

    // Search Emergency Services
    if (category === 'all' || category === 'emergency') {
      const emergency = await prisma.emergencyWorkerProfile.findMany({
        where: {
          user: { accountStatus: 'active' },
          OR: [
            { responseZone: { contains: query, mode: 'insensitive' } },
            { user: { firstName: { contains: query, mode: 'insensitive' } } },
            { user: { lastName: { contains: query, mode: 'insensitive' } } },
          ],
        },
        include: {
          user: { select: { id: true, firstName: true, lastName: true, profileImage: true } },
        },
        take: limit,
      })

      for (const ew of emergency) {
        results.push({
          id: ew.user.id,
          label: `${ew.user.firstName} ${ew.user.lastName}`,
          sublabel: [ew.emtLevel, ew.vehicleType, ew.responseZone].filter(Boolean).join(' — '),
          category: 'emergency',
          href: `/search/emergency`,
          image: ew.user.profileImage,
        })
      }
    }

    // Search Lab Tests
    if (category === 'all' || category === 'lab') {
      const labs = await prisma.labTechProfile.findMany({
        where: {
          user: { accountStatus: 'active' },
          OR: [
            { labName: { contains: query, mode: 'insensitive' } },
            { user: { firstName: { contains: query, mode: 'insensitive' } } },
          ],
        },
        include: {
          user: { select: { id: true, firstName: true, lastName: true, profileImage: true } },
        },
        take: limit,
      })

      for (const lab of labs) {
        results.push({
          id: lab.user.id,
          label: lab.labName,
          sublabel: lab.specializations.join(', ') || 'Laboratory Services',
          category: 'lab',
          href: `/search/lab`,
          image: lab.user.profileImage,
        })
      }
    }

    // Limit total results
    const trimmed = results.slice(0, limit)

    return NextResponse.json({ success: true, data: trimmed })
  } catch (error) {
    console.error('Autocomplete search error:', error)
    return NextResponse.json({ success: false, message: 'Search failed' }, { status: 500 })
  }
}
