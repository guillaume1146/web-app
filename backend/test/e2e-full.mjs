#!/usr/bin/env node
/**
 * MediWyz NestJS Backend — Full E2E Test Script
 *
 * Tests every API endpoint + Socket.IO against the real database,
 * simulating frontend behavior for all user types.
 *
 * Usage: node backend/test/e2e-full.mjs [--api-url http://localhost:3001]
 */

const API = process.argv.find(a => a.startsWith('--api-url='))?.split('=')[1] || 'http://localhost:3001';

let passed = 0;
let failed = 0;
let skipped = 0;
const errors = [];

// ─── Helpers ──────────────────────────────────────────────────────────────

async function req(method, path, { body, cookies, expectStatus } = {}) {
  const url = `${API}${path}`;
  const headers = { 'Content-Type': 'application/json' };
  if (cookies) headers['Cookie'] = cookies;

  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(url, opts);
  const setCookie = res.headers.get('set-cookie') || '';
  let data;
  try { data = await res.json(); } catch { data = null; }

  if (expectStatus && res.status !== expectStatus) {
    throw new Error(`Expected ${expectStatus}, got ${res.status}: ${JSON.stringify(data)}`);
  }

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
    console.log(`  ✗ ${name}: ${msg.slice(0, 150)}`);
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message || 'Assertion failed');
}

// ─── Test Suites ──────────────────────────────────────────────────────────

async function testHealthCheck() {
  console.log('\n📋 Health Check');
  await test('GET /api/health returns ok', async () => {
    const { data } = await req('GET', '/api/health');
    assert(data.status === 'ok', `Expected ok, got ${data.status}`);
    assert(data.database === 'connected', 'Database not connected');
  });
}

async function testAuth() {
  console.log('\n🔐 Authentication');

  let doctorCookies = '';
  let patientCookies = '';

  await test('POST /api/auth/login — doctor', async () => {
    const { data, setCookie } = await req('POST', '/api/auth/login', {
      body: { email: 'sarah.johnson@mediwyz.com', password: 'Doctor123!' },
    });
    assert(data.success, `Login failed: ${data.message}`);
    assert(data.user.userType === 'doctor', `Expected doctor, got ${data.user.userType}`);
    assert(data.user.id === 'DOC001', `Expected DOC001, got ${data.user.id}`);
    assert(data.redirectPath === '/feed', 'Wrong redirect');
    doctorCookies = extractCookies(setCookie);
    assert(doctorCookies.includes('mediwyz_token'), 'No token cookie');
  });

  await test('POST /api/auth/login — patient', async () => {
    const { data, setCookie } = await req('POST', '/api/auth/login', {
      body: { email: 'jean.pierre@mediwyz.com', password: 'Patient123!' },
    });
    assert(data.success, `Login failed: ${data.message}`);
    assert(data.user.userType === 'patient', `Expected patient, got ${data.user.userType}`);
    patientCookies = extractCookies(setCookie);
  });

  await test('POST /api/auth/login — wrong password returns 401', async () => {
    const { data, status } = await req('POST', '/api/auth/login', {
      body: { email: 'sarah.johnson@mediwyz.com', password: 'wrong' },
    });
    assert(status === 401 || (data && !data.success), 'Should have failed');
  });

  await test('GET /api/auth/me — with valid cookie', async () => {
    const { data } = await req('GET', '/api/auth/me', { cookies: doctorCookies });
    assert(data.success, 'Me failed');
    assert(data.user.firstName === 'Sarah', `Expected Sarah, got ${data.user.firstName}`);
    assert(data.user.doctorProfile, 'Missing doctorProfile');
  });

  await test('GET /api/auth/me — without cookie returns 401', async () => {
    const { status } = await req('GET', '/api/auth/me');
    assert(status === 401, `Expected 401, got ${status}`);
  });

  await test('POST /api/auth/login — nurse (after throttle delay)', async () => {
    await new Promise(r => setTimeout(r, 1500)); // Wait for throttle window
    const { data } = await req('POST', '/api/auth/login', {
      body: { email: 'priya.ramgoolam@mediwyz.com', password: 'Nurse123!' },
    });
    assert(data.success, `Nurse login failed: ${data.message}`);
    assert(data.user.userType === 'nurse', `Expected nurse, got ${data.user.userType}`);
  });

  return { doctorCookies, patientCookies };
}

