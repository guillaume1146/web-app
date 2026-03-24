---
description: Create a new API route with auth, validation, rate limiting, and error handling
user-invocable: true
---

# Create API Route

Create a new Next.js API route following project conventions.

## Arguments
$ARGUMENTS should contain: HTTP method, route path, and description of what it does.

## Steps

1. Read `lib/validations/api.ts` to check if a Zod schema already exists for this route
2. If no schema exists, add one to `lib/validations/api.ts`
3. Create the route file at the specified path under `app/api/`
4. Follow this template:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { validateRequest } from '@/lib/auth/validate'
import { rateLimitPublic } from '@/lib/rate-limit'
import { mySchema } from '@/lib/validations/api'

export async function METHOD(request: NextRequest) {
  const limited = rateLimitPublic(request)
  if (limited) return limited

  const auth = validateRequest(request)
  if (!auth) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const parsed = mySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    // ... business logic ...

    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    console.error('METHOD /api/route-path error:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}
```

5. If this route changes booking status, use `WorkflowEngine.transition()` instead of direct DB update:
```typescript
import { getWorkflowEngine } from '@/lib/workflow'

const engine = getWorkflowEngine()
const result = await engine.transition({
  bookingId, bookingType, action,
  actionByUserId: auth.sub,
  actionByRole: 'provider' // or 'patient'
})
```
6. Run `npx tsc --noEmit` to verify no type errors
