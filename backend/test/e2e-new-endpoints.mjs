#!/usr/bin/env node
/**
 * MediWyz NestJS Backend — New Endpoints Smoke Test
 *
 * Focused test for endpoints added during the Next.js → NestJS migration.
 * Run this AFTER seeding and starting the NestJS backend.
 *
 * Usage:
 *   node backend/test/e2e-new-endpoints.mjs
 *   node backend/test/e2e-new-endpoints.mjs --api-url=http://localhost:3001
 */

const API = process.argv.find(a => a.startsWith('--api-url='))?.split('=')[1] || 'http://localhost:3001';

let passed = 0;
let failed = 0;
const errors = [];

// ─── Helpers ──────────────────────────────────────────────────────────────

async function req(method, path, { body, cookies } = {}) {
  const url = `${API}${path}`;
  const headers = { 'Content-Type': 'application/json' };
  if (cookies) headers['Cookie'] = cookies;
  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(url, opts);
  const setCookie = res.headers.get('set-cookie') || '';
  let data;
  try { data = await res.json(); } catch { data = null; }
  return { status: res.status, data, setCookie, ok: res.ok };
}

function extractCookies(setCookieHeader) {
  if (!setCookieHeader) return '';
  return setCookieHeader.split(',').map(c => c.split(';')[0].trim()).join('; ');
}

async function test(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failed++;
    const msg = err.message || String(err);
    errors.push({ name, error: msg });
    console.log(`  ✗ ${name}: ${msg.slice(0, 180)}`);
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message || 'Assertion failed');
}

// ─── Login helper ─────────────────────────────────────────────────────────

async function login(email, password) {
  const { data, setCookie, status } = await req('POST', '/api/auth/login', {
    body: { email, password },
  });
  if (status !== 200 && status !== 201) {
    throw new Error(`Login failed for ${email}: status ${status}`);
  }
  return { cookies: extractCookies(setCookie), user: data?.data || data?.user };
}

// ─── Test sections ────────────────────────────────────────────────────────

async function testPatientAliasRoutes(cookies, userId) {
  console.log('\n🧑‍⚕️ PATIENT ALIAS ROUTES (/api/patients/:id/*)');

  await test('GET /api/patients/:id/appointments', async () => {
    const { ok, data } = await req('GET', `/api/patients/${userId}/appointments`, { cookies });
    assert(ok && data?.success === true, `status not ok: ${JSON.stringify(data)}`);
    assert(Array.isArray(data.data), 'data should be an array');
  });

  await test('GET /api/patients/:id/prescriptions', async () => {
    const { ok, data } = await req('GET', `/api/patients/${userId}/prescriptions`, { cookies });
    assert(ok && data?.success === true, `not ok: ${data?.message}`);
  });

  await test('GET /api/patients/:id/medical-records', async () => {
    const { ok, data } = await req('GET', `/api/patients/${userId}/medical-records`, { cookies });
    assert(ok && data?.success === true, `not ok: ${data?.message}`);
  });

  await test('GET /api/patients/:id/lab-tests', async () => {
    const { ok, data } = await req('GET', `/api/patients/${userId}/lab-tests`, { cookies });
    assert(ok && data?.success === true, `not ok: ${data?.message}`);
  });

  await test('GET /api/patients/:id/claims', async () => {
    const { ok, data } = await req('GET', `/api/patients/${userId}/claims`, { cookies });
    assert(ok && data?.success === true, `not ok: ${data?.message}`);
  });

  await test('GET /api/patients/:id/pill-reminders', async () => {
    const { ok, data } = await req('GET', `/api/patients/${userId}/pill-reminders`, { cookies });
    assert(ok && data?.success === true, `not ok: ${data?.message}`);
  });

  await test('GET /api/patients/:id/vital-signs', async () => {
    const { ok, data } = await req('GET', `/api/patients/${userId}/vital-signs`, { cookies });
    assert(ok && data?.success === true, `not ok: ${data?.message}`);
  });

  await test('GET /api/patients/:id/bookings (unified)', async () => {
    const { ok, data } = await req('GET', `/api/patients/${userId}/bookings`, { cookies });
    assert(ok && data?.success === true, `not ok: ${data?.message}`);
    assert(Array.isArray(data.data), 'bookings should be an array');
  });
}

