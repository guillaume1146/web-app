---
description: Review code changes for quality, security, and architecture compliance
user-invocable: true
---

# Review Pull Request

Run a comprehensive review of recent code changes.

## Automated Checks

1. **Type check**: `cd backend && npx tsc --noEmit` — must pass
2. **Tests**: `npx vitest run` — must pass
3. **E2E**: `npx playwright test e2e/nestjs-migration.spec.ts --project=chromium` — must pass

## Manual Review Checklist

### Backend (NestJS)
- [ ] No Prisma in controllers — all business logic in services
- [ ] Every `@Body()` has a typed DTO (not `any`)
- [ ] Response format: `{ success: true, data }` or `{ success: false, message }`
- [ ] No hardcoded role names (`DOCTOR`, `NURSE`) in business logic
- [ ] Workflow status changes go through `WorkflowEngine.transition()`
- [ ] Both `ServiceBooking.status` AND `WorkflowInstance.currentStatus` synced
- [ ] Auth: protected routes have guards, public routes have `@Public()`

### Frontend
- [ ] All data from API calls (no Prisma, no hardcoded data)
- [ ] No `undefined` rendered to users — use fallbacks
- [ ] Mobile responsive (Tailwind breakpoints)
- [ ] Loads from dynamic role API, not hardcoded constants

### Security
- [ ] No secrets in code
- [ ] Input validation on all user input
- [ ] Rate limiting on public endpoints
- [ ] Ownership checks on data access

### No Regressions
- [ ] Existing E2E tests still pass (127+ tests)
- [ ] No new TypeScript errors
- [ ] No new "undefined" in API responses
