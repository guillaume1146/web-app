import { describe, it, expect, vi, beforeEach } from 'vitest'

// ─── Mock dependencies before importing routes ────────────────────────────────

vi.mock('@/lib/db', () => ({
  default: {
    user: { findUnique: vi.fn() },
    providerInventoryItem: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
  },
}))

vi.mock('@/lib/auth/validate', () => ({
  validateRequest: vi.fn(),
}))

vi.mock('@/lib/rate-limit', () => ({
  rateLimitAuth: vi.fn(() => null),
  rateLimitPublic: vi.fn(() => null),
}))

vi.mock('@/lib/inventory/repository', () => ({
  findItemsByProvider: vi.fn(),
  findItemById: vi.fn(),
  createItem: vi.fn(),
  updateItem: vi.fn(),
  deactivateItem: vi.fn(),
  searchItems: vi.fn(),
}))

vi.mock('@/lib/inventory/types', () => ({
  SHOP_CATEGORIES: [
    { key: 'medication', label: 'Medications', icon: 'Pill' },
    { key: 'vitamins', label: 'Vitamins & Supplements', icon: 'Leaf' },
    { key: 'first_aid', label: 'First Aid', icon: 'Plus' },
  ],
}))

// ─── Imports (after mocks) ────────────────────────────────────────────────────

import { GET, POST } from '../inventory/route'
import { PATCH, DELETE } from '../inventory/[id]/route'
import { GET as shopGET } from '../search/health-shop/route'
import prisma from '@/lib/db'
import { validateRequest } from '@/lib/auth/validate'
import * as repo from '@/lib/inventory/repository'
import { NextRequest } from 'next/server'

// ─── Typed mock references ────────────────────────────────────────────────────

const mockedValidate = vi.mocked(validateRequest)
const mockedRepo = vi.mocked(repo)
const mockedPrisma = vi.mocked(prisma, true)

// ─── Helpers ──────────────────────────────────────────────────────────────────

function createGetRequest(url: string) {
  return new NextRequest(`http://localhost:3000${url}`, { method: 'GET' })
}

function createPostRequest(url: string, body: Record<string, unknown>) {
  return new NextRequest(`http://localhost:3000${url}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function createPatchRequest(url: string, body: Record<string, unknown>) {
  return new NextRequest(`http://localhost:3000${url}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function createDeleteRequest(url: string) {
  return new NextRequest(`http://localhost:3000${url}`, { method: 'DELETE' })
}

const mockParams = (id: string) => ({ params: Promise.resolve({ id }) })

const sampleItem = {
  id: 'inv-001',
  providerUserId: 'user-pharm-1',
  providerType: 'PHARMACIST',
  name: 'Paracetamol 500mg',
  genericName: 'Paracetamol',
  category: 'medication',
  description: 'Pain reliever and fever reducer',
  price: 150,
  quantity: 100,
  unitOfMeasure: 'unit',
  minStockAlert: 5,
  requiresPrescription: false,
  isFeatured: false,
  isActive: true,
  inStock: true,
  sideEffects: [],
  createdAt: new Date(),
  updatedAt: new Date(),
}

const validCreateBody = {
  name: 'Vitamin C 1000mg',
  category: 'vitamins',
  price: 250,
  quantity: 50,
}

// ─── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
})

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/inventory
// ═══════════════════════════════════════════════════════════════════════════════

