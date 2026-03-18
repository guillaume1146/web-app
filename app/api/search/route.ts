import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { rateLimitSearch } from '@/lib/rate-limit'

export interface UnifiedSearchResult {
  id: string
  type: 'doctor' | 'nurse' | 'nanny' | 'medicine'
  name: string
  profileImage: string | null
  specialty: string[]
  rating: number
  reviewCount: number
  city: string
  available: boolean
  nextAvailable: string
  verified: boolean
  consultationFee: number | null
  videoConsultationFee: number | null
  bio: string
  languages: string[]
  experience: string
  consultationTypes: string[]
  emergencyAvailable: boolean
  category: string
  detailHref: string
}

export interface UnifiedSearchResponse {
  success: boolean
  data: UnifiedSearchResult[]
  total: number
  page: number
  limit: number
  totalPages: number
  message?: string
}

export async function GET(request: NextRequest) {
  const limited = rateLimitSearch(request)
  if (limited) return limited

  try {
    const { searchParams } = request.nextUrl
    const query = (searchParams.get('q') || '').trim()
    const type = searchParams.get('type') || 'all' // doctors, nurses, nannies, medicines, all
    const specialty = searchParams.get('specialty') || ''
    const city = searchParams.get('city') || ''
    const minRating = parseFloat(searchParams.get('minRating') || '0')
    const available = searchParams.get('available') // 'true' or 'false'
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(Math.max(1, parseInt(searchParams.get('limit') || '12')), 50)

    const results: UnifiedSearchResult[] = []

    // ---------- Search Doctors ----------
    if (type === 'all' || type === 'doctors') {
      const doctors = await prisma.doctorProfile.findMany({
        where: {
          user: { accountStatus: 'active' },
          ...(minRating > 0 ? { rating: { gte: minRating } } : {}),
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              profileImage: true,
              phone: true,
              verified: true,
              address: true,
            },
          },
        },
      })

      for (const doc of doctors) {
        const user = doc.user
        const fullName = `Dr. ${user.firstName} ${user.lastName}`
        const locationStr = doc.location || user.address || ''

        // Apply text search filter
        if (query) {
          const lq = query.toLowerCase()
          const searchable = [
            user.firstName, user.lastName, ...doc.specialty,
            doc.bio, ...doc.languages, ...doc.subSpecialties,
            doc.location, ...(doc.specialInterests || []),
          ].map(s => (s || '').toLowerCase())

          if (!searchable.some(s => s.includes(lq))) continue
        }

        // Specialty filter
        if (specialty && specialty !== 'all') {
          if (!doc.specialty.some(s => s.toLowerCase().includes(specialty.toLowerCase()))) continue
        }

        // City filter
        if (city) {
          if (!locationStr.toLowerCase().includes(city.toLowerCase())) continue
        }

        // Availability filter
        if (available === 'true') {
          if (doc.nextAvailable && doc.nextAvailable > new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)) continue
        }

        results.push({
          id: user.id,
          type: 'doctor',
          name: fullName,
          profileImage: user.profileImage || `https://api.dicebear.com/7.x/initials/svg?seed=${user.firstName} ${user.lastName}`,
          specialty: doc.specialty,
          rating: doc.rating,
          reviewCount: doc.reviewCount,
          city: locationStr,
          available: !doc.nextAvailable || doc.nextAvailable <= new Date(),
          nextAvailable: doc.nextAvailable ? doc.nextAvailable.toISOString().split('T')[0] : 'Available Today',
          verified: user.verified,
          consultationFee: doc.consultationFee,
          videoConsultationFee: doc.videoConsultationFee,
          bio: doc.bio,
          languages: doc.languages,
          experience: doc.experience,
          consultationTypes: doc.consultationTypes,
          emergencyAvailable: doc.emergencyAvailable,
          category: doc.specialty[0] || 'General Practice',
          detailHref: `/search/doctors/${user.id}`,
        })
      }
    }

    // ---------- Search Nurses ----------
    if (type === 'all' || type === 'nurses') {
      const nurses = await prisma.nurseProfile.findMany({
        where: {
          user: { accountStatus: 'active' },
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              profileImage: true,
              phone: true,
              verified: true,
              address: true,
            },
          },
        },
      })

      for (const nurse of nurses) {
        const user = nurse.user
        const fullName = `${user.firstName} ${user.lastName}`
        const locationStr = user.address || 'Port Louis, Mauritius'

        if (query) {
          const lq = query.toLowerCase()
          const searchable = [
            user.firstName, user.lastName,
            ...nurse.specializations, locationStr,
          ].map(s => (s || '').toLowerCase())

          if (!searchable.some(s => s.includes(lq))) continue
        }

        if (specialty && specialty !== 'all') {
          if (!nurse.specializations.some(s => s.toLowerCase().includes(specialty.toLowerCase()))) continue
        }

        if (city) {
          if (!locationStr.toLowerCase().includes(city.toLowerCase())) continue
        }

        // Compute actual rating from reviews
        const nurseReviews = await prisma.providerReview.findMany({
          where: { providerUserId: user.id, providerType: 'NURSE' },
          select: { rating: true },
        })
        const nurseAvgRating = nurseReviews.length > 0
          ? Math.round((nurseReviews.reduce((s, r) => s + r.rating, 0) / nurseReviews.length) * 10) / 10
          : 0

        if (minRating > 0 && nurseAvgRating < minRating) continue

        results.push({
          id: user.id,
          type: 'nurse',
          name: fullName,
          profileImage: user.profileImage || `https://api.dicebear.com/7.x/initials/svg?seed=${user.firstName} ${user.lastName}`,
          specialty: nurse.specializations,
          rating: nurseAvgRating,
          reviewCount: nurseReviews.length,
          city: locationStr,
          available: true,
          nextAvailable: 'Available Today',
          verified: user.verified,
          consultationFee: null,
          videoConsultationFee: null,
          bio: `Experienced registered nurse with ${nurse.experience} years of experience specializing in ${nurse.specializations.join(', ')}.`,
          languages: ['English', 'French', 'Creole'],
          experience: `${nurse.experience} years`,
          consultationTypes: ['In-Person', 'Video Consultation', 'Home Visit'],
          emergencyAvailable: false,
          category: 'Registered Nurse',
          detailHref: `/search/nurses/${user.id}`,
        })
      }
    }

    // ---------- Search Nannies ----------
    if (type === 'all' || type === 'nannies') {
      const nannies = await prisma.nannyProfile.findMany({
        where: {
          user: { accountStatus: 'active' },
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              profileImage: true,
              phone: true,
              verified: true,
              address: true,
            },
          },
        },
      })

      for (const nanny of nannies) {
        const user = nanny.user
        const fullName = `${user.firstName} ${user.lastName}`
        const locationStr = user.address || 'Port Louis, Mauritius'

        if (query) {
          const lq = query.toLowerCase()
          const searchable = [
            user.firstName, user.lastName,
            ...nanny.certifications, locationStr,
          ].map(s => (s || '').toLowerCase())

          if (!searchable.some(s => s.includes(lq))) continue
        }

        if (specialty && specialty !== 'all') {
          const certs = nanny.certifications.length > 0 ? nanny.certifications : ['Child Care', 'Early Development']
          if (!certs.some(s => s.toLowerCase().includes(specialty.toLowerCase()))) continue
        }

        if (city) {
          if (!locationStr.toLowerCase().includes(city.toLowerCase())) continue
        }

        // Compute actual rating from reviews
        const nannyReviews = await prisma.providerReview.findMany({
          where: { providerUserId: user.id, providerType: 'NANNY' },
          select: { rating: true },
        })
        const nannyAvgRating = nannyReviews.length > 0
          ? Math.round((nannyReviews.reduce((s, r) => s + r.rating, 0) / nannyReviews.length) * 10) / 10
          : 0

        if (minRating > 0 && nannyAvgRating < minRating) continue

        results.push({
          id: user.id,
          type: 'nanny',
          name: fullName,
          profileImage: user.profileImage || `https://api.dicebear.com/7.x/initials/svg?seed=${user.firstName} ${user.lastName}`,
          specialty: nanny.certifications.length > 0 ? nanny.certifications : ['Child Care'],
          rating: nannyAvgRating,
          reviewCount: nannyReviews.length,
          city: locationStr,
          available: true,
          nextAvailable: 'Available Today',
          verified: user.verified,
          consultationFee: null,
          videoConsultationFee: null,
          bio: `Caring childcare professional with ${nanny.experience} years of experience. Certified in ${nanny.certifications.join(', ') || 'early childhood development'}.`,
          languages: ['English', 'French', 'Creole'],
          experience: `${nanny.experience} years`,
          consultationTypes: ['Full-time Care', 'Part-time Care', 'Date Night Sitting'],
          emergencyAvailable: false,
          category: 'Childcare Nurse',
          detailHref: `/search/childcare/${user.id}`,
        })
      }
    }

    // ---------- Search Medicines ----------
    if (type === 'all' || type === 'medicines') {
      const medicines = await prisma.pharmacyMedicine.findMany({
        where: {
          isActive: true,
          pharmacist: {
            user: { accountStatus: 'active' },
          },
        },
        include: {
          pharmacist: {
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  verified: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      })

      for (const med of medicines) {
        if (query) {
          const lq = query.toLowerCase()
          const searchable = [
            med.name, med.genericName || '', med.category, med.description,
            med.pharmacist.pharmacyName,
          ].map(s => (s || '').toLowerCase())

          if (!searchable.some(s => s.includes(lq))) continue
        }

        if (specialty && specialty !== 'all') {
          if (!med.category.toLowerCase().includes(specialty.toLowerCase())) continue
        }

        if (available === 'true') {
          if (!med.inStock || med.quantity <= 0) continue
        }

        results.push({
          id: med.id,
          type: 'medicine',
          name: med.name,
          profileImage: med.imageUrl,
          specialty: [med.category],
          rating: 0,
          reviewCount: 0,
          city: med.pharmacist.pharmacyName,
          available: med.inStock && med.quantity > 0,
          nextAvailable: med.inStock ? 'In Stock' : 'Out of Stock',
          verified: med.pharmacist.user.verified,
          consultationFee: med.price,
          videoConsultationFee: null,
          bio: med.description,
          languages: [],
          experience: '',
          consultationTypes: med.requiresPrescription ? ['Prescription Required'] : ['Over-the-Counter'],
          emergencyAvailable: false,
          category: med.category,
          detailHref: `/search/medicines?q=${encodeURIComponent(med.name)}`,
        })
      }
    }

    // Sort: put higher-rated results first (for providers), available first
    results.sort((a, b) => {
      // Available first
      if (a.available && !b.available) return -1
      if (!a.available && b.available) return 1
      // Then by rating descending
      return b.rating - a.rating
    })

    // Pagination
    const total = results.length
    const totalPages = Math.ceil(total / limit)
    const startIndex = (page - 1) * limit
    const paginatedResults = results.slice(startIndex, startIndex + limit)

    const response: UnifiedSearchResponse = {
      success: true,
      data: paginatedResults,
      total,
      page,
      limit,
      totalPages,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Unified search error:', error)
    return NextResponse.json(
      { success: false, message: 'Server error', data: [], total: 0, page: 1, limit: 12, totalPages: 0 },
      { status: 500 }
    )
  }
}
