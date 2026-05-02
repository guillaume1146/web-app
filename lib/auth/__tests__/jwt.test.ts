import { describe, it, expect } from 'vitest'
import { signToken, verifyToken, type JwtPayload } from '../jwt'

describe('signToken', () => {
  it('generates a non-empty string token', () => {
    const payload: JwtPayload = {
      sub: '550e8400-e29b-41d4-a716-446655440000',
      userType: 'MEMBER',
      email: 'patient@example.com',
    }
    const token = signToken(payload)
    expect(typeof token).toBe('string')
    expect(token.length).toBeGreaterThan(0)
  })

  it('generates a JWT with three dot-separated parts', () => {
    const payload: JwtPayload = {
      sub: '550e8400-e29b-41d4-a716-446655440000',
      userType: 'DOCTOR',
      email: 'doctor@example.com',
    }
    const token = signToken(payload)
    const parts = token.split('.')
    expect(parts).toHaveLength(3)
  })

  it('generates different tokens for different payloads', () => {
    const token1 = signToken({
      sub: '550e8400-e29b-41d4-a716-446655440001',
      userType: 'MEMBER',
      email: 'patient1@example.com',
    })
    const token2 = signToken({
      sub: '550e8400-e29b-41d4-a716-446655440002',
      userType: 'DOCTOR',
      email: 'doctor1@example.com',
    })
    expect(token1).not.toBe(token2)
  })
})

describe('verifyToken', () => {
  it('returns the payload for a valid token', () => {
    const payload: JwtPayload = {
      sub: '550e8400-e29b-41d4-a716-446655440000',
      userType: 'MEMBER',
      email: 'patient@example.com',
    }
    const token = signToken(payload)
    const result = verifyToken(token)

    expect(result).not.toBeNull()
    expect(result!.sub).toBe(payload.sub)
    expect(result!.userType).toBe(payload.userType)
    expect(result!.email).toBe(payload.email)
  })

  it('returns null for an invalid token', () => {
    const result = verifyToken('invalid.token.string')
    expect(result).toBeNull()
  })

  it('returns null for an empty string', () => {
    const result = verifyToken('')
    expect(result).toBeNull()
  })

  it('returns null for a tampered token', () => {
    const payload: JwtPayload = {
      sub: '550e8400-e29b-41d4-a716-446655440000',
      userType: 'MEMBER',
      email: 'patient@example.com',
    }
    const token = signToken(payload)
    // Tamper with the signature by altering the last character
    const tampered = token.slice(0, -1) + (token.slice(-1) === 'A' ? 'B' : 'A')
    const result = verifyToken(tampered)
    expect(result).toBeNull()
  })

  it('decoded payload contains iat and exp claims', () => {
    const payload: JwtPayload = {
      sub: '550e8400-e29b-41d4-a716-446655440000',
      userType: 'NURSE',
      email: 'nurse@example.com',
    }
    const token = signToken(payload)
    const result = verifyToken(token) as unknown as Record<string, unknown>

    expect(result).not.toBeNull()
    expect(result.iat).toBeDefined()
    expect(result.exp).toBeDefined()
    expect(typeof result.iat).toBe('number')
    expect(typeof result.exp).toBe('number')
  })
})
