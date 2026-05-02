/**
 * Cleanup Script — Remove test/dummy ProviderRole rows.
 *
 * Test rows can sneak into the DB during E2E + manual QA (e.g. roles named
 * "Podiatrist 1776954235938s", "Test Providers", "PlateformTest …",
 * "Admin Activator …"). They show up in the public hero filter chips and
 * pollute the Regional Admin role list.
 *
 * This script identifies them by:
 *   1. Trailing numeric suffix that looks like a JS timestamp (>= 10 digits,
 *      optionally followed by "s") — e.g. "Reflexologist 1776954307877s".
 *   2. Label/code containing "Test" or "PlateformTest" (case-insensitive).
 *   3. Label/code containing "Admin Activator" (the manual-activation dummy).
 *
 * Default mode is DRY-RUN. Pass `--apply` to actually delete.
 *
 * Usage:
 *   npx tsx prisma/scripts/cleanup-test-provider-roles.ts          # dry run
 *   npx tsx prisma/scripts/cleanup-test-provider-roles.ts --apply  # delete
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Anything that hits these patterns is treated as a test/dummy row.
const TEST_PATTERNS: RegExp[] = [
  /\b\d{10,}s?\b/i,            // trailing timestamp suffix (with optional "s")
  /test\s*provider/i,           // "Test Providers"
  /plateformtest/i,             // "PlateformTest …"
  /admin\s*activator/i,         // "Admin Activator …"
]

function looksLikeTest(value: string | null | undefined): boolean {
  if (!value) return false
  return TEST_PATTERNS.some(re => re.test(value))
}

async function main() {
  const apply = process.argv.includes('--apply')
  console.log(`\n🔎 Scanning ProviderRole for test/dummy entries (mode: ${apply ? 'APPLY' : 'DRY-RUN'})\n`)

  const all = await prisma.providerRole.findMany({
    select: { id: true, code: true, label: true, slug: true, isProvider: true, isActive: true },
    orderBy: { label: 'asc' },
  })

  const toDelete = all.filter(
    r => looksLikeTest(r.code) || looksLikeTest(r.label) || looksLikeTest(r.slug)
  )

  if (toDelete.length === 0) {
    console.log('✅ No test/dummy ProviderRole rows found. Nothing to do.')
    return
  }

  console.log(`Found ${toDelete.length} test ProviderRole row(s):`)
  toDelete.forEach(r => {
    console.log(`  • [${r.code}]  ${r.label}  (slug: ${r.slug})`)
  })

  if (!apply) {
    console.log('\nℹ️  DRY-RUN — re-run with `--apply` to delete these rows.\n')
    return
  }

  // Cascade-aware delete: detach Specialty + verification docs first if FKs are
  // not ON DELETE CASCADE in the schema. Prisma will throw if referenced by
  // RoleFeatureConfig / ProviderSpecialty / etc — handle the most common ones.
  const ids = toDelete.map(r => r.id)
  let deletedSpecs = 0
  let deletedDocs = 0
  let deletedFeatureConfigs = 0
  try {
    deletedSpecs = (await prisma.providerSpecialty.deleteMany({ where: { providerType: { in: toDelete.map(r => r.code) as any } } })).count
  } catch (e) {
    console.warn('  · ProviderSpecialty cleanup skipped:', (e as Error).message)
  }
  try {
    // RoleVerificationDocument links by providerRoleId
    deletedDocs = (await prisma.$executeRawUnsafe(
      `DELETE FROM "RoleVerificationDocument" WHERE "providerRoleId" = ANY($1::text[])`,
      ids
    )) as unknown as number
  } catch (e) {
    console.warn('  · RoleVerificationDocument cleanup skipped:', (e as Error).message)
  }
  try {
    deletedFeatureConfigs = (await prisma.roleFeatureConfig.deleteMany({ where: { userType: { in: toDelete.map(r => r.code) } } })).count
  } catch (e) {
    console.warn('  · RoleFeatureConfig cleanup skipped:', (e as Error).message)
  }

  const result = await prisma.providerRole.deleteMany({ where: { id: { in: ids } } })
  console.log(`\n✅ Deleted ${result.count} ProviderRole row(s)`)
  console.log(`   (cascaded: ${deletedSpecs} specialties, ${deletedDocs} verification docs, ${deletedFeatureConfigs} feature configs)\n`)
}

main()
  .catch(e => {
    console.error('❌ Cleanup failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