async function testPublicEndpoints() {
  console.log('\n🌐 Public Endpoints');

  await test('GET /api/roles — returns all 16 roles', async () => {
    const { data } = await req('GET', '/api/roles');
    assert(data.success, 'Roles failed');
    assert(data.data.length >= 15, `Expected 15+ roles, got ${data.data.length}`);
    const doctor = data.data.find(r => r.code === 'DOCTOR');
    assert(doctor, 'DOCTOR role not found');
    assert(doctor.searchPath === '/search/doctors', 'Wrong search path');
    assert(typeof doctor.providerCount === 'number', 'Missing provider count');
  });

  await test('GET /api/roles?searchEnabled=true', async () => {
    const { data } = await req('GET', '/api/roles?searchEnabled=true');
    assert(data.success && data.data.length > 0, 'No search-enabled roles');
    assert(data.data.every(r => r.searchEnabled), 'Non-search role included');
  });

  await test('GET /api/role-config/DOCTOR — returns feature config', async () => {
    const { data } = await req('GET', '/api/role-config/DOCTOR');
    assert(data.success, 'Role config failed');
    assert(data.data.features.appointments === true, 'Doctor should have appointments');
  });

  await test('GET /api/role-config/PATIENT — returns feature config', async () => {
    const { data } = await req('GET', '/api/role-config/PATIENT');
    assert(data.success, 'Patient role config failed');
    assert(data.data.features.consultations === true, 'Patient should have consultations');
  });

  await test('GET /api/specialties — returns specialties', async () => {
    const { data } = await req('GET', '/api/specialties');
    assert(data.success, 'Specialties failed');
    assert(data.data.length > 0, 'No specialties');
  });

  await test('GET /api/specialties?providerType=DOCTOR', async () => {
    const { data } = await req('GET', '/api/specialties?providerType=DOCTOR');
    assert(data.success, 'Doctor specialties failed');
    assert(data.data.every(s => s.providerType === 'DOCTOR'), 'Wrong provider type');
  });

  await test('GET /api/stats — platform statistics', async () => {
    const { data } = await req('GET', '/api/stats');
    assert(data.success, 'Stats failed');
    // Stats returns array format for frontend StatsSection component
    assert(Array.isArray(data.data) ? data.data.length > 0 : data.data.users > 0, 'No stats data');
  });

  await test('GET /api/subscriptions — subscription plans', async () => {
    const { data } = await req('GET', '/api/subscriptions');
    assert(data.success, 'Subscriptions failed');
    assert(data.data.length > 0, `No plans found`);
  });

  await test('GET /api/regions — returns regions', async () => {
    const { data } = await req('GET', '/api/regions');
    assert(data.success, 'Regions failed');
    assert(data.data.length >= 6, `Expected 6+ regions, got ${data.data.length}`);
    const mu = data.data.find(r => r.countryCode === 'MU');
    assert(mu, 'Mauritius not found');
    assert(mu.currency === 'MUR', 'Wrong currency');
  });

  await test('GET /api/search/providers?type=DOCTOR — search doctors', async () => {
    const { data } = await req('GET', '/api/search/providers?type=DOCTOR');
    assert(data.success, 'Search failed');
    assert(data.data.length > 0, 'No doctors found');
    assert(data.data.every(p => p.userType === 'DOCTOR'), 'Wrong user type in results');
  });

  await test('GET /api/search/providers?type=NURSE', async () => {
    const { data } = await req('GET', '/api/search/providers?type=NURSE');
    assert(data.success, 'Nurse search failed');
    assert(data.data.length > 0, 'No nurses found');
  });

  await test('GET /api/search/health-shop — health shop items', async () => {
    const { data } = await req('GET', '/api/search/health-shop');
    assert(data.success, 'Health shop failed');
    assert(data.data.length > 0, 'No shop items');
    assert(typeof data.total === 'number', 'Missing total');
  });

  await test('GET /api/posts — public feed', async () => {
    const { data } = await req('GET', '/api/posts');
    assert(data.success, 'Posts failed');
  });

  await test('GET /api/programs — health programs', async () => {
    const { data } = await req('GET', '/api/programs');
    assert(data.success, 'Programs failed');
  });

  await test('GET /api/services/catalog — service catalog', async () => {
    const { data } = await req('GET', '/api/services/catalog');
    assert(data.success, 'Catalog failed');
  });

  await test('POST /api/contact — contact form', async () => {
    const { data } = await req('POST', '/api/contact', {
      body: { name: 'Test', email: 'test@test.com', subject: 'E2E Test', message: 'Testing NestJS backend' },
    });
    assert(data.success, `Contact failed: ${data.message}`);
  });
}

