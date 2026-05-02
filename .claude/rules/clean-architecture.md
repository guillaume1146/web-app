---
description: Hexagonal / clean-architecture rules for NestJS backend modules
globs: "backend/src/**/*.ts"
---

# Clean Architecture for NestJS

## Dependency Direction (strict, inside → out)

```
domain (entities, types) ←  application (services) ←  infrastructure (controllers, gateways, prisma)
```

- Controllers/Gateways depend on Services. Never the reverse.
- Services depend on `PrismaService`. They MUST NOT import from `controller.ts`.
- Domain types live in `<module>/types.ts` or `<module>/dto/`. They MUST NOT import Nest decorators.
- Cross-module dependencies go through the public service of the other module — never reach into another module's prisma.

## Layer Responsibilities

| Layer | File | Allowed | Forbidden |
|---|---|---|---|
| **Controller** | `*.controller.ts` | Parse req, call service, return DTO | Prisma queries, business logic, calling other services |
| **Service** | `*.service.ts` | Business logic, Prisma, transactions, cross-service calls | HTTP/Socket details, request parsing |
| **Gateway** | `*.gateway.ts` | Socket.IO event routing | Business logic (delegate to services) |
| **DTO** | `dto/*.ts` | class-validator decorators, JSDoc | Logic, side effects |
| **Strategy** | `strategies/*.strategy.ts` | One responsibility (Tier-1/2/3 trigger) | Importing other strategies |

## Module Boundaries

- One folder per bounded context: `bookings/`, `inventory/`, `workflow/`, etc.
- Each module exports its `*.module.ts` and `*.service.ts`. Nothing else is public.
- Need cross-module data? Inject the other module's service. If circular, extract to a shared service in `shared/`.

## Anti-patterns

- ❌ `prisma.X.findMany()` inside a controller
- ❌ `import { OtherService } from '../other/other.service'` in a controller (should be in service)
- ❌ Controllers calling controllers
- ❌ Strategies importing the workflow engine (one-way: engine knows strategies)
- ❌ DTOs importing from `prisma/client` (use plain types)
