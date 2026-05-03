import { PrismaClient, UserType } from '@prisma/client'
import bcrypt from 'bcrypt'

export async function seedNurses(prisma: PrismaClient) {
  const hash = (pw: string) => bcrypt.hash(pw, 10)

  const nurseUsers = [
    {
      // User fields
      id: 'NUR001',
      firstName: 'Claire',
      lastName: 'Leblanc',
      email: 'nurse.claire@mediwyz.com',
      password: await hash('Nurse123!'),
      profileImage: '/images/nurses/1.jpg',
      phone: '+230 5567 8901',
      userType: UserType.NURSE,
      verified: true,
      accountStatus: 'active',
      regionId: 'REG-MU',
      // Nested NurseProfile
      nurseProfile: {
        create: {
          id: 'NPROF001',
          licenseNumber: 'MU-NUR-2016-001',
          experience: 8,
          specializations: ['Home Care', 'Wound Management', 'Geriatric Care'],
        },
      },
    },
    {
      id: 'NUR002',
      firstName: 'Sophie',
      lastName: 'Laurent',
      email: 'sophie.laurent@mediwyz.com',
      password: await hash('Nurse123!'),
      profileImage: '/images/nurses/2.jpg',
      phone: '+230 5678 9012',
      userType: UserType.NURSE,
      verified: true,
      accountStatus: 'active',
      regionId: 'REG-MU',
      nurseProfile: {
        create: {
          id: 'NPROF002',
          licenseNumber: 'MU-NUR-2018-015',
          experience: 6,
          specializations: ['Pediatric Nursing', 'Vaccination', 'Post-Operative Care'],
        },
      },
    },
  ]

  for (const nurse of nurseUsers) {
    await prisma.user.upsert({
      where: { id: nurse.id },
      update: {},
      create: nurse,
    })
  }

  console.log(`  Seeded ${nurseUsers.length} nurse users with profiles`)
  return nurseUsers
}