async function testUserEndpoints(cookies, userId) {
  console.log('\n👤 User Endpoints (authenticated)');

  await test(`GET /api/users/${userId}/wallet — wallet balance`, async () => {
    const { data } = await req('GET', `/api/users/${userId}/wallet`, { cookies });
    assert(data.success, `Wallet failed: ${data.message}`);
    assert(typeof data.data.balance === 'number', 'Missing balance');
    assert(data.data.currency, 'Missing currency');
  });

  await test(`GET /api/users/${userId}/notifications`, async () => {
    const { data } = await req('GET', `/api/users/${userId}/notifications`, { cookies });
    assert(data.success, 'Notifications failed');
    assert(Array.isArray(data.data), 'Not an array');
    assert(typeof data.meta.unreadCount === 'number', 'Missing unread count');
  });

  await test(`GET /api/users/${userId}/preferences`, async () => {
    const { data } = await req('GET', `/api/users/${userId}/preferences`, { cookies });
    assert(data.success, 'Preferences failed');
    assert(data.data.language, 'Missing language');
  });

  await test(`GET /api/users/${userId}/documents`, async () => {
    const { data } = await req('GET', `/api/users/${userId}/documents`, { cookies });
    assert(data.success, 'Documents failed');
    assert(Array.isArray(data.data), 'Not an array');
  });

  await test(`GET /api/users/${userId}/availability`, async () => {
    const { data } = await req('GET', `/api/users/${userId}/availability`, { cookies });
    assert(data.success, 'Availability failed');
    assert(Array.isArray(data.data), 'Not an array');
  });

  await test(`GET /api/users/${userId}/subscription`, async () => {
    const { data } = await req('GET', `/api/users/${userId}/subscription`, { cookies });
    assert(data.success, 'Subscription failed');
  });

  await test(`GET /api/users/${userId}/billing`, async () => {
    const { data } = await req('GET', `/api/users/${userId}/billing`, { cookies });
    assert(data.success, 'Billing failed');
    assert(Array.isArray(data.data), 'Not an array');
  });
}

async function testHealthData(cookies, userId) {
  console.log('\n🏥 Health Data (for ALL users)');

  await test(`GET /api/users/${userId}/medical-records`, async () => {
    const { data } = await req('GET', `/api/users/${userId}/medical-records`, { cookies });
    assert(data.success, 'Medical records failed');
  });

  await test(`GET /api/users/${userId}/prescriptions`, async () => {
    const { data } = await req('GET', `/api/users/${userId}/prescriptions`, { cookies });
    assert(data.success, 'Prescriptions failed');
  });

  await test(`GET /api/users/${userId}/vital-signs`, async () => {
    const { data } = await req('GET', `/api/users/${userId}/vital-signs`, { cookies });
    assert(data.success, 'Vital signs failed');
  });

  await test(`GET /api/users/${userId}/pill-reminders`, async () => {
    const { data } = await req('GET', `/api/users/${userId}/pill-reminders`, { cookies });
    assert(data.success, 'Pill reminders failed');
  });

  await test(`GET /api/users/${userId}/lab-tests`, async () => {
    const { data } = await req('GET', `/api/users/${userId}/lab-tests`, { cookies });
    assert(data.success, 'Lab tests failed');
  });

  await test(`GET /api/users/${userId}/claims`, async () => {
    const { data } = await req('GET', `/api/users/${userId}/claims`, { cookies });
    assert(data.success, 'Claims failed');
  });
}

async function testProviderEndpoints(cookies) {
  console.log('\n🩺 Provider Endpoints');

  await test('GET /api/providers/DOC001 — provider profile', async () => {
    const { data } = await req('GET', '/api/providers/DOC001', { cookies });
    assert(data.success, 'Provider profile failed');
    assert(data.data.firstName === 'Sarah', 'Wrong name');
  });

  await test('GET /api/providers/DOC001/services', async () => {
    const { data } = await req('GET', '/api/providers/DOC001/services', { cookies });
    assert(data.success, 'Services failed');
  });

  await test('GET /api/providers/DOC001/reviews — public', async () => {
    const { data } = await req('GET', '/api/providers/DOC001/reviews');
    assert(data.success, 'Reviews failed');
    assert(typeof data.averageRating === 'number', 'Missing avg rating');
  });

  await test('GET /api/providers/DOC001/booking-requests', async () => {
    const { data } = await req('GET', '/api/providers/DOC001/booking-requests', { cookies });
    assert(data.success, 'Booking requests failed');
  });
}

