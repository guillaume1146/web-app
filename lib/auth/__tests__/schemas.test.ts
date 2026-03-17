import { describe, it, expect } from 'vitest'
import { loginSchema, registerSchema } from '../schemas'

describe('loginSchema', () => {
  it('accepts email and password only (no userType)', () => {
    const result = loginSchema.safeParse({
      email: 'test@example.com',
      password: '123456',
    })
    expect(result.success).toBe(true)
  })

  it('accepts email, password, and optional userType', () => {
    const result = loginSchema.safeParse({
      email: 'test@example.com',
      password: '123456',
      userType: 'patient',
    })
    expect(result.success).toBe(true)
  })

  it('rejects invalid email', () => {
    const result = loginSchema.safeParse({
      email: 'not-an-email',
      password: '123456',
    })
    expect(result.success).toBe(false)
  })

  it('rejects short password', () => {
    const result = loginSchema.safeParse({
      email: 'test@example.com',
      password: '12',
    })
    expect(result.success).toBe(false)
  })

  it('rejects empty email', () => {
    const result = loginSchema.safeParse({
      email: '',
      password: '123456',
    })
    expect(result.success).toBe(false)
  })

  it('rejects missing password', () => {
    const result = loginSchema.safeParse({
      email: 'test@example.com',
    })
    expect(result.success).toBe(false)
  })
})

describe('registerSchema', () => {
  const validBase = {
    fullName: 'John Doe',
    email: 'john@example.com',
    password: 'pass123',
    confirmPassword: 'pass123',
    phone: '+23012345678',
    dateOfBirth: '1990-01-01',
    gender: 'male',
    address: '123 Main St',
    userType: 'patient',
    agreeToTerms: true,
    agreeToPrivacy: true,
    agreeToDisclaimer: true,
  }

  it('accepts valid patient registration', () => {
    const result = registerSchema.safeParse(validBase)
    expect(result.success).toBe(true)
  })

  it('rejects when passwords do not match', () => {
    const result = registerSchema.safeParse({
      ...validBase,
      confirmPassword: 'different',
    })
    expect(result.success).toBe(false)
  })

  it('rejects when terms not accepted', () => {
    const result = registerSchema.safeParse({
      ...validBase,
      agreeToTerms: false,
    })
    expect(result.success).toBe(false)
  })

  it('accepts doctor registration with optional professional fields', () => {
    const result = registerSchema.safeParse({
      ...validBase,
      userType: 'doctor',
      licenseNumber: 'DOC-1234',
      specialization: 'Cardiology',
      institution: 'General Hospital',
      experience: '10 years',
    })
    expect(result.success).toBe(true)
  })

  it('accepts corporate admin registration', () => {
    const result = registerSchema.safeParse({
      ...validBase,
      userType: 'corporate',
      companyName: 'Health Corp',
      companyRegistrationNumber: 'REG-001',
    })
    expect(result.success).toBe(true)
  })

  it('accepts registration with subscription plan selection', () => {
    const result = registerSchema.safeParse({
      ...validBase,
      selectedPlanId: 'plan-essential-mu',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.selectedPlanId).toBe('plan-essential-mu')
    }
  })

  it('accepts registration with both personal and business plan', () => {
    const result = registerSchema.safeParse({
      ...validBase,
      userType: 'corporate',
      companyName: 'Test Corp',
      selectedPlanId: 'plan-premium-mu',
      selectedBusinessPlanId: 'plan-corp-plus-mu',
    })
    expect(result.success).toBe(true)
  })

  it('accepts registration without plan (optional)', () => {
    const result = registerSchema.safeParse(validBase)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.selectedPlanId).toBeUndefined()
    }
  })

  it('accepts all user types', () => {
    const types = ['patient', 'doctor', 'nurse', 'nanny', 'pharmacist', 'lab', 'emergency', 'insurance', 'corporate', 'referral-partner', 'regional-admin']
    for (const userType of types) {
      const result = registerSchema.safeParse({ ...validBase, userType })
      expect(result.success).toBe(true)
    }
  })

  it('rejects unknown user type', () => {
    const result = registerSchema.safeParse({ ...validBase, userType: 'superadmin' })
    expect(result.success).toBe(false)
  })

  it('accepts patient with corporate enrollment', () => {
    const result = registerSchema.safeParse({
      ...validBase,
      enrolledInCompany: true,
      companyId: 'CAPROF001',
    })
    expect(result.success).toBe(true)
  })
})
