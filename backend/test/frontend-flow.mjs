#!/usr/bin/env node
/**
 * MediWyz Frontend Behavior Test — tests all user flows through the Next.js proxy.
 * Simulates exactly what the browser does: login, navigate pages, fetch data.
 *
 * Usage: node backend/test/frontend-flow.mjs [--url http://localhost:3000]
 */

const BASE = process.argv.find(a => a.startsWith('--url='))?.split('=')[1] || 'http://localhost:3000';
let passed = 0, failed = 0;
const errors = [];

async function req(method, path, { body, cookies } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (cookies) headers['Cookie'] = cookies;
  const opts = { method, headers, redirect: 'manual' };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE}${path}`, opts);
  const setCookie = res.headers.get('set-cookie') || '';
  let data;
  try { data = await res.json(); } catch { data = null; }
  return { status: res.status, data, setCookie, ok: res.ok };
}

function extractCookies(h) {
  if (!h) return '';
  return h.split(',').map(c => c.split(';')[0].trim()).join('; ');
}

async function test(name, fn) {
  try { await fn(); passed++; console.log(`  ✓ ${name}`); }
  catch (err) { failed++; errors.push({ name, error: err.message }); console.log(`  ✗ ${name}: ${err.message?.slice(0, 150)}`); }
}

function assert(c, m) { if (!c) throw new Error(m || 'Assertion failed'); }

// ─── Frontend Flow Tests ──────────────────────────────────────────────────

async function loginFlow() {
  console.log('\n🔐 Login Flow (what the login page does)');

  let cookies = '';

  await test('Login page submits credentials → gets user + cookies', async () => {
    const { data, setCookie } = await req('POST', '/api/auth/login', {
      body: { email: 'sarah.johnson@mediwyz.com', password: 'Doctor123!' },
    });
    assert(data.success, `Login failed: ${data.message}`);
    assert(data.user.id && data.user.firstName && data.user.userType, 'Incomplete user data');
    assert(data.redirectPath, 'Missing redirect path');
    cookies = extractCookies(setCookie);
    assert(cookies.includes('mediwyz_token'), 'No auth cookie set');
    assert(cookies.includes('mediwyz_userType'), 'No userType cookie');
  });

  await test('After login: /api/auth/me returns full profile', async () => {
    const { data } = await req('GET', '/api/auth/me', { cookies });
    assert(data.success, 'Me failed');
    assert(data.user.doctorProfile, 'Missing type-specific profile');
    assert(data.user.userType === 'doctor', 'Wrong userType');
  });

  return cookies;
}

async function dashboardFlow(cookies, userId) {
  console.log('\n📊 Dashboard Flow (what dashboard pages fetch)');

  await test('Sidebar: fetch role-config for feature visibility', async () => {
    const { data } = await req('GET', '/api/role-config/DOCTOR', { cookies });
    assert(data.success, 'Role config failed');
    assert(typeof data.data.features === 'object', 'Missing features');
  });

  await test('Sidebar: fetch dynamic search items from /api/roles', async () => {
    const { data } = await req('GET', '/api/roles?searchEnabled=true', { cookies });
    assert(data.success && data.data.length > 0, 'No search roles');
  });

  await test('Overview: fetch wallet balance', async () => {
    const { data } = await req('GET', `/api/users/${userId}/wallet`, { cookies });
    assert(data.success, 'Wallet failed');
    assert(typeof data.data.balance === 'number', 'Missing balance');
  });

  await test('Overview: fetch notifications with unread count', async () => {
    const { data } = await req('GET', `/api/users/${userId}/notifications?limit=10`, { cookies });
    assert(data.success, 'Notifications failed');
    assert(typeof data.meta.unreadCount === 'number', 'Missing unread count');
  });

  await test('Overview: fetch workflow instances (booking requests)', async () => {
    const { data } = await req('GET', '/api/workflow/instances?role=provider', { cookies });
    assert(data.success, 'Instances failed');
    assert(Array.isArray(data.data), 'Not an array');
  });
}

async function bookingFlow(cookies, userId) {
  console.log('\n📅 Booking Flow (patient browsing → booking)');

  // Patient login
  const { data: patLogin, setCookie } = await req('POST', '/api/auth/login', {
    body: { email: 'jean.pierre@mediwyz.com', password: 'Patient123!' },
  });
  const patCookies = extractCookies(setCookie);
  const patId = patLogin.user.id;

  await test('Patient: search providers by type', async () => {
    const { data } = await req('GET', '/api/search/providers?type=DOCTOR');
    assert(data.success && data.data.length > 0, 'No doctors found');
  });

  await test('Patient: view provider profile', async () => {
    const { data } = await req('GET', '/api/providers/DOC001', { cookies: patCookies });
    assert(data.success, 'Provider profile failed');
    assert(data.data.firstName, 'Missing name');
  });

  await test('Patient: view provider services', async () => {
    const { data } = await req('GET', '/api/providers/DOC001/services', { cookies: patCookies });
    assert(data.success, 'Services failed');
  });

  await test('Patient: view provider reviews', async () => {
    const { data } = await req('GET', '/api/providers/DOC001/reviews');
    assert(data.success, 'Reviews failed');
    assert(typeof data.averageRating === 'number', 'Missing rating');
  });

  await test('Patient: check available slots', async () => {
    const { data } = await req('GET', '/api/bookings/available-slots?providerUserId=DOC001&date=2026-04-07');
    assert(data.success, 'Slots failed');
  });

  await test('Patient: view unified bookings', async () => {
    const { data } = await req('GET', '/api/bookings/unified', { cookies: patCookies });
    assert(data.success, 'Bookings failed');
  });

  return patCookies;
}

async function healthDataFlow(cookies, userId) {
  console.log('\n🏥 Health Data Flow (health records, prescriptions, vitals)');

  await test('View medical records', async () => {
    const { data } = await req('GET', `/api/users/${userId}/medical-records`, { cookies });
    assert(data.success, 'Records failed');
  });

  await test('View prescriptions', async () => {
    const { data } = await req('GET', `/api/users/${userId}/prescriptions`, { cookies });
    assert(data.success, 'Prescriptions failed');
  });

  await test('View vital signs', async () => {
    const { data } = await req('GET', `/api/users/${userId}/vital-signs`, { cookies });
    assert(data.success, 'Vitals failed');
  });

  await test('View lab tests', async () => {
    const { data } = await req('GET', `/api/users/${userId}/lab-tests`, { cookies });
    assert(data.success, 'Lab tests failed');
  });

  await test('View insurance claims', async () => {
    const { data } = await req('GET', `/api/users/${userId}/claims`, { cookies });
    assert(data.success, 'Claims failed');
  });
}

async function workflowFlow(cookies) {
  console.log('\n⚙️ Workflow Flow (provider managing bookings)');

  let instanceId;
  await test('List workflow instances', async () => {
    const { data } = await req('GET', '/api/workflow/instances?role=provider', { cookies });
    assert(data.success && data.data.length > 0, 'No instances');
    instanceId = data.data.find(i => i.currentStatus === 'pending')?.id;
  });

  if (instanceId) {
    await test('View instance state with actions', async () => {
      const { data } = await req('GET', `/api/workflow/instances/${instanceId}`, { cookies });
      assert(data.success, 'State failed');
      assert(data.data.actionsForProvider.length > 0, 'No actions available');
    });

    await test('View instance timeline', async () => {
      const { data } = await req('GET', `/api/workflow/instances/${instanceId}/timeline`, { cookies });
      assert(data.success && data.data.length > 0, 'No timeline');
    });
  }

  await test('View workflow templates', async () => {
    const { data } = await req('GET', '/api/workflow/templates', { cookies });
    assert(data.success && data.data.length > 0, 'No templates');
  });
}

async function settingsFlow(cookies, userId) {
  console.log('\n⚙️ Settings Flow');

  await test('View preferences', async () => {
    const { data } = await req('GET', `/api/users/${userId}/preferences`, { cookies });
    assert(data.success, 'Preferences failed');
  });

  await test('View documents', async () => {
    const { data } = await req('GET', `/api/users/${userId}/documents`, { cookies });
    assert(data.success, 'Documents failed');
  });

  await test('View billing info', async () => {
    const { data } = await req('GET', `/api/users/${userId}/billing`, { cookies });
    assert(data.success, 'Billing failed');
  });

  await test('View availability', async () => {
    const { data } = await req('GET', `/api/users/${userId}/availability`, { cookies });
    assert(data.success, 'Availability failed');
  });
}

async function messagingFlow(cookies) {
  console.log('\n💬 Messaging Flow');

  await test('List conversations', async () => {
    const { data } = await req('GET', '/api/conversations', { cookies });
    assert(data.success, 'Conversations failed');
    if (data.data.length > 0) {
      // View first conversation's messages
      const convoId = data.data[0].id;
      const { data: msgs } = await req('GET', `/api/conversations/${convoId}/messages`, { cookies });
      assert(msgs.success, 'Messages failed');
    }
  });
}

async function healthShopFlow() {
  console.log('\n🛒 Health Shop Flow');

  await test('Browse all items', async () => {
    const { data } = await req('GET', '/api/search/health-shop');
    assert(data.success && data.data.length > 0, 'No items');
    assert(typeof data.total === 'number', 'Missing total');
  });

  await test('Filter by category', async () => {
    const { data } = await req('GET', '/api/search/health-shop?category=Prescription%20Medicines');
    assert(data.success, 'Category filter failed');
  });

  await test('Search by query', async () => {
    const { data } = await req('GET', '/api/search/health-shop?q=vitamin');
    assert(data.success, 'Search failed');
  });
}

async function subscriptionFlow() {
  console.log('\n💳 Subscription Flow');

  await test('List plans', async () => {
    const { data } = await req('GET', '/api/subscriptions');
    assert(data.success && data.data.length > 0, 'No plans');
  });

  await test('Filter by type=individual', async () => {
    const { data } = await req('GET', '/api/subscriptions?type=individual');
    assert(data.success, 'Filter failed');
  });

  await test('View regions for registration', async () => {
    const { data } = await req('GET', '/api/regions');
    assert(data.success && data.data.length > 0, 'No regions');
  });
}

async function feedFlow(cookies) {
  console.log('\n📰 Feed Flow');

  await test('View services catalog', async () => {
    const { data } = await req('GET', '/api/services/catalog');
    assert(data.success, 'Catalog failed');
  });

  await test('View programs', async () => {
    const { data } = await req('GET', '/api/programs');
    assert(data.success, 'Programs failed');
  });

  await test('View connections', async () => {
    const { data } = await req('GET', '/api/connections', { cookies });
    assert(data.success, 'Connections failed');
  });

  await test('View platform stats', async () => {
    const { data } = await req('GET', '/api/stats');
    assert(data.success, 'Stats failed');
    assert(Array.isArray(data.data) ? data.data.length > 0 : data.data.users > 0, 'No stats data');
  });
}

async function socketIOFlow() {
  console.log('\n🔌 Socket.IO Flow (real-time notifications)');

  await test('Connect to Socket.IO via NestJS', async () => {
    const { io } = await import('socket.io-client');
    return new Promise((resolve, reject) => {
      const socket = io('http://localhost:3001', { transports: ['polling', 'websocket'], timeout: 5000 });
      socket.on('connect', () => {
        socket.emit('chat:join', { userId: 'DOC001' });
        setTimeout(() => { socket.disconnect(); resolve(); }, 300);
      });
      socket.on('connect_error', (err) => reject(new Error(`Socket: ${err.message}`)));
      setTimeout(() => reject(new Error('Timeout')), 8000);
    });
  });
}

async function multiRoleFlow() {
  console.log('\n🔀 Multi-Role Flow (different user types)');

  const roles = [
    { email: 'sarah.johnson@mediwyz.com', password: 'Doctor123!', type: 'doctor', id: 'DOC001' },
    { email: 'jean.pierre@mediwyz.com', password: 'Patient123!', type: 'patient', id: 'PAT002' },
    { email: 'priya.ramgoolam@mediwyz.com', password: 'Nurse123!', type: 'nurse', id: null },
  ];

  for (const role of roles) {
    await test(`${role.type}: login + access own data`, async () => {
      await new Promise(r => setTimeout(r, 1200)); // Throttle
      const { data, setCookie } = await req('POST', '/api/auth/login', { body: { email: role.email, password: role.password } });
      if (!data.success) throw new Error(`Login failed for ${role.type}: ${data.message}`);
      const cookies = extractCookies(setCookie);
      const userId = data.user.id;

      // Every user can access wallet
      const { data: wallet } = await req('GET', `/api/users/${userId}/wallet`, { cookies });
      assert(wallet.success, `${role.type} wallet failed`);

      // Every user can access health data (ensurePatientProfile)
      const { data: records } = await req('GET', `/api/users/${userId}/medical-records`, { cookies });
      assert(records.success, `${role.type} medical records failed`);
    });
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  MediWyz Frontend Behavior Test`);
  console.log(`  URL: ${BASE}`);
  console.log(`${'═'.repeat(60)}`);

  try { await fetch(`${BASE}/api/health`); } catch {
    console.error(`\n❌ Cannot reach ${BASE}. Is the server running?`);
    process.exit(1);
  }

  const doctorCookies = await loginFlow();
  await dashboardFlow(doctorCookies, 'DOC001');
  const patientCookies = await bookingFlow(doctorCookies, 'DOC001');
  await healthDataFlow(patientCookies, 'PAT002');
  await healthDataFlow(doctorCookies, 'DOC001');
  await workflowFlow(doctorCookies);
  await settingsFlow(doctorCookies, 'DOC001');
  await messagingFlow(doctorCookies);
  await healthShopFlow();
  await subscriptionFlow();
  await feedFlow(doctorCookies);
  await socketIOFlow();
  await multiRoleFlow();

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  Results: ${passed} passed, ${failed} failed`);
  console.log(`${'═'.repeat(60)}`);

  if (errors.length > 0) {
    console.log('\n❌ Failed tests:');
    errors.forEach((e, i) => console.log(`  ${i + 1}. ${e.name}: ${e.error.slice(0, 200)}`));
  } else {
    console.log('\n✅ ALL FRONTEND FLOWS WORKING');
  }

  process.exit(failed > 0 ? 1 : 0);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