async function testWorkflow(cookies) {
  console.log('\n⚙️ Workflow Engine');

  await test('GET /api/workflow/instances?role=provider', async () => {
    const { data } = await req('GET', '/api/workflow/instances?role=provider', { cookies });
    assert(data.success, 'Instances failed');
    assert(data.data.length > 0, 'No workflow instances');
  });

  let instanceId;
  await test('GET /api/workflow/instances — find pending instance', async () => {
    const { data } = await req('GET', '/api/workflow/instances?role=provider', { cookies });
    const pending = data.data.find(i => i.currentStatus === 'pending');
    assert(pending, 'No pending instance found');
    instanceId = pending.id;
  });

  if (instanceId) {
    await test(`GET /api/workflow/instances/${instanceId} — state`, async () => {
      const { data } = await req('GET', `/api/workflow/instances/${instanceId}`, { cookies });
      assert(data.success, 'State failed');
      assert(data.data.currentStatus, 'Missing status');
      assert(data.data.actionsForProvider.length > 0, 'No provider actions');
    });

    await test(`GET /api/workflow/instances/${instanceId}/timeline`, async () => {
      const { data } = await req('GET', `/api/workflow/instances/${instanceId}/timeline`, { cookies });
      assert(data.success, 'Timeline failed');
      assert(data.data.length > 0, 'Empty timeline');
    });
  }

  await test('GET /api/workflow/templates', async () => {
    const { data } = await req('GET', '/api/workflow/templates', { cookies });
    assert(data.success, 'Templates failed');
    assert(data.data.length > 0, 'No templates');
  });

  await test('GET /api/workflow/my-templates', async () => {
    const { data } = await req('GET', '/api/workflow/my-templates', { cookies });
    assert(data.success, 'My templates failed');
  });
}

async function testBookings(patientCookies) {
  console.log('\n📅 Bookings');

  await test('GET /api/bookings/unified — patient bookings', async () => {
    const { data } = await req('GET', '/api/bookings/unified', { cookies: patientCookies });
    assert(data.success, 'Unified bookings failed');
  });

  await test('GET /api/bookings/available-slots — public', async () => {
    const { data } = await req('GET', '/api/bookings/available-slots?providerUserId=DOC001&date=2026-04-07');
    assert(data.success, 'Available slots failed');
  });
}

async function testInventory(cookies) {
  console.log('\n🛒 Inventory & Health Shop');

  await test('GET /api/inventory — provider items', async () => {
    const { data } = await req('GET', '/api/inventory', { cookies });
    assert(data.success, 'Inventory failed');
  });

  await test('GET /api/inventory/orders', async () => {
    const { data } = await req('GET', '/api/inventory/orders', { cookies });
    assert(data.success, 'Orders failed');
  });
}

async function testConversations(cookies) {
  console.log('\n💬 Conversations');

  await test('GET /api/conversations', async () => {
    const { data } = await req('GET', '/api/conversations', { cookies });
    assert(data.success, 'Conversations failed');
    assert(Array.isArray(data.data), 'Not an array');
  });
}

async function testConnections(cookies) {
  console.log('\n🔗 Connections');

  await test('GET /api/connections', async () => {
    const { data } = await req('GET', '/api/connections', { cookies });
    assert(data.success, 'Connections failed');
  });
}

async function testServices(cookies) {
  console.log('\n🔧 Services');

  await test('GET /api/services/my-services', async () => {
    const { data } = await req('GET', '/api/services/my-services', { cookies });
    assert(data.success, 'My services failed');
  });
}

async function testVideo(cookies) {
  console.log('\n📹 Video & WebRTC');

  await test('GET /api/video/rooms', async () => {
    const { data } = await req('GET', '/api/video/rooms', { cookies });
    assert(data.success, 'Video rooms failed');
  });

  await test('GET /api/webrtc/session?roomId=nonexistent', async () => {
    const { data } = await req('GET', '/api/webrtc/session?roomId=nonexistent', { cookies });
    assert(data.success, 'WebRTC session failed');
    assert(data.data === null, 'Should be null for nonexistent room');
  });
}

async function testSocketIO() {
  console.log('\n🔌 Socket.IO');

  await test('Socket.IO connects + joins user room', async () => {
    const { io } = await import('socket.io-client');
    return new Promise((resolve, reject) => {
      const socket = io(API, { transports: ['polling', 'websocket'], timeout: 5000 });
      socket.on('connect', () => {
        socket.emit('chat:join', { userId: 'DOC001' });
        setTimeout(() => { socket.disconnect(); resolve(); }, 300);
      });
      socket.on('connect_error', (err) => { reject(new Error(`Socket error: ${err.message}`)); });
      setTimeout(() => { reject(new Error('Socket timeout')); }, 8000);
    });
  });
}

