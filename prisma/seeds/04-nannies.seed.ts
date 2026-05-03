import { PrismaClient, UserType } from '@prisma/client'
import bcrypt from 'bcrypt'

export async function seedNannies(prisma: PrismaClient) {
  const hash = (pw: string) => bcrypt.hash(pw, 10)

  const nannies = [
    {
      id: 'NAN001',
      firstName: 'Sophie',
      lastName: 'Dubois',
      email: 'nanny.sophie@mediwyz.com',
      password: await hash('Nanny123!'),
      profileImage: '/images/nannies/1.jpg',
      phone: '+230 5789 0123',
      userType: UserType.NANNY,
      verified: true,
      accountStatus: 'active',
      regionId: 'REG-MU',
      nannyProfile: {
        create: {
          id: 'NAPROF001',
          experience: 10,
          certifications: ['First Aid', 'Child Development', 'CPR Certified'],
        },
      },
    },
    {
      id: 'NAN002',
      firstName: 'Claire',
      lastName: 'Morel',
      email: 'claire.morel@mediwyz.com',
      password: await hash('Nanny123!'),
      profileImage: '/images/nannies/2.jpg',
      phone: '+230 5890 1234',
      userType: UserType.NANNY,
      verified: true,
      accountStatus: 'active',
      regionId: 'REG-MU',
      nannyProfile: {
        create: {
          id: 'NAPROF002',
          experience: 5,
          certifications: ['Child Psychology', 'First Aid'],
        },
      },
    },
  ]

  for (const nanny of nannies) {
    await prisma.user.upsert({
      where: { id: nanny.id },
      update: {},
      create: nanny,
    })
  }

  console.log(`  Seeded ${nannies.length} nannies (User + NannyProfile)`)
  return nannies
}
