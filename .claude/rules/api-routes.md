---
description: Rules for writing API route handlers in app/api/
globs: "{app/api,lib/workflow,lib/inventory}/**/*.ts"
---

# API Route Conventions

## Response Format
Always use the standard response shape:
```typescript
{ success: true, data: T }
{ success: false, message: string }
```
Never use `{ error: "..." }` — always `{ success: false, message: "..." }`.

## Auth Pattern
Every non-public endpoint must:
1. Call `rateLimitPublic(request)` or `rateLimitAuth(request)` first
2. Call `validateRequest(request)` and check `if (!auth)`
3. Return `{ success: false, message: 'Unauthorized' }` with status 401

## Validation
- Use Zod schemas from `lib/validations/api.ts` — never inline validation
- Parse with `.safeParse(body)` and return `.issues[0].message` on failure
- Use `.min(1)` for string IDs, NOT `.uuid()` (seeded IDs are custom like PAT001)

## Error Handling
```typescript
} catch (error) {
  console.error('METHOD /api/route-name error:', error)
  return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
}
```
Never use `void error` to suppress — always log with `console.error`.

## Prisma Queries
- Use `select` (not `include`) to return only needed columns
- Import prisma from `@/lib/db` (default export)

## Workflow Engine
- Status changes go through `WorkflowEngine.transition()` (not direct DB update)
- Import engine from `@/lib/workflow` — use `getWorkflowEngine()` singleton
- Every status transition auto-creates notification + step log
- Step flags (`triggers_video_call`, `triggers_stock_check`, `triggers_stock_subtract`) are executed by strategy handlers
- Booking model `.status` field stays in sync (engine updates both WorkflowInstance and booking model)

## Inventory (Health Shop)
- Provider inventory uses `ProviderInventoryItem` model (not just `PharmacyMedicine`)
- `PharmacyMedicine` stays for backward compatibility
- `requiresPrescription` is per-item, not global
- Stock decrement happens via `triggers_stock_subtract` step flag
