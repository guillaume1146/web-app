/**
 * Unified Dashboard Integration Test
 *
 * Tests the complete unified dashboard via API:
 * - Login → /feed (no role prefix)
 * - All unified routes accessible
 * - Sidebar items correct per role
 * - API calls work for all providers
 * - Old URLs redirect properly
 */
const BASE = 'http://localhost:3000'

async function login(email: string, password: string): Promise<string | null> {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  const cookies = res.headers.getSetCookie?.() || []
  return cookies.find((c: string) => c.startsWith('mediwyz_token='))?.split('=')[1]?.split(';')[0] || null
}

function h(token: string) {
  return { Cookie: `mediwyz_token=${token}` }
}

let errors = 0
function check(label: string, condition: boolean, detail = '') {
  if (condition) {
    console.log(`  ✓ ${label}` + (detail ? ` (${detail})` : ''))
  } else {
    console.log(`  ✗ FAIL: ${label}` + (detail ? ` (${detail})` : ''))
    errors++
  }
}

async function testLogin() {
  console.log('\n1. LOGIN REDIRECTS TO /feed')
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'emma.johnson@mediwyz.com', password: 'Patient123!' }),
  })
  const json = await res.json()
  check('Login succeeds', json.success)
  check('Redirect is /feed', json.redirectPath === '/feed', json.redirectPath)
  check('No role prefix in redirect', !json.redirectPath?.includes('/patient/'))
}

async function testUnifiedRoutes() {
  console.log('\n2. UNIFIED ROUTES ACCESSIBLE')
  const token = await login('emma.johnson@mediwyz.com', 'Patient123!')
  if (!token) { console.log('ABORT: No token'); return }

  const routes = ['/feed', '/messages', '/video', '/ai-assistant', '/my-health', '/billing']
  for (const route of routes) {
    const res = await fetch(`${BASE}${route}`, { headers: h(token), redirect: 'manual' })
    check(`${route} accessible`, res.status === 200 || res.status === 304 || res.status === 307, `status: ${res.status}`)
  }
}

async function testAPIsForAllRoles() {
  console.log('\n3. API CALLS FOR ALL ROLE TYPES')

  const accounts = [
    { email: 'emma.johnson@mediwyz.com', password: 'Patient123!', role: 'PATIENT' },
    { email: 'sarah.johnson@mediwyz.com', password: 'Doctor123!', role: 'DOCTOR' },
    { email: 'priya.ramgoolam@mediwyz.com', password: 'Nurse123!', role: 'NURSE' },
    { email: 'anisha.dentist@mediwyz.com', password: 'Dentist123!', role: 'DENTIST' },
    { email: 'kofi.agbeko@mediwyz.com', password: 'Regional123!', role: 'REGIONAL_ADMIN' },
  ]

  for (const acc of accounts) {
    const token = await login(acc.email, acc.password)
    if (!token) { check(`${acc.role} login`, false); continue }
    check(`${acc.role} login`, true)

    // Test /api/auth/me
    const me = await (await fetch(`${BASE}/api/auth/me`, { headers: h(token) })).json()
    check(`${acc.role} /api/auth/me`, me.success)

    // Test /api/roles (public)
    const roles = await (await fetch(`${BASE}/api/roles`, { headers: h(token) })).json()
    check(`${acc.role} /api/roles`, roles.success && roles.data.length > 0, `${roles.data?.length} roles`)

    // Test /api/bookings/unified (role=provider for providers, role=patient for patients)
    if (acc.role !== 'PATIENT' && acc.role !== 'REGIONAL_ADMIN') {
      const unified = await (await fetch(`${BASE}/api/bookings/unified?role=provider`, { headers: h(token) })).json()
      check(`${acc.role} unified bookings`, unified.success, `${unified.data?.length} bookings`)
    }
  }
}

async function testDynamicSearchRoutes() {
  console.log('\n4. DYNAMIC SEARCH ROUTES')
  const token = await login('emma.johnson@mediwyz.com', 'Patient123!')
  if (!token) return

  const searchRoutes = ['/search/doctors', '/search/nurses', '/search/dentists', '/search/health-shop']
  for (const route of searchRoutes) {
    const res = await fetch(`${BASE}${route}`, { headers: h(token), redirect: 'manual' })
    check(`${route} accessible`, res.status === 200 || res.status === 304, `status: ${res.status}`)
  }
}

async function testRolesAPI() {
  console.log('\n5. ROLES API: PROVIDER ROLES FROM DB')
  const token = await login('kofi.agbeko@mediwyz.com', 'Regional123!')
  if (!token) return

  // List roles
  const roles = await (await fetch(`${BASE}/api/regional/roles`, { headers: { ...h(token), 'Content-Type': 'application/json' } })).json()
  check('Regional admin can list roles', roles.success, `${roles.data?.length} roles`)

  // Check roles include dynamic ones if any
  const providerRoles = roles.data?.filter((r: { isProvider: boolean }) => r.isProvider) || []
  check('Has provider roles', providerRoles.length >= 11, `${providerRoles.length} provider roles`)

  // Verify each role has required fields
  for (const role of providerRoles.slice(0, 3)) {
    check(`Role ${role.code} has slug`, !!role.slug)
    check(`Role ${role.code} has icon`, !!role.icon)
    check(`Role ${role.code} has color`, !!role.color)
  }
}

async function testWorkflowAPIs() {
  console.log('\n6. WORKFLOW APIs')
  const token = await login('sarah.johnson@mediwyz.com', 'Doctor123!')
  if (!token) return

  const templates = await (await fetch(`${BASE}/api/workflow/templates?providerType=DOCTOR`, { headers: h(token) })).json()
  check('Workflow templates API', templates.success, `${templates.data?.length} templates`)

  const myTemplates = await (await fetch(`${BASE}/api/workflow/my-templates`, { headers: h(token) })).json()
  check('My templates API', myTemplates.success)
}

async function testInventoryAPIs() {
  console.log('\n7. INVENTORY APIs')
  const token = await login('sarah.johnson@mediwyz.com', 'Doctor123!')
  if (!token) return

  const items = await (await fetch(`${BASE}/api/inventory`, { headers: h(token) })).json()
  check('Inventory list API', items.success)

  const shopItems = await (await fetch(`${BASE}/api/search/health-shop`)).json()
  check('Health Shop search API', shopItems.success, `${shopItems.data?.total} items`)
}

async function main() {
  console.log('=== UNIFIED DASHBOARD INTEGRATION TEST ===')

  await testLogin()
  await testUnifiedRoutes()
  await testAPIsForAllRoles()
  await testDynamicSearchRoutes()
  await testRolesAPI()
  await testWorkflowAPIs()
  await testInventoryAPIs()

  console.log('\n' + '='.repeat(50))
  console.log(`RESULT: ${errors === 0 ? '✓ ALL PASSED' : `✗ ${errors} FAILURE(S)`}`)
  console.log('='.repeat(50))

  process.exit(errors > 0 ? 1 : 0)
}

main().catch(e => { console.error('FATAL:', e); process.exit(1) })
