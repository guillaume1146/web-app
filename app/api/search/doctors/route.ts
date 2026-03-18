import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { rateLimitSearch } from '@/lib/rate-limit'

export async function GET(request: NextRequest) {
  const limited = rateLimitSearch(request)
  if (limited) return limited

  try {
    const { searchParams } = request.nextUrl
    const query = searchParams.get('q') || ''
    const specialty = searchParams.get('specialty') || ''
    const page = Math.max(1, parseInt(searchParams.get('page') || '1') || 1)
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20') || 20))

    const doctors = await prisma.doctorProfile.findMany({
      where: {
        user: {
          accountStatus: 'active',
        },
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            profileImage: true,
            phone: true,
            verified: true,
            gender: true,
            dateOfBirth: true,
            address: true,
          },
        },
        education: true,
        certifications: true,
        workHistory: true,
        patientComments: {
          orderBy: { date: 'desc' },
          take: 10,
        },
      },
    })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mapped = doctors.map((doc) => {
      const user = doc.user
      return {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        profileImage: user.profileImage || `https://api.dicebear.com/7.x/initials/svg?seed=${user.firstName} ${user.lastName}`,
        specialty: doc.specialty,
        subSpecialties: doc.subSpecialties,
        licenseNumber: doc.licenseNumber,
        licenseExpiryDate: doc.licenseExpiryDate.toISOString(),
        clinicAffiliation: doc.clinicAffiliation,
        hospitalPrivileges: doc.hospitalPrivileges,
        rating: doc.rating,
        reviews: doc.reviewCount,
        experience: doc.experience,
        location: doc.location,
        address: user.address || doc.location,
        phone: user.phone,
        alternatePhone: doc.alternatePhone,
        website: doc.website,
        languages: doc.languages,
        nextAvailable: doc.nextAvailable ? doc.nextAvailable.toISOString().split('T')[0] : 'Available Today',
        consultationDuration: doc.consultationDuration,
        consultationFee: doc.consultationFee,
        videoConsultationFee: doc.videoConsultationFee,
        emergencyConsultationFee: doc.emergencyConsultationFee,
        consultationTypes: doc.consultationTypes,
        emergencyAvailable: doc.emergencyAvailable,
        homeVisitAvailable: doc.homeVisitAvailable,
        telemedicineAvailable: doc.telemedicineAvailable,
        nationality: doc.nationality,
        bio: doc.bio,
        philosophy: doc.philosophy,
        specialInterests: doc.specialInterests,
        verified: user.verified,
        verificationDate: doc.verificationDate?.toISOString(),
        gender: user.gender || 'Other',
        dateOfBirth: user.dateOfBirth?.toISOString(),
        age: user.dateOfBirth ? Math.floor((Date.now() - user.dateOfBirth.getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : 0,
        education: doc.education.map((e) => ({
          degree: e.degree,
          institution: e.institution,
          year: String(e.year),
        })),
        workHistory: doc.workHistory.map((w) => ({
          position: w.position,
          organization: w.institution,
          period: `${w.startDate.getFullYear()} - ${w.isCurrent ? 'Present' : w.endDate?.getFullYear() || ''}`,
          current: w.isCurrent,
        })),
        certifications: doc.certifications.map((c) => ({
          name: c.name,
          issuingBody: c.issuingBody,
          dateObtained: c.dateObtained.toISOString().split('T')[0],
          expiryDate: c.expiryDate?.toISOString().split('T')[0],
        })),
        patientComments: doc.patientComments.map((pc) => ({
          id: pc.id,
          patientFirstName: pc.patientName.split(' ')[0] || 'Patient',
          patientLastName: pc.patientName.split(' ').slice(1).join(' ') || '',
          patientProfileImage: `https://api.dicebear.com/7.x/initials/svg?seed=${pc.patientName}`,
          comment: pc.comment,
          starRating: pc.rating,
          date: pc.date.toISOString().split('T')[0],
          time: pc.date.toISOString().split('T')[1]?.slice(0, 5) || '00:00',
        })),
      }
    })

    // Apply search filters
    let results = mapped

    if (specialty && specialty !== 'all') {
      results = results.filter((doc) =>
        doc.specialty.some((s) => s.toLowerCase().includes(specialty.toLowerCase()))
      )
    }

    if (query) {
      const lowerQuery = query.toLowerCase()
      results = results.filter((doc) => {
        return (
          doc.firstName.toLowerCase().includes(lowerQuery) ||
          doc.lastName.toLowerCase().includes(lowerQuery) ||
          doc.specialty.some((s) => s.toLowerCase().includes(lowerQuery)) ||
          doc.location.toLowerCase().includes(lowerQuery) ||
          doc.bio.toLowerCase().includes(lowerQuery) ||
          doc.education.some(
            (e) =>
              e.degree.toLowerCase().includes(lowerQuery) ||
              e.institution.toLowerCase().includes(lowerQuery)
          ) ||
          doc.languages.some((l) => l.toLowerCase().includes(lowerQuery)) ||
          doc.subSpecialties.some((s) => s.toLowerCase().includes(lowerQuery))
        )
      })
    }

    const total = results.length
    const totalPages = Math.ceil(total / limit)
    const paginatedData = results.slice((page - 1) * limit, page * limit)

    return NextResponse.json({ success: true, data: paginatedData, total, page, limit, totalPages })
  } catch (error) {
    console.error('Doctors search error:', error)
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 })
  }
}