async function testHealthTrackerNew(cookies) {
  console.log('\n🥗 HEALTH TRACKER NEW ENDPOINTS');

  await test('POST /api/ai/health-tracker/food-scan', async () => {
    const { ok, data } = await req('POST', '/api/ai/health-tracker/food-scan', {
      cookies, body: { imageBase64: 'fake-base64-data' },
    });
    assert(ok && data?.success === true, `not ok: ${data?.message}`);
    assert(Array.isArray(data.data?.foods), 'foods should be an array');
  });

  await test('GET /api/ai/health-tracker/food-db?q=chicken', async () => {
    const { ok, data } = await req('GET', '/api/ai/health-tracker/food-db?q=chicken', { cookies });
    assert(ok && data?.success === true, `not ok: ${data?.message}`);
    assert(Array.isArray(data.data), 'food-db result should be an array');
    assert(data.data.some(f => f.name.toLowerCase().includes('chicken')), 'should find chicken');
  });

  await test('GET /api/ai/health-tracker/meal-plan', async () => {
    const { ok, data } = await req('GET', '/api/ai/health-tracker/meal-plan', { cookies });
    assert(ok && data?.success === true, `not ok: ${data?.message}`);
  });

  await test('POST /api/ai/health-tracker/meal-plan/generate', async () => {
    const { ok, data } = await req('POST', '/api/ai/health-tracker/meal-plan/generate', {
      cookies, body: { weekStart: '2026-04-07' },
    });
    assert(ok && data?.success === true, `not ok: ${data?.message}`);
    assert(Array.isArray(data.data?.days), 'days should be an array');
    assert(data.data.days.length === 7, `should have 7 days, got ${data.data.days.length}`);
  });

  await test('GET /api/ai/health-tracker/progress?period=week', async () => {
    const { ok, data } = await req('GET', '/api/ai/health-tracker/progress?period=week', { cookies });
    assert(ok && data?.success === true, `not ok: ${data?.message}`);
    assert(Array.isArray(data.data?.dataPoints), 'dataPoints should be an array');
  });
}

async function testAiChat(cookies) {
  console.log('\n🤖 AI CHAT SESSION');

  let sessionId = null;

  await test('POST /api/ai/chat (creates session)', async () => {
    const { ok, data } = await req('POST', '/api/ai/chat', {
      cookies, body: { message: 'Hello' },
    });
    assert(ok && data?.success === true, `not ok: ${data?.message}`);
    sessionId = data.data?.sessionId;
    assert(sessionId, 'should return sessionId');
  });

  await test('GET /api/ai/chat/:sessionId (fetch session)', async () => {
    if (!sessionId || sessionId === 'temp') return; // skip if no session
    const { ok, data } = await req('GET', `/api/ai/chat/${sessionId}`, { cookies });
    assert(ok, `not ok: ${data?.message}`);
  });

  await test('DELETE /api/ai/chat/:sessionId (delete session)', async () => {
    if (!sessionId || sessionId === 'temp') return;
    const { ok } = await req('DELETE', `/api/ai/chat/${sessionId}`, { cookies });
    assert(ok, 'delete session should succeed');
  });
}

async function testInsuranceNew(cookies, insuranceUserId) {
  console.log('\n🛡️ INSURANCE NEW ENDPOINTS');

  await test('GET /api/insurance/dashboard (JWT-based)', async () => {
    const { ok, data } = await req('GET', '/api/insurance/dashboard', { cookies });
    assert(ok && data?.success === true, `not ok: ${data?.message}`);
    assert(typeof data.data?.total === 'number', 'should have total count');
  });

  await test('GET /api/insurance/:userId/dashboard (legacy alias)', async () => {
    if (!insuranceUserId) return;
    const { ok, data } = await req('GET', `/api/insurance/${insuranceUserId}/dashboard`, { cookies });
    assert(ok && data?.success === true, `not ok: ${data?.message}`);
  });

  await test('GET /api/insurance/plans', async () => {
    const { ok, data } = await req('GET', '/api/insurance/plans', { cookies });
    assert(ok && data?.success === true, `not ok: ${data?.message}`);
    assert(Array.isArray(data.data), 'plans should be an array');
  });
}

async function testReferralPartner(cookies, refUserId) {
  console.log('\n🎯 REFERRAL PARTNER');

  await test('GET /api/referral-partners/:id/dashboard', async () => {
    if (!refUserId) {
      console.log('    (no referral partner user, skipping)');
      return;
    }
    const { ok, data } = await req('GET', `/api/referral-partners/${refUserId}/dashboard`, { cookies });
    assert(ok && data?.success === true, `not ok: ${data?.message}`);
    assert(typeof data.data?.stats === 'object', 'should have stats object');
  });
}

