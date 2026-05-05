/**
 * Seed 59 — ProviderServiceConfig backfill + workflow template attachment
 *
 * Two responsibilities:
 * 1. Ensure every active isDefault PlatformService has a ProviderServiceConfig
 *    row for every provider of the matching type (runs AFTER seed 57/58).
 * 2. For every ProviderServiceConfig that has no ProviderServiceWorkflow links
 *    yet, attach all active system/admin workflow templates that match the
 *    provider's role type — giving the provider sensible defaults that they
 *    can later customise in their dashboard.
 *
 * Safe to re-run: uses upsert throughout.
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

  // ── Step 1: Ensure ProviderServiceConfig rows exist ──────────────────────

  let configsUpserted = 0
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
      configsUpserted++
    }
  }

  console.log(`  ✓ ${configsUpserted} ProviderServiceConfig rows ensured (${providers.length} providers)`)

  // ── Step 2: Attach workflow templates to configs that have none ───────────
  //
  // For each provider type, collect all active system/admin templates (no
  // createdByProviderId, so regional admin + system defaults).  Then for every
  // ProviderServiceConfig of that type that has 0 ProviderServiceWorkflow links,
  // link all templates whose serviceMode is reasonable for the service.

  const allConfigs = await prisma.providerServiceConfig.findMany({
    where: { providerUserId: { in: providers.map(p => p.id) }, isActive: true },
    select: {
      id: true,
      providerUserId: true,
      platformServiceId: true,
      workflowTemplates: { select: { id: true } },
    },
  })

  // All system + regional-admin templates grouped by providerType
  const templates = await prisma.workflowTemplate.findMany({
    where: {
      isActive: true,
      createdByProviderId: null,
      providerType: { in: providerTypes as any[] },
    },
    select: { id: true, providerType: true },
  })

  const templatesByType = new Map<string, string[]>()
  for (const t of templates) {
    const list = templatesByType.get(t.providerType) ?? []
    list.push(t.id)
    templatesByType.set(t.providerType, list)
  }

  // Provider userType lookup
  const providerTypeMap = new Map(providers.map(p => [p.id, p.userType]))

  let workflowsLinked = 0
  for (const config of allConfigs) {
    // Only auto-attach if nothing has been explicitly linked yet
    if (config.workflowTemplates.length > 0) continue

    const providerType = providerTypeMap.get(config.providerUserId) ?? ''
    const templateIds = templatesByType.get(providerType) ?? []

    for (const tplId of templateIds) {
      await prisma.providerServiceWorkflow.upsert({
        where: {
          providerServiceConfigId_workflowTemplateId: {
            providerServiceConfigId: config.id,
            workflowTemplateId: tplId,
          },
        },
        update: {},
        create: {
          providerServiceConfigId: config.id,
          workflowTemplateId: tplId,
        },
      })
      workflowsLinked++
    }
  }

  console.log(`  ✓ ${workflowsLinked} ProviderServiceWorkflow links created`)
}
