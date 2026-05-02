#!/usr/bin/env node
/**
 * E2E Tests for the 27 missing endpoints.
 * Run BEFORE implementation to see what fails, then implement to make them pass.
 */
const API = process.argv.find(a => a.startsWith('--api-url='))?.split('=')[1] || 'http://localhost:3001';
let passed = 0, failed = 0;
const errors = [];

async function req(method, path, { body, cookies } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (cookies) headers['Cookie'] = cookies;
  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${API}${path}`, opts);
  const setCookie = res.headers.get('set-cookie') || '';
  let data; try { data = await res.json(); } catch { data = null; }
  return { status: res.status, data, setCookie, ok: res.ok };
}
function extractCookies(h) { return h ? h.split(',').map(c => c.split(';')[0].trim()).join('; ') : ''; }
async function test(name, fn) {
  try { await fn(); passed++; console.log(`  ✓ ${name}`); }
  catch (err) { failed++; errors.push({ name, error: err.message }); console.log(`  ✗ ${name}: ${err.message?.slice(0, 120)}`); }
}
function assert(c, m) { if (!c) throw new Error(m || 'Assertion failed'); }

async function main() {
  console.log(`\n${'═'.repeat(60)}\n  27 Missing Endpoints — E2E Tests\n  API: ${API}\n${'═'.repeat(60)}`);

  // Login as admin and patient
  const { setCookie: adminCk } = await req('POST', '/api/auth/login', { body: { email: 'hassan.doorgakant@healthways.mu', password: 'Admin123!' } });
  const adminCookies = extractCookies(adminCk);
  await new Promise(r => setTimeout(r, 1500));
  const { setCookie: patCk } = await req('POST', '/api/auth/login', { body: { email: 'emma.johnson@mediwyz.com', password: 'Patient123!' } });
  const patCookies = extractCookies(patCk);

  // ─── ADMIN ENDPOINTS ──────────────────────────────────────────────────
  console.log('\n👑 Admin Endpoints');

  await test('GET /admin/accounts — list users', async () => {
    const { data } = await req('GET', '/api/admin/accounts', { cookies: adminCookies });
    assert(data.success, `Failed: ${data.message}`);
    assert(Array.isArray(data.data), 'data should be array');
  });
  await test('GET /admin/admins — list regional admins', async () => {
    const { data } = await req('GET', '/api/admin/admins', { cookies: adminCookies });
    assert(data.success, `Failed: ${data.message}`);
  });
  await test('GET /admin/alerts — system alerts', async () => {
    const { data } = await req('GET', '/api/admin/alerts', { cookies: adminCookies });
    assert(data.success, `Failed: ${data.message}`);
  });
  await test('GET /admin/commission-config', async () => {
    const { data } = await req('GET', '/api/admin/commission-config', { cookies: adminCookies });
    assert(data.success, `Failed: ${data.message}`);
  });
  await test('GET /admin/metrics', async () => {
    const { data } = await req('GET', '/api/admin/metrics', { cookies: adminCookies });
    assert(data.success, `Failed: ${data.message}`);
    assert(data.data.users !== undefined, 'Missing users metric');
  });
  await test('GET /admin/platform-commission', async () => {
    const { data } = await req('GET', '/api/admin/platform-commission', { cookies: adminCookies });
    assert(data.success, `Failed: ${data.message}`);
  });
  await test('GET /admin/regional-activity', async () => {
    const { data } = await req('GET', '/api/admin/regional-activity', { cookies: adminCookies });
    assert(data.success, `Failed: ${data.message}`);
  });
  await test('GET /admin/security', async () => {
    const { data } = await req('GET', '/api/admin/security', { cookies: adminCookies });
    assert(data.success, `Failed: ${data.message}`);
  });
  await test('GET /admin/system-health', async () => {
    const { data } = await req('GET', '/api/admin/system-health', { cookies: adminCookies });
    assert(data.success, `Failed: ${data.message}`);
    assert(data.data.overallHealth, 'Missing overallHealth');
  });

  // ─── AI HEALTH TRACKER ────────────────────────────────────────────────
  console.log('\n🏃 AI Health Tracker');

  await test('GET /ai/health-tracker/profile — auto-creates', async () => {
    const { data } = await req('GET', '/api/ai/health-tracker/profile', { cookies: patCookies });
    assert(data.success, `Failed: ${data.message}`);
    assert(data.data.targetCalories !== undefined, 'Missing targetCalories');
  });
  await test('PUT /ai/health-tracker/profile — update', async () => {
    const { data } = await req('PUT', '/api/ai/health-tracker/profile', { cookies: patCookies, body: { weightKg: 70, heightCm: 175, age: 30 } });
    assert(data.success, `Failed: ${data.message}`);
  });
  await test('POST /ai/health-tracker/food — log food', async () => {
    const { data } = await req('POST', '/api/ai/health-tracker/food', { cookies: patCookies, body: { name: 'Rice and curry', mealType: 'lunch', calories: 450, protein: 15, carbs: 60, fat: 12 } });
    assert(data.success, `Failed: ${data.message}`);
  });
  await test('GET /ai/health-tracker/food — get today', async () => {
    const { data } = await req('GET', '/api/ai/health-tracker/food', { cookies: patCookies });
    assert(data.success, `Failed: ${data.message}`);
    assert(data.data.totalCalories !== undefined, 'Missing totalCalories');
  });
  await test('POST /ai/health-tracker/exercise — log exercise', async () => {
    const { data } = await req('POST', '/api/ai/health-tracker/exercise', { cookies: patCookies, body: { exerciseType: 'Running', durationMin: 30, caloriesBurned: 300, intensity: 'moderate' } });
    assert(data.success, `Failed: ${data.message}`);
  });
  await test('GET /ai/health-tracker/exercise — get today', async () => {
    const { data } = await req('GET', '/api/ai/health-tracker/exercise', { cookies: patCookies });
    assert(data.success, `Failed: ${data.message}`);
    assert(data.data.totalCaloriesBurned !== undefined, 'Missing totalCaloriesBurned');
  });
  await test('POST /ai/health-tracker/water — log water', async () => {
    const { data } = await req('POST', '/api/ai/health-tracker/water', { cookies: patCookies, body: { amountMl: 250 } });
    assert(data.success, `Failed: ${data.message}`);
  });
  await test('GET /ai/health-tracker/water — get today', async () => {
    const { data } = await req('GET', '/api/ai/health-tracker/water', { cookies: patCookies });
    assert(data.success, `Failed: ${data.message}`);
    assert(data.data.totalMl !== undefined, 'Missing totalMl');
  });
  await test('POST /ai/health-tracker/sleep — log sleep', async () => {
    const { data } = await req('POST', '/api/ai/health-tracker/sleep', { cookies: patCookies, body: { durationMin: 480, quality: 'good', sleepStart: '2026-04-03T23:00:00Z', sleepEnd: '2026-04-04T07:00:00Z' } });
    assert(data.success, `Failed: ${data.message}`);
  });
  await test('GET /ai/health-tracker/sleep — get today', async () => {
    const { data } = await req('GET', '/api/ai/health-tracker/sleep', { cookies: patCookies });
    assert(data.success, `Failed: ${data.message}`);
  });
  await test('GET /ai/health-tracker/dashboard — daily summary', async () => {
    const { data } = await req('GET', '/api/ai/health-tracker/dashboard', { cookies: patCookies });
    assert(data.success, `Failed: ${data.message}`);
    assert(data.data.caloriesConsumed !== undefined, 'Missing caloriesConsumed');
    assert(data.data.waterConsumedMl !== undefined, 'Missing waterConsumedMl');
  });
  await test('POST /ai/support — public AI support', async () => {
    const { data } = await req('POST', '/api/ai/support', { body: { message: 'How do I book a doctor?' } });
    assert(data.success, `Failed: ${data.message}`);
    assert(data.data.response, 'Missing response');
  });

  // ─── UPLOAD ───────────────────────────────────────────────────────────
  console.log('\n📁 Upload (local Docker volume)');

  await test('POST /upload/local — upload file', async () => {
    // Can't easily test multipart in this script — test the endpoint exists and returns proper error
    const { status } = await req('POST', '/api/upload/local', { cookies: patCookies, body: {} });
    assert(status !== 404, 'Endpoint not found');
  });
  await test('POST /upload/registration — public upload', async () => {
    const { status } = await req('POST', '/api/upload/registration', { body: {} });
    assert(status !== 404, 'Endpoint not found');
  });
  await test('POST /upload/cms — admin upload', async () => {
    const { status } = await req('POST', '/api/upload/cms', { cookies: adminCookies, body: {} });
    assert(status !== 404, 'Endpoint not found');
  });

  // ─── CORPORATE ────────────────────────────────────────────────────────
  console.log('\n🏢 Corporate');

  await new Promise(r => setTimeout(r, 1500));
  const { setCookie: corpCk } = await req('POST', '/api/auth/login', { body: { email: 'anil.doobur@healthways.mu', password: 'Corporate123!' } });
  const corpCookies = extractCookies(corpCk);

  await test('GET /corporate/CORP001/dashboard', async () => {
    const { data } = await req('GET', '/api/corporate/CORP001/dashboard', { cookies: corpCookies });
    assert(data.success, `Failed: ${data.message}`);
  });
  await test('GET /corporate/CORP001/employees', async () => {
    const { data } = await req('GET', '/api/corporate/CORP001/employees', { cookies: corpCookies });
    assert(data.success, `Failed: ${data.message}`);
  });
  await test('GET /corporate/CORP001/members', async () => {
    const { data } = await req('GET', '/api/corporate/CORP001/members', { cookies: corpCookies });
    assert(data.success, `Failed: ${data.message}`);
  });

  // ─── SUMMARY ──────────────────────────────────────────────────────────
  console.log(`\n${'═'.repeat(60)}\n  Results: ${passed} passed, ${failed} failed\n${'═'.repeat(60)}`);
  if (errors.length > 0) {
    console.log('\n❌ Failed:');
    errors.forEach((e, i) => console.log(`  ${i + 1}. ${e.name}: ${e.error.slice(0, 150)}`));
  } else console.log('\n✅ ALL 27 ENDPOINT TESTS PASSED');
  process.exit(failed > 0 ? 1 : 0);
}
main().catch(err => { console.error('Fatal:', err); process.exit(1); });