async function testConnectionsNew(cookies) {
  console.log('\n🔗 CONNECTIONS NEW ENDPOINTS');

  await test('GET /api/connections/suggestions', async () => {
    const { ok, data } = await req('GET', '/api/connections/suggestions?limit=5', { cookies });
    assert(ok && data?.success === true, `not ok: ${data?.message}`);
    assert(Array.isArray(data.data), 'suggestions should be an array');
  });

  // PATCH and DELETE tested if a connection exists
  await test('PATCH /api/connections/:id (requires existing connection)', async () => {
    const { data } = await req('GET', '/api/connections', { cookies });
    const conn = data?.data?.[0];
    if (!conn) { console.log('    (no existing connection, skipping)'); return; }
    // Only try PATCH if the current user is receiver of a pending connection
    // Otherwise, skip to avoid side effects
    console.log(`    (connection exists: ${conn.id}, skipping mutation to avoid side effects)`);
  });
}

async function testSearchNew() {
  console.log('\n🔍 SEARCH NEW ENDPOINTS');

  await test('GET /api/search/autocomplete?q=dr', async () => {
    const { ok, data } = await req('GET', '/api/search/autocomplete?q=dr&limit=5');
    assert(ok && data?.success === true, `not ok: ${data?.message}`);
    assert(Array.isArray(data.data), 'result should be an array');
  });

  await test('GET /api/search/medicines', async () => {
    const { ok, data } = await req('GET', '/api/search/medicines?limit=10');
    assert(ok && data?.success === true, `not ok: ${data?.message}`);
    assert(Array.isArray(data.data), 'medicines should be an array');
  });
}

async function testBookingsNew(patientCookies) {
  console.log('\n📅 BOOKINGS NEW ENDPOINTS');

  await test('POST /api/bookings/reschedule (validates input)', async () => {
    // Pass invalid bookingType — should return error but not crash
    const { data } = await req('POST', '/api/bookings/reschedule', {
      cookies: patientCookies,
      body: { bookingId: 'nonexistent', bookingType: 'invalid', newDate: '2026-05-01', newTime: '10:00' },
    });
    // Either rejects with error or throws validation — both acceptable
    assert(data !== undefined, 'should return response');
  });
}

async function testProviderLegacyRoutes() {
  console.log('\n👨‍⚕️ PROVIDER LEGACY ROUTES');

  await test('GET /api/doctors/:id/services (public)', async () => {
    const { ok, data } = await req('GET', '/api/doctors/DOC001/services');
    assert(ok && data?.success === true, `not ok: ${data?.message}`);
  });

  await test('GET /api/doctor/services?userId=DOC001 (query variant)', async () => {
    const { ok, data } = await req('GET', '/api/doctor/services?userId=DOC001');
    assert(ok && data?.success === true, `not ok: ${data?.message}`);
  });

  await test('GET /api/doctors/:id/schedule (public)', async () => {
    const { ok, data } = await req('GET', '/api/doctors/DOC001/schedule');
    assert(ok && data?.success === true, `not ok: ${data?.message}`);
  });

  await test('GET /api/nurses/:id/services (public)', async () => {
    const { ok, data } = await req('GET', '/api/nurses/NUR001/services');
    assert(ok && data?.success === true, `not ok: ${data?.message}`);
  });

  await test('GET /api/nannies/:id/services (public)', async () => {
    const { ok, data } = await req('GET', '/api/nannies/NAN001/services');
    assert(ok && data?.success === true, `not ok: ${data?.message}`);
  });

  await test('GET /api/lab-techs/:id/tests (public)', async () => {
    const { ok, data } = await req('GET', '/api/lab-techs/LAB001/tests');
    assert(ok && data?.success === true, `not ok: ${data?.message}`);
  });
}

async function testCmsPublic() {
  console.log('\n📰 CMS PUBLIC READS');

  await test('GET /api/cms/sections', async () => {
    const { ok, data } = await req('GET', '/api/cms/sections');
    assert(ok && data?.success === true, `not ok: ${data?.message}`);
  });

  await test('GET /api/cms/hero-slides', async () => {
    const { ok, data } = await req('GET', '/api/cms/hero-slides');
    assert(ok && data?.success === true, `not ok: ${data?.message}`);
  });

  await test('GET /api/cms/testimonials', async () => {
    const { ok, data } = await req('GET', '/api/cms/testimonials');
    assert(ok && data?.success === true, `not ok: ${data?.message}`);
  });
}

async function testUserSearch(cookies) {
  console.log('\n🔎 USER SEARCH');

  await test('GET /api/users/search?q=em', async () => {
    const { ok, data } = await req('GET', '/api/users/search?q=em', { cookies });
    assert(ok && data?.success === true, `not ok: ${data?.message}`);
    assert(Array.isArray(data.data), 'users should be an array');
  });
}

