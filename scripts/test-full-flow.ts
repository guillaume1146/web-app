/**
 * Full Flow Integration Test Script
 * Tests: Create role → Book → Accept → Video Call → Verify triggers
 */
const BASE = 'http://localhost:3000'

// Generate unique future dates to avoid slot conflicts
function futureDate(daysFromNow: number): string {
  const d = new Date()
  d.setDate(d.getDate() + daysFromNow)
  return d.toISOString().split('T')[0]
}
const RUN_ID = Math.floor(Math.random() * 100)

async function login(email: string, password: string): Promise<string | null> {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  const cookies = res.headers.getSetCookie?.() || []
  const token = cookies.find((c: string) => c.startsWith('mediwyz_token='))?.split('=')[1]?.split(';')[0]
  return token || null
}

function h(token: string) {
  return { 'Content-Type': 'application/json', 'Cookie': `mediwyz_token=${token}` }
}

async function main() {
  let errors = 0

  function check(label: string, condition: boolean, detail = '') {
    if (condition) {
      console.log(`  ✓ ${label}` + (detail ? ` (${detail})` : ''))
    } else {
      console.log(`  ✗ FAIL: ${label}` + (detail ? ` (${detail})` : ''))
      errors++
    }
  }

  // 1. Login as Regional Admin
  console.log('\n1. LOGIN AS REGIONAL ADMIN')
  const adminToken = await login('kofi.agbeko@mediwyz.com', 'Regional123!')
  check('Admin login', !!adminToken)
  if (!adminToken) { console.log('ABORT: No admin token'); return }

  // 2. Create AUDIOLOGIST role
  console.log('\n2. CREATE PROVIDER ROLE: AUDIOLOGIST')
  const roleRes = await fetch(`${BASE}/api/regional/roles`, {
    method: 'POST', headers: h(adminToken),
    body: JSON.stringify({
      code: 'AUDIOLOGIST', label: 'Audiologists', singularLabel: 'Audiologist',
      slug: 'audiologists', icon: 'FaHeadphones', color: '#8B5CF6',
      description: 'Hearing specialist', searchEnabled: true, bookingEnabled: true,
      inventoryEnabled: true, displayOrder: 80,
      verificationDocs: [{ documentName: 'Audiology License', isRequired: true }],
    }),
  })
  const role = await roleRes.json()
  check('Create role', role.success, role.data?.code || role.message)
  check('Role has verification doc', (role.data?.verificationDocs?.length || 0) >= 1)

  // 3. Verify in public API
  console.log('\n3. VERIFY ROLE IN PUBLIC API')
  const pubRoles = await (await fetch(`${BASE}/api/roles?searchEnabled=true`, { headers: h(adminToken) })).json()
  const audio = pubRoles.data?.find((r: { code: string }) => r.code === 'AUDIOLOGIST')
  check('AUDIOLOGIST in /api/roles', !!audio)
  check('searchPath correct', audio?.searchPath === '/search/audiologists')

  // 4. Update role
  console.log('\n4. UPDATE ROLE')
  if (role.data?.id) {
    const upd = await (await fetch(`${BASE}/api/regional/roles/${role.data.id}`, {
      method: 'PATCH', headers: h(adminToken),
      body: JSON.stringify({ description: 'Updated description', displayOrder: 75 }),
    })).json()
    check('Update role', upd.success)
  }

  // 5. Login as Patient
  console.log('\n5. LOGIN AS PATIENT (Emma)')
  const patToken = await login('emma.johnson@mediwyz.com', 'Patient123!')
  check('Patient login', !!patToken)
  if (!patToken) { console.log('ABORT'); return }

  // 6. Top up wallet + Book Doctor (video)
  console.log('\n6. BOOK DOCTOR (video)')
  const walletReset = await (await fetch(`${BASE}/api/users/PAT001/wallet/reset`, {
    method: 'POST', headers: h(patToken),
    body: JSON.stringify({ amount: 99999 }),
  })).json()
  console.log('  Wallet reset:', walletReset.success || walletReset.message)
  const bookRes = await fetch(`${BASE}/api/bookings/doctor`, {
    method: 'POST', headers: h(patToken),
    body: JSON.stringify({
      doctorId: 'DOC001', consultationType: 'video',
      scheduledDate: futureDate(100 + RUN_ID), scheduledTime: '11:00',
      reason: 'Flow test booking', duration: 30,
    }),
  })
  const book = await bookRes.json()
  check('Booking created', book.success, book.booking?.id || book.message)
  const bookingId = book.booking?.id

  // 7. Login as Doctor
  console.log('\n7. LOGIN AS DOCTOR (Sarah)')
  const docToken = await login('sarah.johnson@mediwyz.com', 'Doctor123!')
  check('Doctor login', !!docToken)
  if (!docToken || !bookingId) { console.log('ABORT'); return }

  // 8. Check unified bookings
  console.log('\n8. CHECK UNIFIED BOOKINGS')
  const unified = await (await fetch(`${BASE}/api/bookings/unified?role=provider`, { headers: h(docToken) })).json()
  check('Unified API success', unified.success)
  check('Has bookings', (unified.data?.length || 0) > 0, `count: ${unified.data?.length}`)
  const testBooking = unified.data?.find((b: { id: string }) => b.id === bookingId)
  check('Test booking visible', !!testBooking)
  check('Booking has patientName', !!testBooking?.patientName)
  check('Booking has availableActions', (testBooking?.availableActions?.length || 0) > 0)

  // 9. Accept via workflow transition
  console.log('\n9. ACCEPT BOOKING (workflow transition)')
  const accept = await (await fetch(`${BASE}/api/workflow/transition`, {
    method: 'POST', headers: h(docToken),
    body: JSON.stringify({ bookingId, bookingType: 'appointment', action: 'accept' }),
  })).json()
  check('Accept transition success', accept.success)
  check('Status changed to confirmed', accept.data?.currentStatus === 'confirmed')
  check('Payment triggered', !!accept.data?.triggeredActions?.paymentProcessed, `Rs ${accept.data?.triggeredActions?.paymentProcessed?.amount || 0}`)
  check('Conversation created', !!accept.data?.triggeredActions?.conversationId)
  check('Patient notification sent', !!accept.data?.notification?.patientNotificationId)

  // 10. Prepare video call
  console.log('\n10. PREPARE VIDEO CALL')
  const prep = await (await fetch(`${BASE}/api/workflow/transition`, {
    method: 'POST', headers: h(docToken),
    body: JSON.stringify({ bookingId, bookingType: 'appointment', action: 'prepare_call' }),
  })).json()
  check('Prepare call success', prep.success)
  check('Status is call_ready', prep.data?.currentStatus === 'call_ready')
  check('Video room created', !!prep.data?.triggeredActions?.videoCallId)

  // 11. Check workflow state
  console.log('\n11. CHECK WORKFLOW STATE')
  const instances = await (await fetch(`${BASE}/api/workflow/instances?role=provider`, { headers: h(docToken) })).json()
  check('Instances API success', instances.success)
  const inst = instances.data?.find((i: { bookingId: string }) => i.bookingId === bookingId)
  check('Instance found for booking', !!inst)
  check('Instance status is call_ready', inst?.currentStatus === 'call_ready')

  // 12. Join call + end call
  console.log('\n12. JOIN AND END VIDEO CALL')
  const join = await (await fetch(`${BASE}/api/workflow/transition`, {
    method: 'POST', headers: h(docToken),
    body: JSON.stringify({ bookingId, bookingType: 'appointment', action: 'join_call' }),
  })).json()
  check('Join call success', join.success)
  check('Status is in_call', join.data?.currentStatus === 'in_call')

  const end = await (await fetch(`${BASE}/api/workflow/transition`, {
    method: 'POST', headers: h(docToken),
    body: JSON.stringify({ bookingId, bookingType: 'appointment', action: 'end_call' }),
  })).json()
  check('End call success', end.success)
  check('Status is completed', end.data?.currentStatus === 'completed')
  check('Review request sent', !!end.data?.triggeredActions?.reviewRequestSent)

  // 13. Verify complete timeline
  console.log('\n13. VERIFY TIMELINE')
  if (inst?.id) {
    const timeline = await (await fetch(`${BASE}/api/workflow/instances/${inst.id}/timeline`, { headers: h(docToken) })).json()
    check('Timeline API success', timeline.success)
    check('Timeline has entries', (timeline.data?.length || 0) >= 5, `count: ${timeline.data?.length}`)
  }

  // 14. Book a Nurse (office) and test accept
  console.log('\n14. BOOK NURSE (office)')
  const nurseBook = await (await fetch(`${BASE}/api/bookings/nurse`, {
    method: 'POST', headers: h(patToken),
    body: JSON.stringify({
      nurseId: 'NUR001', consultationType: 'video',
      scheduledDate: futureDate(101 + RUN_ID), scheduledTime: '11:00',
      reason: 'Nurse flow test', duration: 30,
    }),
  })).json()
  check('Nurse booking created', nurseBook.success, nurseBook.booking?.id)

  if (nurseBook.booking?.id) {
    const nurseToken = await login('priya.ramgoolam@mediwyz.com', 'Nurse123!')
    if (nurseToken) {
      const nurseAccept = await (await fetch(`${BASE}/api/workflow/transition`, {
        method: 'POST', headers: h(nurseToken),
        body: JSON.stringify({ bookingId: nurseBook.booking.id, bookingType: 'nurse_booking', action: 'accept' }),
      })).json()
      check('Nurse accept success', nurseAccept.success)
      check('Nurse payment triggered', !!nurseAccept.data?.triggeredActions?.paymentProcessed)
    }
  }

  // 15. Top up wallet then book Dentist
  console.log('\n15. BOOK DENTIST (video)')
  // Top up wallet first
  await fetch(`${BASE}/api/users/PAT001/wallet/reset`, {
    method: 'POST', headers: h(patToken),
    body: JSON.stringify({ amount: 50000 }),
  })
  const dentBook = await (await fetch(`${BASE}/api/bookings/service`, {
    method: 'POST', headers: h(patToken),
    body: JSON.stringify({
      providerUserId: 'DENT001', providerType: 'DENTIST',
      type: 'video', scheduledDate: futureDate(102 + RUN_ID), scheduledTime: '11:00',
      reason: 'Dental checkup test', duration: 30,
    }),
  })).json()
  check('Dentist booking created', dentBook.success, dentBook.booking?.id)

  if (dentBook.booking?.id) {
    const dentToken = await login('anisha.dentist@mediwyz.com', 'Dentist123!')
    if (dentToken) {
      const dentAccept = await (await fetch(`${BASE}/api/workflow/transition`, {
        method: 'POST', headers: h(dentToken),
        body: JSON.stringify({ bookingId: dentBook.booking.id, bookingType: 'service_booking', action: 'accept' }),
      })).json()
      check('Dentist accept success', dentAccept.success)
      check('Dentist conversation created', !!dentAccept.data?.triggeredActions?.conversationId)
    }
  }

  // 16. Cleanup: deactivate AUDIOLOGIST
  console.log('\n16. CLEANUP')
  if (role.data?.id) {
    const del = await (await fetch(`${BASE}/api/regional/roles/${role.data.id}`, { method: 'DELETE', headers: h(adminToken) })).json()
    check('Deactivate AUDIOLOGIST', del.success)
  }

  // Summary
  console.log('\n' + '='.repeat(50))
  console.log(`RESULT: ${errors === 0 ? '✓ ALL PASSED' : `✗ ${errors} FAILURE(S)`}`)
  console.log('='.repeat(50))

  process.exit(errors > 0 ? 1 : 0)
}

main().catch(e => { console.error('FATAL:', e); process.exit(1) })
