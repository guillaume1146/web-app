---
description: Add a new booking/consultation type with API, validation, workflow, and UI
user-invocable: true
---

# Add Booking Type

Add a new booking type to the platform (e.g., physiotherapist, psychologist).

## Arguments
$ARGUMENTS should contain: the provider type name, specific fields needed, and workflow modes (office/home/video).

## Steps

1. **Schema**: Add Prisma model in `prisma/schema.prisma` following existing booking patterns (prefer `ServiceBooking` for new types)
2. **Validation**: Add Zod schema in `lib/validations/api.ts` extending `baseBookingSchema`
3. **API Route**: Create `app/api/bookings/{type}/route.ts` following the doctor booking pattern
4. **Update confirm route**: Add the new type to `bookingType` enum in `app/api/bookings/confirm/route.ts`
5. **Update resolve-booking**: Add case in `lib/bookings/resolve-booking.ts`
6. **Available slots**: Add provider type to `app/api/bookings/available-slots/route.ts`
7. **Patient booking page**: Create `app/patient/(dashboard)/book/{type}/[id]/page.tsx`
8. **Commission**: Update `lib/commission.ts` if pricing differs
9. **Workflow Templates**: Create default `WorkflowTemplate` entries for each service mode (office/home/video)
   - Define steps with appropriate flags (`triggers_video_call` for video mode, etc.)
   - Define transitions with allowed roles
   - Set default notification messages per step
   - Link to `PlatformService` via `platformServiceId`
   - Reference `docs/WORKFLOW-STATUS-SYSTEM.md` for step definitions
10. **Seed data**: Add seed entries in `prisma/seeds/` (use next available number, DO NOT modify existing seeds)
11. **Inventory**: If provider type can sell items, add `ProviderInventoryItem` examples in seed
12. **Update custom service whitelist**: Add provider type to `app/api/services/custom/route.ts` allowedTypes array
13. Run `npx tsc --noEmit` and `npx vitest run`
