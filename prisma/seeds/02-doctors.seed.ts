import { PrismaClient, UserType } from '@prisma/client'
import bcrypt from 'bcrypt'

export async function seedDoctors(prisma: PrismaClient) {
  const hash = (pw: string) => bcrypt.hash(pw, 10)

  // ── Doctor Users with nested DoctorProfiles ──────────────────────────────

  const doctorUsers = [
    {
      // User fields
      id: 'DOC001',
      firstName: 'Amara',
      lastName: 'Diallo',
      email: 'dr.amara.diallo@mediwyz.com',
      password: await hash('Doctor123!'),
      profileImage: '/images/doctors/1.jpg',
      phone: '+230 5234 5678',
      userType: UserType.DOCTOR,
      dateOfBirth: new Date('1982-06-15'),
      gender: 'Female',
      address: '45 Royal Road, Port Louis',
      verified: true,
      accountStatus: 'active',
      regionId: 'REG-MU',
      // Nested DoctorProfile
      doctorProfile: {
        create: {
          id: 'DPROF001',
          specialty: ['Endocrinology', 'Internal Medicine'],
          subSpecialties: ['Diabetes Management', 'Thyroid Disorders'],
          licenseNumber: 'MU-DOC-2015-001',
          licenseExpiryDate: new Date('2026-12-31'),
          clinicAffiliation: 'City Medical Center',
          hospitalPrivileges: ['City Medical Center', 'Victoria Hospital'],
          rating: 4.8,
          reviewCount: 127,
          experience: '12 years',
          publications: ['Diabetes Management in Tropical Climates'],
          awards: ['Best Endocrinologist 2023'],
          location: 'Port Louis, Mauritius',
          languages: ['English', 'French', 'Creole'],
          nextAvailable: new Date(Date.now() + 86400000),
          consultationDuration: 30,
          consultationFee: 1500,
          videoConsultationFee: 1200,
          emergencyConsultationFee: 3000,
          consultationTypes: ['video', 'in-person', 'home-visit'],
          emergencyAvailable: true,
          homeVisitAvailable: true,
          telemedicineAvailable: true,
          nationality: 'Mauritian',
          bio: 'Experienced endocrinologist specializing in diabetes management and thyroid disorders.',
          philosophy: 'Patient-centered care with evidence-based treatment.',
          specialInterests: ['Diabetes Technology', 'Preventive Medicine'],
          verificationDate: new Date('2023-01-15'),
        },
      },
    },
    {
      id: 'DOC002',
      firstName: 'Raj',
      lastName: 'Patel',
      email: 'raj.patel@mediwyz.com',
      password: await hash('Doctor123!'),
      profileImage: '/images/doctors/2.jpg',
      phone: '+230 5345 6789',
      userType: UserType.DOCTOR,
      dateOfBirth: new Date('1975-03-22'),
      gender: 'Male',
      address: '12 Main Street, Rose Hill',
      verified: true,
      accountStatus: 'active',
      regionId: 'REG-MU',
      doctorProfile: {
        create: {
          id: 'DPROF002',
          specialty: ['General Medicine', 'Family Medicine'],
          subSpecialties: ['Geriatrics', 'Preventive Care'],
          licenseNumber: 'MU-DOC-2010-042',
          licenseExpiryDate: new Date('2026-06-30'),
          clinicAffiliation: 'Rose Hill Medical Clinic',
          hospitalPrivileges: ['Victoria Hospital'],
          rating: 4.6,
          reviewCount: 89,
          experience: '18 years',
          publications: [],
          awards: [],
          location: 'Rose Hill, Mauritius',
          languages: ['English', 'French', 'Hindi', 'Creole'],
          nextAvailable: new Date(Date.now() + 43200000),
          consultationDuration: 20,
          consultationFee: 800,
          videoConsultationFee: 600,
          emergencyConsultationFee: 1500,
          consultationTypes: ['video', 'in-person'],
          emergencyAvailable: false,
          homeVisitAvailable: true,
          telemedicineAvailable: true,
          nationality: 'Mauritian',
          bio: 'Family physician with extensive experience in general and preventive medicine.',
          specialInterests: ['Preventive Health', 'Chronic Disease Management'],
          verificationDate: new Date('2022-06-10'),
        },
      },
    },
    {
      id: 'DOC003',
      firstName: 'Marie',
      lastName: 'Dupont',
      email: 'marie.dupont@mediwyz.com',
      password: await hash('Doctor123!'),
      profileImage: '/images/doctors/3.jpg',
      phone: '+230 5456 7890',
      userType: UserType.DOCTOR,
      dateOfBirth: new Date('1980-11-08'),
      gender: 'Female',
      address: '78 St Jean Road, Quatre Bornes',
      verified: true,
      accountStatus: 'active',
      regionId: 'REG-MU',
      doctorProfile: {
        create: {
          id: 'DPROF003',
          specialty: ['Cardiology'],
          subSpecialties: ['Interventional Cardiology', 'Heart Failure'],
          licenseNumber: 'MU-DOC-2012-018',
          licenseExpiryDate: new Date('2027-03-31'),
          clinicAffiliation: 'Cardiac Care Center',
          hospitalPrivileges: ['City Medical Center', 'SSR Hospital'],
          rating: 4.9,
          reviewCount: 203,
          experience: '15 years',
          publications: ['Cardiac Care in Island Nations'],
          awards: ['Cardiologist of the Year 2024'],
          location: 'Quatre Bornes, Mauritius',
          languages: ['English', 'French', 'Creole'],
          nextAvailable: new Date(Date.now() + 172800000),
          consultationDuration: 45,
          consultationFee: 2000,
          videoConsultationFee: 1500,
          emergencyConsultationFee: 4000,
          consultationTypes: ['video', 'in-person'],
          emergencyAvailable: true,
          homeVisitAvailable: false,
          telemedicineAvailable: true,
          nationality: 'Mauritian',
          bio: 'Leading cardiologist specializing in interventional procedures and heart failure management.',
          specialInterests: ['Cardiac Imaging', 'Preventive Cardiology'],
          verificationDate: new Date('2023-03-20'),
        },
      },
    },
  ]

  for (const doc of doctorUsers) {
    await prisma.user.upsert({
      where: { id: doc.id },
      update: {},
      create: doc,
    })
  }

  // ── Education (references DoctorProfile IDs: DPROF001, DPROF002, DPROF003) ─

  const educations = [
    { doctorId: 'DPROF001', degree: 'MBBS', institution: 'University of Mauritius', year: 2010, honors: 'Distinction' },
    { doctorId: 'DPROF001', degree: 'MD Endocrinology', institution: 'University of Cape Town', year: 2014 },
    { doctorId: 'DPROF002', degree: 'MBBS', institution: 'University of Mauritius', year: 2006 },
    { doctorId: 'DPROF003', degree: 'MBBS', institution: 'University of Paris', year: 2008, honors: 'Magna Cum Laude' },
    { doctorId: 'DPROF003', degree: 'MD Cardiology', institution: 'Imperial College London', year: 2012 },
  ]
  await prisma.doctorEducation.createMany({ data: educations })

  // ── Certifications ────────────────────────────────────────────────────────

  const certs = [
    { doctorId: 'DPROF001', name: 'Board Certified Endocrinologist', issuingBody: 'Mauritius Medical Council', dateObtained: new Date('2015-01-01'), expiryDate: new Date('2027-01-01') },
    { doctorId: 'DPROF002', name: 'Family Medicine Certification', issuingBody: 'Mauritius Medical Council', dateObtained: new Date('2010-06-01') },
    { doctorId: 'DPROF003', name: 'Board Certified Cardiologist', issuingBody: 'Mauritius Medical Council', dateObtained: new Date('2013-01-01'), expiryDate: new Date('2027-01-01') },
  ]
  await prisma.doctorCertification.createMany({ data: certs })

  // ── Schedule Slots ────────────────────────────────────────────────────────

  const slots = []
  for (const profileId of ['DPROF001', 'DPROF002', 'DPROF003']) {
    for (let day = 1; day <= 5; day++) { // Mon-Fri
      slots.push({ doctorId: profileId, dayOfWeek: day, startTime: '09:00', endTime: '12:00', isActive: true })
      slots.push({ doctorId: profileId, dayOfWeek: day, startTime: '14:00', endTime: '17:00', isActive: true })
    }
  }
  await prisma.scheduleSlot.createMany({ data: slots })

  // ── Patient Comments ──────────────────────────────────────────────────────

  const comments = [
    { doctorId: 'DPROF001', patientName: 'Anonymous', rating: 5, comment: 'Excellent doctor, very thorough and caring.', date: new Date('2024-11-15') },
    { doctorId: 'DPROF001', patientName: 'Anonymous', rating: 4, comment: 'Great expertise in diabetes management.', date: new Date('2024-10-20') },
    { doctorId: 'DPROF002', patientName: 'Anonymous', rating: 5, comment: 'Very patient and explains everything clearly.', date: new Date('2024-12-01') },
    { doctorId: 'DPROF003', patientName: 'Anonymous', rating: 5, comment: 'Best cardiologist in Mauritius.', date: new Date('2024-11-28') },
  ]
  await prisma.patientComment.createMany({ data: comments })

  console.log(`  Seeded ${doctorUsers.length} doctor users with profiles, education, certifications, and schedules`)
  return doctorUsers
}
