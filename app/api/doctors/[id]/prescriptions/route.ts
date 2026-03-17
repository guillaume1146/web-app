import { NextRequest, NextResponse } from 'next/server'
import { validateRequest } from '@/lib/auth/validate'
import prisma from '@/lib/db'
import { createDoctorPrescriptionSchema } from '@/lib/validations/api'
import { rateLimitPublic } from '@/lib/rate-limit'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const limited = rateLimitPublic(request)
  if (limited) return limited

  const auth = validateRequest(request)
  if (!auth) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  if (auth.sub !== id) {
    return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 })
  }

  try {
    const doctorProfile = await prisma.doctorProfile.findUnique({
      where: { userId: id },
      select: { id: true },
    })
    if (!doctorProfile) {
      return NextResponse.json({ success: false, message: 'Doctor profile not found' }, { status: 404 })
    }

    const prescriptions = await prisma.prescription.findMany({
      where: { doctorId: doctorProfile.id },
      select: {
        id: true,
        date: true,
        diagnosis: true,
        isActive: true,
        nextRefill: true,
        notes: true,
        patient: {
          select: {
            id: true,
            user: { select: { firstName: true, lastName: true, email: true } },
          },
        },
        medicines: {
          select: {
            dosage: true,
            frequency: true,
            duration: true,
            instructions: true,
            medicine: { select: { name: true, category: true } },
          },
        },
      },
      orderBy: { date: 'desc' },
    })

    const data = prescriptions.map((p) => ({
      id: p.id,
      patientId: p.patient.id,
      patientName: `${p.patient.user.firstName} ${p.patient.user.lastName}`,
      date: p.date.toISOString(),
      diagnosis: p.diagnosis,
      isActive: p.isActive,
      nextRefill: p.nextRefill?.toISOString() ?? null,
      notes: p.notes,
      medicines: p.medicines.map((m) => ({
        name: m.medicine.name,
        dosage: m.dosage,
        frequency: m.frequency,
        duration: m.duration,
        instructions: m.instructions ?? '',
        quantity: 0,
      })),
    }))

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Prescriptions fetch error:', error)
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const limited = rateLimitPublic(request)
  if (limited) return limited

  const auth = validateRequest(request)
  if (!auth) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  if (auth.sub !== id) {
    return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const parsed = createDoctorPrescriptionSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { message: parsed.error.issues[0].message },
        { status: 400 }
      )
    }
    const { patientId, diagnosis, notes, nextRefill, medicines } = parsed.data

    const doctorProfile = await prisma.doctorProfile.findUnique({
      where: { userId: id },
      select: { id: true },
    })
    if (!doctorProfile) {
      return NextResponse.json({ success: false, message: 'Doctor profile not found' }, { status: 404 })
    }

    // Verify patient exists
    const patient = await prisma.patientProfile.findUnique({
      where: { id: patientId },
      select: { id: true },
    })
    if (!patient) {
      return NextResponse.json({ success: false, message: 'Patient not found' }, { status: 404 })
    }

    // Upsert medicines and create prescription in a transaction
    const prescription = await prisma.$transaction(async (tx) => {
      const medicineRecords = await Promise.all(
        medicines.map(async (med) => {
          const dbMedicine = await tx.medicine.upsert({
            where: { name: med.name },
            create: { name: med.name, category: 'General', description: '' },
            update: {},
          })
          return { dbId: dbMedicine.id, ...med }
        })
      )

      return tx.prescription.create({
        data: {
          doctorId: doctorProfile.id,
          patientId,
          diagnosis,
          notes: notes || null,
          nextRefill: nextRefill ? new Date(nextRefill) : null,
          medicines: {
            create: medicineRecords.map((med) => ({
              medicineId: med.dbId,
              dosage: med.dosage,
              frequency: med.frequency,
              duration: med.duration,
              instructions: med.instructions || null,
            })),
          },
        },
        select: { id: true, date: true, diagnosis: true },
      })
    })

    return NextResponse.json({ success: true, data: prescription }, { status: 201 })
  } catch (error) {
    console.error('Prescription create error:', error)
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 })
  }
}
