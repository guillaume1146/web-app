---
description: Gang-of-Four + DDD patterns used in MediWyz; when to apply, when to avoid
---

# Design Patterns in MediWyz

## Patterns ALREADY in use — extend, don't rewrite

| Pattern | Where | Use it when |
|---|---|---|
| **Strategy** | `backend/src/workflow/strategies/*.strategy.ts` | Adding a new triggerable workflow flag (one strategy = one flag) |
| **Registry** | `workflow/workflow-registry.ts` | Resolving template by provider type + service mode (cascade lookup) |
| **Template Method** | `workflow-engine.service.ts` `transition()` | All transitions follow validate→pre→update→post→log→notify |
| **Observer** | NotificationsGateway + Socket.IO rooms | Emit to all subscribers of `user:{userId}` |
| **Singleton** | PrismaService, RolesResolverService | Shared cache or connection pool |
| **Repository** | `workflow/repositories/*` | Data-access encapsulation per aggregate |
| **Factory** | `lib/dashboard/createDashboardLayout.tsx` | Generate role-scoped dashboard layouts |
| **Adapter** | Legacy `/api/doctors/*` → generic `/api/providers/:id/*` | Backward-compat layer over a refactored API |
| **Decorator** | `@Public()`, `@CurrentUser()`, `@RequireFeature()` | Attaching cross-cutting concerns to controllers |
| **Chain of Responsibility** | NestJS guard chain (Jwt → Admin → FeatureAccess) | Layered authorization |

## When to add a new pattern

- Adding a new triggerable behavior on workflow transition → **new Strategy class** in `strategies/`, register in `workflow.module.ts`
- Adding a new role of cross-cutting check across controllers → **new Decorator + Guard**
- Adding a new entry-point that calls multiple services in a fixed order → **new Service that orchestrates** (don't do this in a controller)

## When NOT to abstract

- Three similar lines is not a pattern — leave them.
- One usage is not a pattern — inline it.
- "It might be useful later" is not a reason — only abstract on the second real need.

## Anti-patterns

- ❌ Visitor / double-dispatch in TypeScript — use `switch` on a discriminator instead
- ❌ Singleton for state that varies per request — use NestJS request-scoped providers
- ❌ Builder for objects with <5 fields — use object literal
- ❌ Multiple inheritance via mixins — prefer composition (services, not utility classes)
