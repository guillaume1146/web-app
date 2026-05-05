/**
 * Seed 59 — Final ProviderServiceConfig backfill
 *
 * Ensures every active isDefault PlatformService has a ProviderServiceConfig
 * row for every provider of the matching type. This runs LAST so it picks up
 * services added in seeds 57+ that seed 55 could not see (seed 55 runs before
 * seed 57 in the orchestrator).
 *
 * Safe to re-run: uses upsert.
 */

import { PrismaClient } from '@prisma/client'

export async function seedServiceConfigBackfill(prisma: PrismaClient) {
  console.log('  Seeding service config backfill (seed 59)...')

  const providerTypes = [
    'DOCTOR', 'NURSE', 'NANNY',
    'PHARMACIST', 'LAB_TECHNICIAN', 'EMERGENCY_WORKER',
    'CAREGIVER', 'PHYSIOTHERAPIST', 'DENTIST',
    'OPTOMETRIST', 'NUTRITIONIST',
  ]

  const [providers, services] = await Promise.all([
    prisma.user.findMany({
      where: { userType: { in: providerTypes as any[] }, accountStatus: 'active' },
      select: { id: true, userType: true },
    }),
    prisma.platformService.findMany({
      where: { isDefault: true, isActive: true },
      select: { id: true, providerType: true },
    }),
  ])

  // Build a lookup: providerType → service ids
  const servicesByType = new Map<string, string[]>()
  for (const s of services) {
    const list = servicesByType.get(s.providerType) ?? []
    list.push(s.id)
    servicesByType.set(s.providerType, list)
  }

  let upserted = 0
  for (const provider of providers) {
    const svcIds = servicesByType.get(provider.userType) ?? []
    for (const svcId of svcIds) {
      await prisma.providerServiceConfig.upsert({
        where: {
          platformServiceId_providerUserId: {
            platformServiceId: svcId,
            providerUserId: provider.id,
          },
        },
        update: {},
        create: {
          platformServiceId: svcId,
          providerUserId: provider.id,
          priceOverride: null,
          isActive: true,
        },
      })
      upserted++
    }
  }

  console.log(`  ✓ ${upserted} ProviderServiceConfig rows ensured across ${providers.length} providers`)
}
