# NestJS Backend Architecture

## Core Principle
NestJS is the ONLY backend. Next.js is frontend-only. All `/api/*` requests proxy to NestJS via `next.config.ts` rewrites.

## Module Structure
Every module MUST have: `controller.ts`, `service.ts`, `module.ts`
- Controllers: thin — only parse request, call service, return response
- Services: all business logic + Prisma queries
- NO Prisma calls in controllers

## Response Format
```typescript
{ success: true, data: T }           // Success
{ success: false, message: string }  // Error
```
Enforced by `ResponseTransformInterceptor` and `GlobalExceptionFilter`.

## Auth
- JWT in httpOnly cookies: `mediwyz_token`, `mediwyz_userType`, `mediwyz_user_id`
- `@Public()` for unauthenticated routes
- `@CurrentUser()` to get JWT payload
- Guards: JwtAuthGuard (global), AdminGuard, RolesGuard, FeatureAccessGuard

## Validation
- Use class-validator DTOs (preferred) or Zod schemas
- Global `ValidationPipe({ whitelist: true, transform: true })`
- Never use `@Body() body: any` — always type the body

## Socket.IO
- 3 gateways: WebRtcGateway, ChatGateway, NotificationsGateway
- All on NestJS port 3001 with CORS for frontend
- Frontend connects via `NEXT_PUBLIC_SOCKET_URL`

## Swagger
- Available at `/api/docs`
- Add `@ApiTags()` to controllers, `@ApiOperation()` to methods

## When adding a new module
1. Create `<name>.module.ts`, `<name>.controller.ts`, `<name>.service.ts`
2. Create DTOs in `<name>/dto/`
3. Register in `app.module.ts`
4. Add Swagger decorators
