import { PrismaClient, UserType } from '@prisma/client'
import bcrypt from 'bcrypt'

export async function seedPatients(prisma: PrismaClient) {
  const hash = (pw: string) => bcrypt.hash(pw, 10)

  const patients = [
    {
      id: 'PAT001',
      firstName: 'Emma',
      lastName: 'Johnson',
      email: 'emma.johnson@mediwyz.com',
      password: await hash('Patient123!'),
      profileImage: '/images/patients/1.jpg',
      phone: '+230 5789 1234',
      userType: UserType.MEMBER,
      gender: 'Female',
      dateOfBirth: new Date('1985-03-15'),
      address: 'Rose Hill, Mauritius',
      verified: true,
      accountStatus: 'active',
      regionId: 'REG-MU',
      patientProfile: {
        create: {
          id: 'PPROF001',
          nationalId: 'E1503851234567',
          passportNumber: 'MU8745123',
          bloodType: 'A+',
          allergies: ['Penicillin', 'Shellfish'],
          chronicConditions: ['Hypertension', 'Type 2 Diabetes'],
          healthScore: 78,
        },
      },
    },
    {
      id: 'PAT002',
      firstName: 'Jean',
      lastName: 'Pierre',
      email: 'jean.pierre@mediwyz.com',
      password: await hash('Patient123!'),
      profileImage: '/images/patients/2.jpg',
      phone: '+230 5890 2345',
      userType: UserType.MEMBER,
      gender: 'Male',
      dateOfBirth: new Date('1990-07-22'),
      address: 'Curepipe, Mauritius',
      verified: true,
      accountStatus: 'active',
      regionId: 'REG-MU',
      patientProfile: {
        create: {
          id: 'PPROF002',
          nationalId: 'J2207901234568',
          bloodType: 'O+',
          allergies: [],
          chronicConditions: ['Asthma'],
          healthScore: 85,
        },
      },
    },
    {
      id: 'PAT003',
      firstName: 'Aisha',
      lastName: 'Khan',
      email: 'aisha.khan@mediwyz.com',
      password: await hash('Patient123!'),
      profileImage: '/images/patients/3.jpg',
      phone: '+230 5901 3456',
      userType: UserType.MEMBER,
      gender: 'Female',
      dateOfBirth: new Date('1978-11-05'),
      address: 'Port Louis, Mauritius',
      verified: true,
      accountStatus: 'active',
      regionId: 'REG-MU',
      patientProfile: {
        create: {
          id: 'PPROF003',
          nationalId: 'A0511781234569',
          bloodType: 'B+',
          allergies: ['Latex'],
          chronicConditions: [],
          healthScore: 92,
        },
      },
    },
    {
      id: 'PAT004',
      firstName: 'Vikash',
      lastName: 'Doorgakant',
      email: 'vikash.d@mediwyz.com',
      password: await hash('Patient123!'),
      profileImage: '/images/patients/4.jpg',
      phone: '+230 5012 4567',
      userType: UserType.MEMBER,
      gender: 'Male',
      dateOfBirth: new Date('1995-01-30'),
      address: 'Vacoas, Mauritius',
      verified: true,
      accountStatus: 'active',
      regionId: 'REG-MU',
      patientProfile: {
        create: {
          id: 'PPROF004',
          nationalId: 'V3001951234570',
          bloodType: 'AB-',
          allergies: ['Aspirin'],
          chronicConditions: ['High Cholesterol'],
          healthScore: 72,
        },
      },
    },
    {
      id: 'PAT005',
      firstName: 'Nadia',
      lastName: 'Soobramanien',
      email: 'nadia.s@mediwyz.com',
      password: await hash('Patient123!'),
      profileImage: '/images/patients/5.jpg',
      phone: '+230 5123 5678',
      userType: UserType.MEMBER,
      gender: 'Female',
      dateOfBirth: new Date('2000-09-12'),
      address: 'Moka, Mauritius',
      verified: true,
      accountStatus: 'active',
      regionId: 'REG-MU',
      patientProfile: {
        create: {
          id: 'PPROF005',
          nationalId: 'N1209001234571',
          bloodType: 'A-',
          allergies: [],
          chronicConditions: [],
          healthScore: 95,
        },
      },
    },
  ]

  for (const pat of patients) {
    await prisma.user.upsert({
      where: { id: pat.id },
      update: {},
      create: pat,
    })
  }

  // Emergency contacts (reference PatientProfile IDs)
  const emergencyContacts = [
    { patientId: 'PPROF001', name: 'Michael Johnson', relationship: 'Husband', phone: '+230 5890 2345', address: 'Rose Hill, Mauritius' },
    { patientId: 'PPROF002', name: 'Marie Pierre', relationship: 'Sister', phone: '+230 5901 3456', address: 'Curepipe, Mauritius' },
    { patientId: 'PPROF003', name: 'Omar Khan', relationship: 'Husband', phone: '+230 5012 4567', address: 'Port Louis, Mauritius' },
    { patientId: 'PPROF004', name: 'Sita Doorgakant', relationship: 'Mother', phone: '+230 5123 5678', address: 'Vacoas, Mauritius' },
    { patientId: 'PPROF005', name: 'Dev Soobramanien', relationship: 'Father', phone: '+230 5234 6789', address: 'Moka, Mauritius' },
  ]

  for (const ec of emergencyContacts) {
    await prisma.patientEmergencyContact.upsert({
      where: { patientId: ec.patientId },
      update: {},
      create: ec,
    })
  }

  console.log(`  Seeded ${patients.length} patients (User + PatientProfile) with emergency contacts`)
  return patients
}
