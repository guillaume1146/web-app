import { NextRequest, NextResponse } from 'next/server'
import { validateRequest } from '@/lib/auth/validate'
import { rateLimitAuth } from '@/lib/rate-limit'
import { randomUUID } from 'crypto'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB for CMS images
const ALLOWED_TYPES = new Map([
  ['image/jpeg', '.jpg'],
  ['image/png', '.png'],
  ['image/webp', '.webp'],
])

/**
 * POST /api/upload/cms
 * Upload CMS images (hero slides, testimonials, etc.)
 * Requires admin or regional-admin role.
 * Stores in public/uploads/cms/{year}/{month}/{fileId}.{ext}
 */
export async function POST(request: NextRequest) {
  const limited = rateLimitAuth(request)
  if (limited) return limited

  const auth = validateRequest(request)
  if (!auth) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
  }

  // Only admins and regional admins can upload CMS images
  if (!['admin', 'regional-admin'].includes(auth.userType)) {
    return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ success: false, message: 'No file provided' }, { status: 400 })
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, message: 'File too large. Maximum size is 5MB.' },
        { status: 400 }
      )
    }

    const ext = ALLOWED_TYPES.get(file.type)
    if (!ext) {
      return NextResponse.json(
        { success: false, message: 'File type not allowed. Accepted: JPG, PNG, WebP.' },
        { status: 400 }
      )
    }

    const now = new Date()
    const year = now.getFullYear().toString()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const fileId = randomUUID()
    const fileName = `${fileId}${ext}`
    const relativeDir = `uploads/cms/${year}/${month}`
    const relativePath = `${relativeDir}/${fileName}`

    const absoluteDir = path.join(process.cwd(), 'public', relativeDir)
    await mkdir(absoluteDir, { recursive: true })

    const buffer = Buffer.from(await file.arrayBuffer())
    await writeFile(path.join(absoluteDir, fileName), buffer)

    return NextResponse.json(
      {
        success: true,
        data: {
          url: `/${relativePath}`,
          fileName: file.name,
          size: file.size,
          type: file.type,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('POST /api/upload/cms error:', error)
    return NextResponse.json({ success: false, message: 'Upload failed' }, { status: 500 })
  }
}
