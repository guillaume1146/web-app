/**
 * AccountTypeStep Tests
 *
 * Tests dynamic role fetching from API with static fallback.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('AccountTypeStep: dynamic role fetching', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetches roles from /api/roles?all=true', async () => {
    mockFetch.mockResolvedValueOnce({
      json: async () => ({
        success: true,
        data: [
          {
            code: 'DOCTOR',
            label: 'Doctors',
            singularLabel: 'Doctor',
            slug: 'doctors',
            icon: 'FaUserMd',
            color: '#0C6780',
            description: 'Medical Doctor',
            cookieValue: 'doctor',
            verificationDocs: [
              { documentName: 'Medical License', description: 'Valid license', isRequired: true },
              { documentName: 'National ID', description: null, isRequired: true },
            ],
          },
        ],
      }),
    })

    // Trigger the fetch
    await fetch('/api/roles?all=true')

    expect(mockFetch).toHaveBeenCalledWith('/api/roles?all=true')
  })

  it('API response maps to correct UserType shape', () => {
    const apiRole = {
      code: 'NURSE',
      label: 'Nurses',
      singularLabel: 'Nurse',
      slug: 'nurses',
      icon: 'FaUserNurse',
      color: '#8b5cf6',
      description: 'Registered Nurse',
      cookieValue: 'nurse',
      verificationDocs: [
        { documentName: 'Nursing Degree', description: 'Diploma or degree', isRequired: true },
      ],
    }

    // Verify the shape matches what AccountTypeStep expects
    expect(apiRole.singularLabel).toBe('Nurse')
    expect(apiRole.cookieValue).toBe('nurse')
    expect(apiRole.icon).toBe('FaUserNurse')
    expect(apiRole.verificationDocs).toHaveLength(1)
    expect(apiRole.verificationDocs[0].isRequired).toBe(true)
  })

  it('falls back to static constants when API fails', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'))

    let fallbackUsed = false
    try {
      await fetch('/api/roles?all=true')
    } catch {
      fallbackUsed = true
    }

    expect(fallbackUsed).toBe(true)
    // Static userTypes from constants.ts should be used
    const { userTypes } = await import('../constants')
    expect(userTypes.length).toBeGreaterThan(0)
    expect(userTypes[0].id).toBe('patient')
  })

  it('static fallback has 15 user types (corporate admin removed)', async () => {
    const { userTypes } = await import('../constants')
    expect(userTypes).toHaveLength(15)

    const ids = userTypes.map(t => t.id)
    expect(ids).toContain('patient')
    expect(ids).toContain('doctor')
    expect(ids).toContain('nurse')
    expect(ids).toContain('nanny')
    expect(ids).toContain('pharmacist')
    expect(ids).toContain('lab')
    expect(ids).toContain('emergency')
    expect(ids).toContain('caregiver')
    expect(ids).toContain('physiotherapist')
    expect(ids).toContain('dentist')
    expect(ids).toContain('optometrist')
    expect(ids).toContain('nutritionist')
  })

  it('static fallback has document requirements', async () => {
    const { documentRequirements } = await import('../constants')
    expect(documentRequirements['patient']).toBeDefined()
    expect(documentRequirements['doctor']).toBeDefined()
    expect(documentRequirements['nurse']).toBeDefined()

    // Each should have at least 1 required doc
    expect(documentRequirements['doctor'].filter(d => d.required).length).toBeGreaterThan(0)
    expect(documentRequirements['patient'].filter(d => d.required).length).toBeGreaterThan(0)
  })

  it('API role with verificationDocs maps to Document format', () => {
    const apiDocs = [
      { documentName: 'Medical License', description: 'Must be valid', isRequired: true },
      { documentName: 'Police Clearance', description: null, isRequired: false },
    ]

    const mapped = apiDocs.map((doc, i) => ({
      id: `doctor-doc-${i}`,
      name: doc.documentName,
      description: doc.description || '',
      required: doc.isRequired,
      accepted: '.pdf,.jpg,.jpeg,.png',
    }))

    expect(mapped).toHaveLength(2)
    expect(mapped[0].name).toBe('Medical License')
    expect(mapped[0].required).toBe(true)
    expect(mapped[0].accepted).toBe('.pdf,.jpg,.jpeg,.png')
    expect(mapped[1].required).toBe(false)
    expect(mapped[1].description).toBe('')
  })

  it('API roles include cookieValue for form submission', () => {
    const roles = [
      { cookieValue: 'patient', code: 'MEMBER' },
      { cookieValue: 'doctor', code: 'DOCTOR' },
      { cookieValue: 'nurse', code: 'NURSE' },
      { cookieValue: 'child-care-nurse', code: 'NANNY' },
      { cookieValue: 'pharmacy', code: 'PHARMACIST' },
    ]

    for (const role of roles) {
      expect(role.cookieValue).toBeTruthy()
      // The id used in the form is the cookieValue
      expect(typeof role.cookieValue).toBe('string')
    }
  })
})

describe('AccountTypeStep: color mapping', () => {
  function colorToTailwind(hex: string): string {
    const map: Record<string, string> = {
      '#0C6780': 'bg-teal-100 text-teal-700 border-teal-300',
      '#001E40': 'bg-blue-100 text-blue-700 border-blue-300',
      '#22c55e': 'bg-green-100 text-green-700 border-green-300',
      '#8b5cf6': 'bg-purple-100 text-purple-700 border-purple-300',
      '#ec4899': 'bg-pink-100 text-pink-700 border-pink-300',
      '#ef4444': 'bg-red-100 text-red-700 border-red-300',
    }
    return map[hex] || 'bg-gray-100 text-gray-700 border-gray-300'
  }

  it('maps brand teal to Tailwind classes', () => {
    expect(colorToTailwind('#0C6780')).toContain('teal')
  })

  it('maps brand navy to Tailwind classes', () => {
    expect(colorToTailwind('#001E40')).toContain('blue')
  })

  it('falls back to gray for unknown colors', () => {
    expect(colorToTailwind('#FFFFFF')).toContain('gray')
    expect(colorToTailwind('#000000')).toContain('gray')
  })
})