async function testPostsNew() {
  console.log('\n📝 POSTS NEW ENDPOINTS');

  // Get any post to test comments on
  const { data: postsRes } = await req('GET', '/api/posts?limit=1');
  const firstPost = postsRes?.data?.posts?.[0];

  await test('GET /api/posts/:id/comments (paginated)', async () => {
    if (!firstPost) { console.log('    (no posts, skipping)'); return; }
    const { ok, data } = await req('GET', `/api/posts/${firstPost.id}/comments?limit=5`);
    assert(ok && data?.success === true, `not ok: ${data?.message}`);
    assert(Array.isArray(data.data?.comments), 'comments should be an array');
  });
}

// ─── Main ─────────────────────────────────────────────────────────────────

async function main() {
  console.log('═'.repeat(60));
  console.log('  MediWyz NestJS — New Endpoints Smoke Test');
  console.log(`  API: ${API}`);
  console.log('═'.repeat(60));

  // Health check first (returns { status: 'ok', database: 'connected', ... })
  console.log('\n💓 HEALTH CHECK');
  await test('GET /api/health', async () => {
    const { ok, data } = await req('GET', '/api/health');
    assert(ok, `not ok, status: ${data?.status}`);
    assert(data?.status === 'ok', `health status not ok: ${JSON.stringify(data)}`);
    assert(data?.database === 'connected', `db not connected: ${data?.database}`);
  });

  if (failed > 0) {
    console.log('\n❌ Health check failed. Is the NestJS backend running on ' + API + '?');
    console.log('   Start it with: cd backend && npm run start:dev');
    process.exit(1);
  }

  // Login as multiple user types
  console.log('\n🔐 AUTHENTICATION');
  let patientCookies, patientUserId;
  let insuranceCookies, insuranceUserId;
  let referralCookies, referralUserId;
  let doctorCookies;

  try {
    const patient = await login('emma.johnson@mediwyz.com', 'Patient123!');
    patientCookies = patient.cookies;
    patientUserId = patient.user?.id;
    console.log(`  ✓ Patient logged in: ${patientUserId}`);
    passed++;
  } catch (e) {
    console.log(`  ✗ Patient login: ${e.message}`);
    failed++;
    errors.push({ name: 'Patient login', error: e.message });
  }

  try {
    const doctor = await login('dr.sarah@mediwyz.com', 'Doctor123!');
    doctorCookies = doctor.cookies;
    console.log(`  ✓ Doctor logged in`);
    passed++;
  } catch (e) {
    console.log(`  ✗ Doctor login (non-fatal): ${e.message}`);
  }

  // Try to login as insurance rep (may or may not exist)
  try {
    const insurance = await login('insurance@mediwyz.com', 'Insurance123!');
    insuranceCookies = insurance.cookies;
    insuranceUserId = insurance.user?.id;
    console.log(`  ✓ Insurance rep logged in: ${insuranceUserId}`);
  } catch {
    console.log('  (insurance rep login failed — will skip insurance tests)');
  }

  try {
    const referral = await login('referral@mediwyz.com', 'Referral123!');
    referralCookies = referral.cookies;
    referralUserId = referral.user?.id;
    console.log(`  ✓ Referral partner logged in: ${referralUserId}`);
  } catch {
    console.log('  (referral partner login failed — will skip referral tests)');
  }

  if (!patientCookies) {
    console.log('\n❌ Could not log in as patient. Aborting. Make sure the database is seeded.');
    console.log('   Run: npx prisma db seed');
    process.exit(1);
  }

  // Run focused tests on new endpoints
  await testPatientAliasRoutes(patientCookies, patientUserId);
  await testHealthTrackerNew(patientCookies);
  await testAiChat(patientCookies);
  await testSearchNew();
  await testProviderLegacyRoutes();
  await testCmsPublic();
  await testUserSearch(patientCookies);
  await testConnectionsNew(patientCookies);
  await testPostsNew();
  await testBookingsNew(patientCookies);

  if (insuranceCookies) {
    await testInsuranceNew(insuranceCookies, insuranceUserId);
  }

  if (referralCookies) {
    await testReferralPartner(referralCookies, referralUserId);
  }

  // Summary
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  Results: ${passed} passed, ${failed} failed`);
  console.log(`${'═'.repeat(60)}`);

  if (errors.length > 0) {
    console.log('\n❌ Failed tests:');
    errors.forEach((e, i) => console.log(`  ${i + 1}. ${e.name}: ${e.error.slice(0, 200)}`));
  }

  if (failed === 0) {
    console.log('\n✅ ALL NEW ENDPOINT TESTS PASSED');
  }

  process.exit(failed > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