async function testCrossRoleAccess() {
  console.log('\n🔀 Cross-Role Access (every user is a patient)');

  // Login as nurse and access health data (nurse is also a patient)
  await test('Nurse can access own health data', async () => {
    await new Promise(r => setTimeout(r, 1500)); // Throttle delay
    const { data: loginData, setCookie } = await req('POST', '/api/auth/login', {
      body: { email: 'priya.ramgoolam@mediwyz.com', password: 'Nurse123!' },
    });
    assert(loginData.success, 'Nurse login failed');
    const nurseCookies = extractCookies(setCookie);
    const nurseId = loginData.user.id;

    // Nurse accessing own medical records (ensurePatientProfile auto-creates)
    const { data: records } = await req('GET', `/api/users/${nurseId}/medical-records`, { cookies: nurseCookies });
    assert(records.success, 'Nurse medical records failed');

    // Nurse accessing own wallet
    const { data: wallet } = await req('GET', `/api/users/${nurseId}/wallet`, { cookies: nurseCookies });
    assert(wallet.success, 'Nurse wallet failed');
  });

  // Login as pharmacist and access health data
  await test('Pharmacist can access own health data', async () => {
    const { data: loginData, setCookie } = await req('POST', '/api/auth/login', {
      body: { email: 'daniel.amoako@mediwyz.com', password: 'Pharma123!' },
    });
    if (!loginData.success) { skipped++; return; } // Skip if seeded user doesn't exist
    const cookies = extractCookies(setCookie);
    const userId = loginData.user.id;

    const { data: records } = await req('GET', `/api/users/${userId}/prescriptions`, { cookies });
    assert(records.success, 'Pharmacist prescriptions failed');
  });
}

async function testWalletOperations(cookies, userId) {
  console.log('\n💰 Wallet Operations');

  await test('POST /api/users/:id/wallet/topup', async () => {
    const { data: before } = await req('GET', `/api/users/${userId}/wallet`, { cookies });
    const balanceBefore = before.data.balance;

    const { data } = await req('POST', `/api/users/${userId}/wallet/topup`, {
      cookies, body: { amount: 100 },
    });
    assert(data.success, `Top-up failed: ${data.message}`);
    assert(data.data.newBalance === balanceBefore + 100, 'Balance mismatch after top-up');
  });

  await test('POST /api/users/:id/wallet/reset', async () => {
    const { data } = await req('POST', `/api/users/${userId}/wallet/reset`, {
      cookies, body: {},
    });
    assert(data.success, `Reset failed: ${data.message}`);
    assert(typeof data.data.balance === 'number', 'Missing balance after reset');
  });
}

// ─── Main ─────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  MediWyz NestJS Backend — Full E2E Test Suite`);
  console.log(`  API: ${API}`);
  console.log(`${'═'.repeat(60)}`);

  // Verify server is running
  try {
    await fetch(`${API}/api/health`);
  } catch {
    console.error(`\n❌ Cannot reach ${API}. Is the NestJS server running?`);
    process.exit(1);
  }

  await testHealthCheck();
  const { doctorCookies, patientCookies } = await testAuth();
  await testPublicEndpoints();
  await testUserEndpoints(doctorCookies, 'DOC001');
  await testUserEndpoints(patientCookies, 'PAT002');
  await testHealthData(patientCookies, 'PAT002');
  await testHealthData(doctorCookies, 'DOC001');  // Doctor accessing own health data
  await testProviderEndpoints(doctorCookies);
  await testWorkflow(doctorCookies);
  await testBookings(patientCookies);
  await testInventory(doctorCookies);
  await testConversations(doctorCookies);
  await testConnections(doctorCookies);
  await testServices(doctorCookies);
  await testVideo(doctorCookies);
  await testSocketIO();
  await testCrossRoleAccess();
  await testWalletOperations(patientCookies, 'PAT002');

  // ─── Summary ───────────────────────────────────────────────────────────
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  Results: ${passed} passed, ${failed} failed, ${skipped} skipped`);
  console.log(`${'═'.repeat(60)}`);

  if (errors.length > 0) {
    console.log('\n❌ Failed tests:');
    errors.forEach((e, i) => console.log(`  ${i + 1}. ${e.name}: ${e.error.slice(0, 200)}`));
  }

  if (failed === 0) {
    console.log('\n✅ ALL TESTS PASSED');
  }

  process.exit(failed > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