describe('GET /api/inventory', () => {
  it('returns provider items when authenticated', async () => {
    mockedValidate.mockReturnValue({ sub: 'user-pharm-1', userType: 'PHARMACIST' } as any)
    mockedRepo.findItemsByProvider.mockResolvedValue([sampleItem] as any)

    const response = await GET(createGetRequest('/api/inventory'))
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.data).toHaveLength(1)
    expect(json.data[0].name).toBe('Paracetamol 500mg')
    expect(mockedRepo.findItemsByProvider).toHaveBeenCalledWith('user-pharm-1')
  })

  it('returns empty array when provider has no items', async () => {
    mockedValidate.mockReturnValue({ sub: 'user-pharm-2', userType: 'PHARMACIST' } as any)
    mockedRepo.findItemsByProvider.mockResolvedValue([] as any)

    const response = await GET(createGetRequest('/api/inventory'))
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.data).toHaveLength(0)
  })

  it('returns 401 when not authenticated', async () => {
    mockedValidate.mockReturnValue(null as any)

    const response = await GET(createGetRequest('/api/inventory'))
    const json = await response.json()

    expect(response.status).toBe(401)
    expect(json.success).toBe(false)
    expect(json.message).toBe('Unauthorized')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/inventory
// ═══════════════════════════════════════════════════════════════════════════════

describe('POST /api/inventory', () => {
  it('creates item with valid data', async () => {
    mockedValidate.mockReturnValue({ sub: 'user-pharm-1', userType: 'PHARMACIST' } as any)
    mockedPrisma.user.findUnique.mockResolvedValue({ userType: 'PHARMACIST' } as any)
    const createdItem = { id: 'inv-new', ...validCreateBody, providerUserId: 'user-pharm-1', providerType: 'PHARMACIST' }
    mockedRepo.createItem.mockResolvedValue(createdItem as any)

    const response = await POST(createPostRequest('/api/inventory', validCreateBody))
    const json = await response.json()

    expect(response.status).toBe(201)
    expect(json.success).toBe(true)
    expect(json.data.name).toBe('Vitamin C 1000mg')
    expect(mockedRepo.createItem).toHaveBeenCalledWith('user-pharm-1', 'PHARMACIST', expect.objectContaining({
      name: 'Vitamin C 1000mg',
      category: 'vitamins',
      price: 250,
      quantity: 50,
    }))
  })

  it('returns 400 for missing required fields (no name)', async () => {
    mockedValidate.mockReturnValue({ sub: 'user-pharm-1', userType: 'PHARMACIST' } as any)

    const response = await POST(createPostRequest('/api/inventory', {
      category: 'vitamins',
      price: 250,
      quantity: 50,
    }))
    const json = await response.json()

    expect(response.status).toBe(400)
    expect(json.success).toBe(false)
    expect(json.message).toBeDefined()
  })

  it('returns 400 for missing required fields (no price)', async () => {
    mockedValidate.mockReturnValue({ sub: 'user-pharm-1', userType: 'PHARMACIST' } as any)

    const response = await POST(createPostRequest('/api/inventory', {
      name: 'Test Item',
      category: 'vitamins',
      quantity: 50,
    }))
    const json = await response.json()

    expect(response.status).toBe(400)
    expect(json.success).toBe(false)
  })

  it('returns 400 for invalid price (negative)', async () => {
    mockedValidate.mockReturnValue({ sub: 'user-pharm-1', userType: 'PHARMACIST' } as any)

    const response = await POST(createPostRequest('/api/inventory', {
      name: 'Bad Item',
      category: 'medication',
      price: -10,
      quantity: 5,
    }))
    const json = await response.json()

    expect(response.status).toBe(400)
    expect(json.success).toBe(false)
  })

  it('returns 401 when not authenticated', async () => {
    mockedValidate.mockReturnValue(null as any)

    const response = await POST(createPostRequest('/api/inventory', validCreateBody))
    const json = await response.json()

    expect(response.status).toBe(401)
    expect(json.success).toBe(false)
    expect(json.message).toBe('Unauthorized')
  })

  it('returns 404 when user not found in database', async () => {
    mockedValidate.mockReturnValue({ sub: 'ghost-user', userType: 'PHARMACIST' } as any)
    mockedPrisma.user.findUnique.mockResolvedValue(null)

    const response = await POST(createPostRequest('/api/inventory', validCreateBody))
    const json = await response.json()

    expect(response.status).toBe(404)
    expect(json.success).toBe(false)
    expect(json.message).toBe('User not found')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// PATCH /api/inventory/[id]
// ═══════════════════════════════════════════════════════════════════════════════

describe('PATCH /api/inventory/[id]', () => {
  it('updates item fields (price, quantity, name)', async () => {
    mockedValidate.mockReturnValue({ sub: 'user-pharm-1', userType: 'PHARMACIST' } as any)
    mockedRepo.findItemById.mockResolvedValue(sampleItem as any)
    const updated = { ...sampleItem, price: 200, quantity: 80, name: 'Paracetamol 1000mg' }
    mockedRepo.updateItem.mockResolvedValue(updated as any)

    const response = await PATCH(
      createPatchRequest('/api/inventory/inv-001', { price: 200, quantity: 80, name: 'Paracetamol 1000mg' }),
      mockParams('inv-001')
    )
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.data.price).toBe(200)
    expect(json.data.name).toBe('Paracetamol 1000mg')
    expect(mockedRepo.updateItem).toHaveBeenCalledWith('inv-001', { price: 200, quantity: 80, name: 'Paracetamol 1000mg' })
  })

  it('returns 403 if not item owner', async () => {
    mockedValidate.mockReturnValue({ sub: 'other-user', userType: 'PHARMACIST' } as any)
    mockedRepo.findItemById.mockResolvedValue(sampleItem as any)

    const response = await PATCH(
      createPatchRequest('/api/inventory/inv-001', { price: 999 }),
      mockParams('inv-001')
    )
    const json = await response.json()

    expect(response.status).toBe(403)
    expect(json.success).toBe(false)
    expect(json.message).toBe('Forbidden')
  })

  it('returns 404 if item does not exist', async () => {
    mockedValidate.mockReturnValue({ sub: 'user-pharm-1', userType: 'PHARMACIST' } as any)
    mockedRepo.findItemById.mockResolvedValue(null)

    const response = await PATCH(
      createPatchRequest('/api/inventory/nonexistent', { price: 100 }),
      mockParams('nonexistent')
    )
    const json = await response.json()

    expect(response.status).toBe(404)
    expect(json.success).toBe(false)
    expect(json.message).toBe('Item not found')
  })

  it('returns 401 when not authenticated', async () => {
    mockedValidate.mockReturnValue(null as any)

    const response = await PATCH(
      createPatchRequest('/api/inventory/inv-001', { price: 200 }),
      mockParams('inv-001')
    )
    const json = await response.json()

    expect(response.status).toBe(401)
    expect(json.success).toBe(false)
    expect(json.message).toBe('Unauthorized')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// DELETE /api/inventory/[id]
// ═══════════════════════════════════════════════════════════════════════════════

describe('DELETE /api/inventory/[id]', () => {
  it('deactivates item (sets isActive: false)', async () => {
    mockedValidate.mockReturnValue({ sub: 'user-pharm-1', userType: 'PHARMACIST' } as any)
    mockedRepo.findItemById.mockResolvedValue(sampleItem as any)
    mockedRepo.deactivateItem.mockResolvedValue({ ...sampleItem, isActive: false } as any)

    const response = await DELETE(
      createDeleteRequest('/api/inventory/inv-001'),
      mockParams('inv-001')
    )
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.data.id).toBe('inv-001')
    expect(json.data.deactivated).toBe(true)
    expect(mockedRepo.deactivateItem).toHaveBeenCalledWith('inv-001')
  })

  it('returns 403 if not item owner', async () => {
    mockedValidate.mockReturnValue({ sub: 'other-user', userType: 'PHARMACIST' } as any)
    mockedRepo.findItemById.mockResolvedValue(sampleItem as any)

    const response = await DELETE(
      createDeleteRequest('/api/inventory/inv-001'),
      mockParams('inv-001')
    )
    const json = await response.json()

    expect(response.status).toBe(403)
    expect(json.success).toBe(false)
    expect(json.message).toBe('Forbidden')
    expect(mockedRepo.deactivateItem).not.toHaveBeenCalled()
  })

  it('returns 404 if item does not exist', async () => {
    mockedValidate.mockReturnValue({ sub: 'user-pharm-1', userType: 'PHARMACIST' } as any)
    mockedRepo.findItemById.mockResolvedValue(null)

    const response = await DELETE(
      createDeleteRequest('/api/inventory/nonexistent'),
      mockParams('nonexistent')
    )
    const json = await response.json()

    expect(response.status).toBe(404)
    expect(json.success).toBe(false)
    expect(json.message).toBe('Item not found')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/search/health-shop
// ═══════════════════════════════════════════════════════════════════════════════

describe('GET /api/search/health-shop', () => {
  const shopItems = [
    { ...sampleItem, id: 'inv-001' },
    { ...sampleItem, id: 'inv-002', name: 'Ibuprofen 400mg', price: 200 },
  ]

  it('returns items with pagination defaults', async () => {
    mockedRepo.searchItems.mockResolvedValue({ items: shopItems, total: 2 } as any)

    const response = await shopGET(createGetRequest('/api/search/health-shop'))
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.data.items).toHaveLength(2)
    expect(json.data.total).toBe(2)
    expect(json.data.limit).toBe(20)
    expect(json.data.offset).toBe(0)
    expect(json.data.categories).toBeDefined()
    expect(json.data.categories).toHaveLength(3)
    expect(mockedRepo.searchItems).toHaveBeenCalledWith({
      query: undefined,
      category: undefined,
      providerType: undefined,
      limit: 20,
      offset: 0,
    })
  })

  it('filters by category', async () => {
    mockedRepo.searchItems.mockResolvedValue({ items: [shopItems[0]], total: 1 } as any)

    const response = await shopGET(createGetRequest('/api/search/health-shop?category=medication'))
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.data.items).toHaveLength(1)
    expect(mockedRepo.searchItems).toHaveBeenCalledWith(expect.objectContaining({
      category: 'medication',
    }))
  })

  it('filters by providerType', async () => {
    mockedRepo.searchItems.mockResolvedValue({ items: shopItems, total: 2 } as any)

    const response = await shopGET(createGetRequest('/api/search/health-shop?providerType=PHARMACIST'))
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.success).toBe(true)
    expect(mockedRepo.searchItems).toHaveBeenCalledWith(expect.objectContaining({
      providerType: 'PHARMACIST',
    }))
  })

  it('text search by query', async () => {
    mockedRepo.searchItems.mockResolvedValue({ items: [shopItems[1]], total: 1 } as any)

    const response = await shopGET(createGetRequest('/api/search/health-shop?q=ibuprofen'))
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.data.items).toHaveLength(1)
    expect(mockedRepo.searchItems).toHaveBeenCalledWith(expect.objectContaining({
      query: 'ibuprofen',
    }))
  })

  it('returns empty array for no matches', async () => {
    mockedRepo.searchItems.mockResolvedValue({ items: [], total: 0 } as any)

    const response = await shopGET(createGetRequest('/api/search/health-shop?q=nonexistent-drug'))
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.data.items).toHaveLength(0)
    expect(json.data.total).toBe(0)
  })

  it('respects custom limit and offset', async () => {
    mockedRepo.searchItems.mockResolvedValue({ items: [shopItems[1]], total: 2 } as any)

    const response = await shopGET(createGetRequest('/api/search/health-shop?limit=1&offset=1'))
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.data.limit).toBe(1)
    expect(json.data.offset).toBe(1)
    expect(mockedRepo.searchItems).toHaveBeenCalledWith(expect.objectContaining({
      limit: 1,
      offset: 1,
    }))
  })

  it('caps limit at 50', async () => {
    mockedRepo.searchItems.mockResolvedValue({ items: [], total: 0 } as any)

    await shopGET(createGetRequest('/api/search/health-shop?limit=100'))

    expect(mockedRepo.searchItems).toHaveBeenCalledWith(expect.objectContaining({
      limit: 50,
    }))
  })
})
