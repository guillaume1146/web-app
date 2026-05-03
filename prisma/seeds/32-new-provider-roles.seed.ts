import { PrismaClient, UserType } from '@prisma/client'
import bcrypt from 'bcrypt'

export async function seedNewProviderRoles(prisma: PrismaClient) {
  const hash = (pw: string) => bcrypt.hash(pw, 10)
  console.log('  Seeding new provider roles...')

  const providers = [
    // ── Caregivers ──────────────────────────────────────────────────
    {
      id: 'CARE001',
      profileImage: '/images/caregivers/1.jpg',
      firstName: 'Alice',
      lastName: 'Martin',
      email: 'caregiver.alice@mediwyz.com',
      password: await hash('Caregiver123!'),
      phone: '+230 5789 7001',
      userType: UserType.CAREGIVER,
      dateOfBirth: new Date('1980-05-15'),
      gender: 'Female',
      address: 'Rose Hill, Mauritius',
      regionId: 'REG-MU',
      profile: {
        create: { id: 'CGPROF001', experience: 8, specializations: ['Elder Care', 'Dementia Care'], certifications: ['First Aid', 'CPR'] },
      },
      profileKey: 'caregiverProfile',
    },
    {
      id: 'CARE002',
      profileImage: '/images/caregivers/2.jpg',
      firstName: 'Jean-Pierre',
      lastName: 'Leduc',
      email: 'jp.leduc@mediwyz.com',
      password: await hash('Caregiver123!'),
      phone: '+230 5789 7002',
      userType: UserType.CAREGIVER,
      dateOfBirth: new Date('1975-11-20'),
      gender: 'Male',
      address: 'Curepipe, Mauritius',
      regionId: 'REG-MU',
      profile: {
        create: { id: 'CGPROF002', experience: 12, specializations: ['Disability Care', 'Post-Surgery Care'], certifications: ['Home Care Certified'] },
      },
      profileKey: 'caregiverProfile',
    },

    // ── Physiotherapists ────────────────────────────────────────────
    {
      id: 'PHYSIO001',
      profileImage: '/images/physiotherapists/1.jpg',
      firstName: 'Paul',
      lastName: 'Moreau',
      email: 'physio.paul@mediwyz.com',
      password: await hash('Physio123!'),
      phone: '+230 5789 8001',
      userType: UserType.PHYSIOTHERAPIST,
      dateOfBirth: new Date('1988-03-10'),
      gender: 'Male',
      address: 'Quatre Bornes, Mauritius',
      regionId: 'REG-MU',
      profile: {
        create: { id: 'PTPROF001', licenseNumber: 'PT-MU-2018-001', experience: 7, specializations: ['Sports', 'Orthopedic'], clinicName: 'MoveWell Physio' },
      },
      profileKey: 'physiotherapistProfile',
    },

    // ── Dentists ────────────────────────────────────────────────────
    {
      id: 'DENT001',
      profileImage: '/images/dentists/1.jpg',
      firstName: 'Sara',
      lastName: 'Petit',
      email: 'dentist.sara@mediwyz.com',
      password: await hash('Dentist123!'),
      phone: '+230 5789 9001',
      userType: UserType.DENTIST,
      dateOfBirth: new Date('1985-07-22'),
      gender: 'Female',
      address: 'Port Louis, Mauritius',
      regionId: 'REG-MU',
      profile: {
        create: { id: 'DNPROF001', licenseNumber: 'DN-MU-2016-001', experience: 10, specializations: ['General Dentistry', 'Cosmetic Dentistry'], clinicName: 'Smile Dental Clinic' },
      },
      profileKey: 'dentistProfile',
    },

    // ── Optometrists ────────────────────────────────────────────────
    {
      id: 'OPT001',
      profileImage: '/images/optometrists/1.jpg',
      firstName: 'Lisa',
      lastName: 'Girard',
      email: 'optometrist.lisa@mediwyz.com',
      password: await hash('Optometrist123!'),
      phone: '+230 5789 9501',
      userType: UserType.OPTOMETRIST,
      dateOfBirth: new Date('1990-01-08'),
      gender: 'Male',
      address: 'Ebene, Mauritius',
      regionId: 'REG-MU',
      profile: {
        create: { id: 'OPPROF001', licenseNumber: 'OP-MU-2019-001', experience: 5, specializations: ['General Eye Care', 'Contact Lenses'], clinicName: 'ClearView Optometry' },
      },
      profileKey: 'optometristProfile',
    },

    // ── Nutritionists ───────────────────────────────────────────────
    {
      id: 'NUTR001',
      profileImage: '/images/nutritionists/1.jpg',
      firstName: 'Marc',
      lastName: 'Lefebvre',
      email: 'nutritionist.marc@mediwyz.com',
      password: await hash('Nutritionist123!'),
      phone: '+230 5789 9801',
      userType: UserType.NUTRITIONIST,
      dateOfBirth: new Date('1992-09-14'),
      gender: 'Female',
      address: 'Floreal, Mauritius',
      regionId: 'REG-MU',
      profile: {
        create: { id: 'NTPROF001', experience: 4, specializations: ['Clinical Nutrition', 'Weight Management', 'Diabetes Nutrition'], certifications: ['Certified Dietitian'] },
      },
      profileKey: 'nutritionistProfile',
    },
  ]

  for (const p of providers) {
    const { profileKey, profile, ...userData } = p
    await prisma.user.upsert({
      where: { id: userData.id },
      update: {},
      create: {
        ...userData,
        verified: true,
        accountStatus: 'active',
        [profileKey]: profile,
      },
    })
  }

  console.log(`  ✓ ${providers.length} new provider role users seeded`)
}
