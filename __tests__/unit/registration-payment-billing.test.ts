/**
 * Registration, Payment & Corporate Billing Cascade Tests
 *
 * Tests:
 * 1. Registration flow — user creation with proper profiles
 * 2. Wallet operations — credit, debit, balance checks
 * 3. Corporate billing cascade — invited employees inherit company plan
 * 4. Volume discount calculation
 * 5. End-to-end: invite → approve → enroll → billing cascade
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import prisma from '@/lib/db'
import {
  getVolumeDiscount,
  calculateCorporatePlanCost,
  enrollEmployeesInPlan,
} from '@/lib/subscription/corporate'

let testCorpUserId: string
let testEmployeeUserId: string
let testPlanId: string
const cleanupIds = {
  users: [] as string[],
  wallets: [] as string[],
  employees: [] as string[],
  subscriptions: [] as string[],
  profiles: [] as string[],
}

// ─── Setup ──────────────────────────────────────────────────────────────────

beforeAll(async () => {
  // Create test corporate admin user (a doctor who created a company)
  testCorpUserId = `test-corp-${Date.now()}`
  testEmployeeUserId = `test-emp-${Date.now()}`

  await prisma.user.create({
    data: {
      id: testCorpUserId,
      firstName: 'TestCorp',
      lastName: 'Admin',
      email: `corp-${Date.now()}@test.com`,
      password: 'hashed',
      phone: '+230 5000 0001',
      userType: 'DOCTOR',
      verified: true,
      accountStatus: 'active',
    },
  })
  cleanupIds.users.push(testCorpUserId)

  // Create company profile for corp admin
  const profile = await prisma.corporateAdminProfile.create({
    data: {
      userId: testCorpUserId,
      companyName: 'Test Corp Ltd',
      registrationNumber: 'TEST-001',
    },
  })
  cleanupIds.profiles.push(profile.id)

  // Create test employee user
  await prisma.user.create({
    data: {
      id: testEmployeeUserId,
      firstName: 'TestEmployee',
      lastName: 'User',
      email: `emp-${Date.now()}@test.com`,
      password: 'hashed',
      phone: '+230 5000 0002',
      userType: 'PATIENT',
      verified: true,
      accountStatus: 'active',
    },
  })
  cleanupIds.users.push(testEmployeeUserId)

  // Create wallets with large balances
  for (const uid of [testCorpUserId, testEmployeeUserId]) {
    await prisma.userWallet.upsert({
      where: { userId: uid },
      update: { balance: 999999 },
      create: { userId: uid, balance: 999999, currency: 'MUR' },
    })
  }

  // Find or create a corporate plan
  const existingPlan = await prisma.subscriptionPlan.findFirst({
    where: { type: 'corporate' },
  })
  if (existingPlan) {
    testPlanId = existingPlan.id
  } else {
    const plan = await prisma.subscriptionPlan.create({
      data: {
        name: 'Test Corporate Plan',
        slug: `test-corp-plan-${Date.now()}`,
        type: 'corporate',
        price: 100,
        currency: 'MUR',
        features: ['consultations', 'prescriptions'],
        discounts: { volume_50: 10, volume_100: 20, volume_300: 30, volume_1000: 40 },
      },
    })
    testPlanId = plan.id
  }
})

afterAll(async () => {
  // Cleanup in reverse dependency order
  await prisma.userSubscription.deleteMany({ where: { userId: { in: cleanupIds.users } } })
  await prisma.walletTransaction.deleteMany({
    where: { wallet: { userId: { in: cleanupIds.users } } },
  }).catch(() => {})
  await prisma.notification.deleteMany({ where: { userId: { in: cleanupIds.users } } })
  await prisma.corporateEmployee.deleteMany({ where: { corporateAdminId: testCorpUserId } })
  await prisma.corporateAdminProfile.deleteMany({ where: { userId: testCorpUserId } })
  await prisma.userWallet.deleteMany({ where: { userId: { in: cleanupIds.users } } })
  await prisma.user.deleteMany({ where: { id: { in: cleanupIds.users } } })
  await prisma.$disconnect()
})

// ═══════════════════════════════════════════════════════════════════════════
// 1. REGISTRATION FLOW
// ═══════════════════════════════════════════════════════════════════════════

describe('Registration: user creation', () => {
  it('created test users exist in database', async () => {
    const corp = await prisma.user.findUnique({ where: { id: testCorpUserId } })
    expect(corp).not.toBeNull()
    expect(corp!.userType).toBe('DOCTOR')
    expect(corp!.verified).toBe(true)

    const emp = await prisma.user.findUnique({ where: { id: testEmployeeUserId } })
    expect(emp).not.toBeNull()
    expect(emp!.userType).toBe('PATIENT')
  })

  it('corporate admin has company profile', async () => {
    const profile = await prisma.corporateAdminProfile.findFirst({
      where: { userId: testCorpUserId },
    })
    expect(profile).not.toBeNull()
    expect(profile!.companyName).toBe('Test Corp Ltd')
  })

  it('both users have wallets', async () => {
    const corpWallet = await prisma.userWallet.findUnique({ where: { userId: testCorpUserId } })
    const empWallet = await prisma.userWallet.findUnique({ where: { userId: testEmployeeUserId } })

    expect(corpWallet).not.toBeNull()
    expect(corpWallet!.balance).toBe(999999)
    expect(empWallet).not.toBeNull()
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// 2. WALLET & PAYMENT OPERATIONS
// ═══════════════════════════════════════════════════════════════════════════

describe('Wallet operations', () => {
  it('can debit wallet', async () => {
    const before = await prisma.userWallet.findUnique({ where: { userId: testCorpUserId } })
    await prisma.userWallet.update({
      where: { userId: testCorpUserId },
      data: { balance: { decrement: 100 } },
    })
    const after = await prisma.userWallet.findUnique({ where: { userId: testCorpUserId } })
    expect(after!.balance).toBe(before!.balance - 100)

    // Restore
    await prisma.userWallet.update({
      where: { userId: testCorpUserId },
      data: { balance: 999999 },
    })
  })

  it('can create wallet transaction record', async () => {
    const wallet = await prisma.userWallet.findUnique({ where: { userId: testCorpUserId } })
    const tx = await prisma.walletTransaction.create({
      data: {
        walletId: wallet!.id,
        type: 'debit',
        amount: 50,
        description: 'Test debit',
        serviceType: 'test',
        balanceBefore: wallet!.balance,
        balanceAfter: wallet!.balance - 50,
        status: 'completed',
      },
    })
    expect(tx.amount).toBe(50)
    expect(tx.type).toBe('debit')
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// 3. VOLUME DISCOUNT CALCULATION
// ═══════════════════════════════════════════════════════════════════════════

describe('Volume discount calculation', () => {
  const discounts = { volume_50: 10, volume_100: 20, volume_300: 30, volume_1000: 40 }

  it('no discount under 50 employees', () => {
    expect(getVolumeDiscount(10, discounts)).toEqual({ discountPercent: 0, tier: 'standard' })
    expect(getVolumeDiscount(49, discounts)).toEqual({ discountPercent: 0, tier: 'standard' })
  })

  it('10% discount for 50-99 employees', () => {
    expect(getVolumeDiscount(50, discounts)).toEqual({ discountPercent: 10, tier: '50-99' })
    expect(getVolumeDiscount(99, discounts)).toEqual({ discountPercent: 10, tier: '50-99' })
  })

  it('20% discount for 100-299 employees', () => {
    expect(getVolumeDiscount(100, discounts)).toEqual({ discountPercent: 20, tier: '100-299' })
    expect(getVolumeDiscount(299, discounts)).toEqual({ discountPercent: 20, tier: '100-299' })
  })

  it('30% discount for 300-999 employees', () => {
    expect(getVolumeDiscount(300, discounts)).toEqual({ discountPercent: 30, tier: '300-999' })
  })

  it('40% discount for 1000+ employees', () => {
    expect(getVolumeDiscount(1000, discounts)).toEqual({ discountPercent: 40, tier: '1000+' })
    expect(getVolumeDiscount(5000, discounts)).toEqual({ discountPercent: 40, tier: '1000+' })
  })

  it('no discount when discounts is null', () => {
    expect(getVolumeDiscount(100, null)).toEqual({ discountPercent: 0, tier: 'standard' })
  })
})

describe('Corporate plan cost calculation', () => {
  it('calculates without discount for small team', () => {
    const cost = calculateCorporatePlanCost({
      planPrice: 100,
      employeeCount: 10,
      discounts: { volume_50: 10 },
    })
    expect(cost.pricePerEmployee).toBe(100)
    expect(cost.volumeDiscountPercent).toBe(0)
    expect(cost.discountedPricePerEmployee).toBe(100)
    expect(cost.totalMonthly).toBe(1000) // 100 * 10
  })

  it('applies 10% discount for 50 employees', () => {
    const cost = calculateCorporatePlanCost({
      planPrice: 100,
      employeeCount: 50,
      discounts: { volume_50: 10 },
    })
    expect(cost.discountedPricePerEmployee).toBe(90) // 100 - 10%
    expect(cost.totalMonthly).toBe(4500) // 90 * 50
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// 4. CORPORATE BILLING CASCADE — INVITE → APPROVE → ENROLL
// ═══════════════════════════════════════════════════════════════════════════

describe('Corporate billing cascade: invited employee inherits company plan', () => {
  it('step 1: invite employee (create CorporateEmployee)', async () => {
    const enrollment = await prisma.corporateEmployee.create({
      data: {
        corporateAdminId: testCorpUserId,
        userId: testEmployeeUserId,
        status: 'pending',
      },
    })
    cleanupIds.employees.push(enrollment.id)
    expect(enrollment.status).toBe('pending')
  })

  it('step 2: approve employee', async () => {
    const employee = await prisma.corporateEmployee.findFirst({
      where: { corporateAdminId: testCorpUserId, userId: testEmployeeUserId },
    })
    expect(employee).not.toBeNull()

    await prisma.corporateEmployee.update({
      where: { id: employee!.id },
      data: { status: 'active', approvedAt: new Date() },
    })

    const updated = await prisma.corporateEmployee.findUnique({ where: { id: employee!.id } })
    expect(updated!.status).toBe('active')
  })

  it('step 3: enroll employees in corporate plan — billing cascade', async () => {
    // Reset wallet
    await prisma.userWallet.update({
      where: { userId: testCorpUserId },
      data: { balance: 999999 },
    })

    const result = await enrollEmployeesInPlan({
      corporateAdminUserId: testCorpUserId,
      planId: testPlanId,
    })

    expect(result.success).toBe(true)
    expect(result.enrolled).toBeGreaterThanOrEqual(1)
    expect(result.totalCost).toBeGreaterThan(0)
  })

  it('step 4: employee now has active subscription linked to corporate admin', async () => {
    const subscription = await prisma.userSubscription.findUnique({
      where: { userId: testEmployeeUserId },
    })

    expect(subscription).not.toBeNull()
    expect(subscription!.status).toBe('active')
    expect(subscription!.planId).toBe(testPlanId)
    expect(subscription!.corporateAdminId).toBe(testCorpUserId)
  })

  it('step 5: corporate admin wallet was debited', async () => {
    const wallet = await prisma.userWallet.findUnique({ where: { userId: testCorpUserId } })
    expect(wallet!.balance).toBeLessThan(999999)
  })

  it('step 6: debit transaction was recorded', async () => {
    const wallet = await prisma.userWallet.findUnique({ where: { userId: testCorpUserId } })
    const tx = await prisma.walletTransaction.findFirst({
      where: { walletId: wallet!.id, serviceType: 'subscription' },
      orderBy: { createdAt: 'desc' },
    })
    expect(tx).not.toBeNull()
    expect(tx!.type).toBe('debit')
    expect(tx!.amount).toBeGreaterThan(0)
    expect(tx!.description).toContain('employee')
  })
})

describe('Corporate billing: edge cases', () => {
  it('fails when no active employees', async () => {
    // Create user with company but no employees
    const loneUserId = `test-lone-${Date.now()}`
    await prisma.user.create({
      data: {
        id: loneUserId, firstName: 'Lone', lastName: 'Admin',
        email: `lone-${Date.now()}@test.com`, password: 'h', phone: '+230 5000 0099',
        userType: 'DOCTOR', verified: true, accountStatus: 'active',
      },
    })
    cleanupIds.users.push(loneUserId)

    const result = await enrollEmployeesInPlan({
      corporateAdminUserId: loneUserId,
      planId: testPlanId,
    })
    expect(result.success).toBe(false)
    expect(result.error).toContain('No active employees')
  })

  it('fails with invalid plan', async () => {
    const result = await enrollEmployeesInPlan({
      corporateAdminUserId: testCorpUserId,
      planId: 'fake-plan-id',
    })
    expect(result.success).toBe(false)
    expect(result.error).toContain('Invalid')
  })

  it('fails with insufficient wallet balance', async () => {
    // Set wallet to 0
    await prisma.userWallet.update({
      where: { userId: testCorpUserId },
      data: { balance: 0 },
    })

    const result = await enrollEmployeesInPlan({
      corporateAdminUserId: testCorpUserId,
      planId: testPlanId,
    })
    expect(result.success).toBe(false)
    expect(result.error).toContain('INSUFFICIENT_BALANCE')

    // Restore
    await prisma.userWallet.update({
      where: { userId: testCorpUserId },
      data: { balance: 999999 },
    })
  })
})
