---
description: Rules for Prisma and database operations
globs: "{prisma,lib/db,lib/workflow,lib/inventory,app/api}/**/*.{ts,prisma}"
---

# Database Conventions

## Prisma Client
- Import as default: `import prisma from '@/lib/db'`
- Use `select` over `include` to minimize data transfer
- Wrap multi-table operations in `prisma.$transaction()`

## Schema
- Single `User` table + 16 type-specific profile tables (1:1)
  - Original 11: Patient, Doctor, Nurse, Nanny, Pharmacist, LabTech, EmergencyWorker, InsuranceRep, CorporateAdmin, ReferralPartner, RegionalAdmin
  - Added 5: Caregiver, Physiotherapist, Dentist, Optometrist, Nutritionist (use generic ServiceBooking)
- Clinical relations reference profile IDs
- Cross-cutting relations (Video, Chat, Notification, Wallet) reference User IDs
- Booking models: Appointment, NurseBooking, ChildcareBooking, LabTestBooking, EmergencyBooking, ServiceBooking
- Inventory: PharmacyMedicine (legacy), ProviderInventoryItem (new, all providers)
- Workflow: WorkflowTemplate, WorkflowInstance, WorkflowStepLog, NotificationTemplate

## Seeds
- 33 modular seed files in `prisma/seeds/` (00-regions through 33-service-bookings)
- `prisma/seed.ts` orchestrates: clean + seed in dependency order
- Run: `npx prisma db seed`
- DO NOT remove existing seeds — always add new seed files with next available number

## Migrations
- `npx prisma db push` for development
- `npx prisma migrate dev` for creating migrations
