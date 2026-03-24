import { NextRequest, NextResponse } from 'next/server'
import { validateRequest } from '@/lib/auth/validate'
import { rateLimitAuth } from '@/lib/rate-limit'
import { templateRepo } from '@/lib/workflow'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const limited = rateLimitAuth(request)
  if (limited) return limited

  const auth = validateRequest(request)
  if (!auth) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id } = await params
    const template = await templateRepo.findTemplateById(id)

    if (!template) {
      return NextResponse.json({ success: false, message: 'Template not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: template })
  } catch (error) {
    console.error('GET /api/workflow/templates/[id] error:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const limited = rateLimitAuth(request)
  if (limited) return limited

  const auth = validateRequest(request)
  if (!auth) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id } = await params
    const existing = await templateRepo.findTemplateById(id)

    if (!existing) {
      return NextResponse.json({ success: false, message: 'Template not found' }, { status: 404 })
    }

    const body = await request.json()

    // Linking a service (platformServiceId) is allowed even on default templates
    const isLinkOnly = Object.keys(body).length === 1 && 'platformServiceId' in body

    if (!isLinkOnly) {
      // Only owner or admin can edit content
      if (existing.createdByProviderId && existing.createdByProviderId !== auth.sub) {
        return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 })
      }

      if (existing.isDefault) {
        return NextResponse.json(
          { success: false, message: 'Cannot modify system default templates' },
          { status: 403 }
        )
      }
    }

    const template = await templateRepo.updateTemplate(id, {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.isActive !== undefined && { isActive: body.isActive }),
      ...(body.steps !== undefined && { steps: body.steps }),
      ...(body.transitions !== undefined && { transitions: body.transitions }),
      ...('platformServiceId' in body && { platformServiceId: body.platformServiceId }),
    })

    return NextResponse.json({ success: true, data: template })
  } catch (error) {
    console.error('PATCH /api/workflow/templates/[id] error:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const limited = rateLimitAuth(request)
  if (limited) return limited

  const auth = validateRequest(request)
  if (!auth) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id } = await params
    const existing = await templateRepo.findTemplateById(id)

    if (!existing) {
      return NextResponse.json({ success: false, message: 'Template not found' }, { status: 404 })
    }

    if (existing.isDefault) {
      return NextResponse.json(
        { success: false, message: 'Cannot delete system default templates' },
        { status: 403 }
      )
    }

    if (existing.createdByProviderId && existing.createdByProviderId !== auth.sub) {
      return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 })
    }

    await templateRepo.deactivateTemplate(id)

    return NextResponse.json({ success: true, data: { id, deactivated: true } })
  } catch (error) {
    console.error('DELETE /api/workflow/templates/[id] error:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}
