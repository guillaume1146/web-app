---
description: Error handling rules — never swallow, always type, surface to user gracefully
globs: "{backend,app,components,lib,hooks}/**/*.{ts,tsx}"
---

# Error Handling

## Backend (NestJS)

- **Throw typed exceptions**: `BadRequestException`, `NotFoundException`, `ForbiddenException`, `UnauthorizedException`, `ConflictException`. The `GlobalExceptionFilter` formats them as `{ success: false, message }`.
- **Wrap external calls in try/catch only when you need to recover**. If you can't recover, let it bubble — the filter handles it.
- **Never** `catch (e) {}` (silent swallow). Either re-throw, log + rethrow, or convert to a typed exception.
- For non-fatal background work (notifications, audit logs, cache refresh), `.catch(() => { /* non-fatal */ })` is acceptable but log first time.

## Frontend (Next.js)

- API calls return `{ success, data | message }`. Always check `success` before reading `data`.
- Never `.then(r => r.json()).then(d => setX(d.data))` without an error path. Use:
  ```ts
  try {
    const res = await fetch(...)
    if (!res.ok) throw new Error('HTTP ' + res.status)
    const json = await res.json()
    if (!json.success) throw new Error(json.message)
    setX(json.data)
  } catch (e) {
    setError(e instanceof Error ? e.message : 'Failed')
  }
  ```
- Surface errors with `toast` or inline banner — never silent.

## Workflow engine

- Strategy execution failures are caught and logged in `WorkflowEngine` so one broken strategy doesn't block the transition. But the strategy itself MUST throw on bad input — don't return `null` quietly.

## Forbidden

- ❌ `return null` to signal an error — throw instead
- ❌ `console.log` for errors — use `console.error` or NestJS `Logger`
- ❌ `throw new Error('something bad')` in NestJS — use a typed exception
- ❌ `void error` to suppress unused-var lint — actually log it
