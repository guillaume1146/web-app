/**
 * Seed 59 — ProviderServiceConfig backfill + workflow template attachment
 *
 * Two responsibilities:
 * 1. Ensure every active isDefault PlatformService has a ProviderServiceConfig
 *    row for every provider of the matching type (runs AFTER seed 57/58).
 * 2. For every ProviderServiceConfig, attach the most relevant workflow templates:
 *      a. Service-specific templates first (workflowTemplate.platformServiceId = svc.id)
 *      b. If none: only slug-contains-"-standard-" templates for the provider type
 *         (typically 3: doctor-standard-office, doctor-standard-home, doctor-standard-video)
 *         — NOT all templates blindly.
 *
 * This ensures "Dry Eye Management" gets [Standard Office, Standard Home, Standard Video]
 * and NOT [Surgery, Mental Health, Corporate Screening, QA triggers, ...].
 *
 * Safe to re-run: resets auto-attached links before reapplying.
 * Provider-customized links (created via My Services dashboard after seed) are
 * preserved because we only touch configs whose links were auto-created here.
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
      await (prisma.providerServiceConfig as any).upsert({
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

  // ── Step 2: Build template lookup maps ───────────────────────────────────
  //
  // Fetch all system/admin templates (no createdByProviderId).
  // Build two maps:
  //   svcSpecific[serviceId]  → templates linked to exactly that service
  //   genericDefault[provType] → isDefault=true templates with no service link

  const allTemplates = await (prisma.workflowTemplate as any).findMany({
    where: {
      isActive: true,
      createdByProviderId: null,
      providerType: { in: providerTypes as any[] },
    },
    select: {
      id: true,
      providerType: true,
      platformServiceId: true,
      isDefault: true,
      serviceMode: true,
      slug: true,
    },
  })

  // service-specific templates: platformServiceId IS NOT NULL
  const svcSpecificMap = new Map<string, string[]>() // serviceId → templateIds
  // "standard" generic templates: slug contains '-standard-' (e.g. doctor-standard-office)
  // These are the safe 2-3 templates (office/home/video) appropriate for any service.
  const genericStandardMap = new Map<string, string[]>() // providerType → templateIds
  // All generic (last resort if no standard slugs exist for a type)
  const genericAllMap = new Map<string, string[]>()

  for (const t of allTemplates) {
    if (t.platformServiceId) {
      const list = svcSpecificMap.get(t.platformServiceId) ?? []
      list.push(t.id)
      svcSpecificMap.set(t.platformServiceId, list)
    } else {
      // generic (no service binding)
      const allList = genericAllMap.get(t.providerType) ?? []
      allList.push(t.id)
      genericAllMap.set(t.providerType, allList)

      // Only the "{type}-standard-{mode}" templates as safe universal defaults
      if (typeof t.slug === 'string' && t.slug.includes('-standard-')) {
        const stdList = genericStandardMap.get(t.providerType) ?? []
        stdList.push(t.id)
        genericStandardMap.set(t.providerType, stdList)
      }
    }
  }

  // ── Step 3: Reset + reattach workflow links for all seeded configs ────────
  //
  // We clear ALL existing ProviderServiceWorkflow rows for these configs and
  // reattach with the correct (narrower) set. This is safe because:
  //   - seeded providers haven't customised their workflows via the dashboard yet
  //   - the previous seed run attached too broadly (all templates)

  const allConfigs = await (prisma.providerServiceConfig as any).findMany({
    where: { providerUserId: { in: providers.map((p: any) => p.id) }, isActive: true },
    select: { id: true, providerUserId: true, platformServiceId: true },
  })

  const providerTypeMap = new Map(providers.map((p: any) => [p.id, p.userType]))

  // Delete existing auto-attached links for these configs (reset)
  const configIds = allConfigs.map((c: any) => c.id)
  const deleted = await (prisma.providerServiceWorkflow as any).deleteMany({
    where: { providerServiceConfigId: { in: configIds } },
  })
  console.log(`  ✓ Cleared ${deleted.count} stale ProviderServiceWorkflow links`)

  // Re-attach with smarter matching
  let workflowsLinked = 0
  for (const config of allConfigs) {
    const providerType = providerTypeMap.get(config.providerUserId) ?? ''
    const svcId = config.platformServiceId

    // Priority 1: service-specific templates (most relevant for this service)
    let templateIds = svcSpecificMap.get(svcId) ?? []

    // Priority 2: standard generic templates (slug contains '-standard-')
    // Gives exactly 1–3 options (office / home / video) appropriate for any service.
    if (templateIds.length === 0) {
      templateIds = genericStandardMap.get(providerType) ?? []
    }

    // Priority 3: any generic template (last resort — type has no standard slugs)
    if (templateIds.length === 0) {
      templateIds = genericAllMap.get(providerType) ?? []
    }

    for (const tplId of templateIds) {
      await (prisma.providerServiceWorkflow as any).upsert({
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

  console.log(`  ✓ ${workflowsLinked} ProviderServiceWorkflow links created (smarter matching)`)
}
