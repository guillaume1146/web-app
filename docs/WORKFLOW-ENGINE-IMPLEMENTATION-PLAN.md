# MediWyz — Workflow Engine + Health Shop: Implementation Plan

> **Date**: 2026-03-21
> **Depends on**: `docs/WORKFLOW-STATUS-SYSTEM.md` (workflow definitions per role)
> **Scope**: Configurable Workflow Engine, Provider Inventory (Health Shop), Status-Triggered Actions (video call, stock check, stock subtract), Auto-Notifications
> **Constraint**: DO NOT remove any existing functionality, seed data, or models. Extend and improve only.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Design Patterns](#2-design-patterns)
3. [Database Schema Changes](#3-database-schema-changes)
4. [Implementation Phases](#4-implementation-phases)
5. [Phase 1 — Database Schema](#phase-1--database-schema)
6. [Phase 2 — Workflow Engine Core](#phase-2--workflow-engine-core)
7. [Phase 3 — Provider Inventory (Health Shop)](#phase-3--provider-inventory-health-shop)
8. [Phase 4 — Status-Triggered Actions](#phase-4--status-triggered-actions)
9. [Phase 5 — Seed Data (Default Workflows)](#phase-5--seed-data-default-workflows)
10. [Phase 6 — Provider & Admin Workflow UI](#phase-6--provider--admin-workflow-ui)
11. [Phase 7 — Patient-Facing Workflow UI](#phase-7--patient-facing-workflow-ui)
12. [Phase 8 — Migration of Existing Bookings](#phase-8--migration-of-existing-bookings)
13. [File Structure](#file-structure)
14. [API Endpoints](#api-endpoints)
15. [Key Business Rules](#key-business-rules)

---

## 1. Architecture Overview

```
                    ┌─────────────────────────────┐
                    │    REGIONAL ADMIN            │
                    │  Creates default workflows   │
                    │  for provider types in region │
                    └──────────┬──────────────────┘
                               │ seeds / creates
                               ▼
┌──────────────────────────────────────────────────────────┐
│                   WorkflowTemplate                        │
│  ┌─────────────────────────────────────────────────────┐ │
│  │ steps: [                                             │ │
│  │   { order, statusCode, label, description,           │ │
│  │     actions[], notifyRole, notifyTitle, notifyMsg,   │ │
│  │     flags: {                                         │ │
│  │       triggers_video_call: bool,                     │ │
│  │       triggers_stock_check: bool,                    │ │
│  │       triggers_stock_subtract: bool,                 │ │
│  │       requires_prescription: bool,                   │ │
│  │       requires_content: "prescription"|"lab_result"  │ │
│  │     }                                                │ │
│  │   }, ...                                             │ │
│  │ ]                                                    │ │
│  └─────────────────────────────────────────────────────┘ │
│  Linked to: PlatformService (1:1 or 1:many)              │
│  Created by: System seed | Regional Admin | Provider     │
└──────────────┬───────────────────────────────────────────┘
               │
    ┌──────────┴──────────┐
    │ Patient books a     │
    │ service from a      │
    │ provider             │
    └──────────┬──────────┘
               │ auto-creates
               ▼
┌──────────────────────────────────────────────────────────┐
│                   WorkflowInstance                         │
│  bookingId + bookingType (polymorphic)                    │
│  currentStatus ──────────────────────────────────────┐   │
│  patientUserId, providerUserId                       │   │
│                                                      │   │
│  ┌───────────────────────────────────────────────────┤   │
│  │         WorkflowStepLog (audit trail)             │   │
│  │  fromStatus → toStatus, action, actionBy          │   │
│  │  contentType, contentData (prescription/results)  │   │
│  │  notificationId (auto-created)                    │   │
│  │  triggeredVideoCallId (if flag set)               │   │
│  │  triggeredStockAction (if flag set)               │   │
│  └───────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────┘
               │
               │ on each transition
               ▼
┌──────────────────────────────────────────────────────────┐
│              Transition Engine (lib/workflow/)            │
│                                                          │
│  1. Validate transition (from → to, allowed role)        │
│  2. Update WorkflowInstance.currentStatus                 │
│  3. Create WorkflowStepLog entry                         │
│  4. Execute step flags:                                  │
│     a. triggers_video_call → create VideoCallSession     │
│     b. triggers_stock_check → verify ProviderInventory   │
│     c. triggers_stock_subtract → decrement stock         │
│     d. requires_prescription → validate prescription     │
│     e. requires_content → attach content data            │
│  5. Resolve notification template (custom > default)     │
│  6. Create Notification record                           │
│  7. Emit Socket.IO event                                 │
│  8. Sync booking model status field                      │
│  9. Return next available actions                        │
└──────────────────────────────────────────────────────────┘
```

---

## 2. Design Patterns

### 2.1 Strategy Pattern — Step Flag Handlers

Each step flag (`triggers_video_call`, `triggers_stock_check`, etc.) is handled by a dedicated strategy:

```typescript
// lib/workflow/strategies/index.ts
interface StepFlagHandler {
  flag: string
  execute(context: TransitionContext): Promise<StepFlagResult>
  validate?(context: TransitionContext): Promise<ValidationResult>
}

// Implementations:
// lib/workflow/strategies/video-call.strategy.ts
// lib/workflow/strategies/stock-check.strategy.ts
// lib/workflow/strategies/stock-subtract.strategy.ts
// lib/workflow/strategies/prescription-check.strategy.ts
// lib/workflow/strategies/content-attachment.strategy.ts
```

**Why Strategy**: Each flag has completely different logic. New flags can be added without modifying the transition engine. Providers can compose flags per step.

### 2.2 Template Method Pattern — Transition Engine

```typescript
// lib/workflow/engine.ts
class WorkflowEngine {
  async transition(input: TransitionInput): Promise<TransitionResult> {
    // 1. validateTransition()     — check from/to is allowed
    // 2. executePreFlags()        — stock_check, prescription validation
    // 3. updateStatus()           — DB update in transaction
    // 4. executePostFlags()       — video_call creation, stock_subtract
    // 5. createStepLog()          — audit trail
    // 6. sendNotification()       — resolve template + create + emit
    // 7. syncBookingStatus()      — keep legacy booking.status in sync
    // 8. resolveNextActions()     — what can happen next
  }
}
```

**Why Template Method**: The transition flow is always the same sequence, but each step has different implementations. This ensures consistency while allowing customization.

### 2.3 Registry Pattern — Workflow Template Resolution

```typescript
// lib/workflow/registry.ts
class WorkflowRegistry {
  // Resolution order:
  // 1. Provider's custom template for this service
  // 2. Regional admin's template for this provider type + service mode
  // 3. System default template
  async resolve(serviceId: string, providerUserId: string, mode: string): Promise<WorkflowTemplate>
}
```

**Why Registry**: Multiple sources can define workflows (system, admin, provider). Resolution must follow a clear priority chain.

### 2.4 Observer Pattern — Notification Dispatch

```typescript
// lib/workflow/observers/notification.observer.ts
// Listens to every transition and:
// 1. Resolves NotificationTemplate (provider custom > admin custom > system default)
// 2. Interpolates {{variables}}
// 3. Creates Notification DB record
// 4. Emits Socket.IO event
```

### 2.5 Repository Pattern — Data Access

```typescript
// lib/workflow/repositories/
// workflow-template.repository.ts  — CRUD for templates
// workflow-instance.repository.ts  — CRUD for instances
// workflow-step-log.repository.ts  — CRUD for step logs
// provider-inventory.repository.ts — CRUD for inventory items
```

**Why Repository**: Isolates Prisma queries from business logic. Makes testing easier with mock repositories.

---

## 3. Database Schema Changes

### 3.1 New Models (add to schema.prisma)

```prisma
// ============================================================
// WORKFLOW ENGINE
// ============================================================

model WorkflowTemplate {
  id              String   @id @default(uuid())
  name            String                          // "Consultation Generale Office"
  slug            String   @unique                // "doctor-consultation-office"
  description     String?
  providerType    String                          // DOCTOR, NURSE, DENTIST, etc.
  serviceMode     String                          // office, home, video
  isDefault       Boolean  @default(false)        // system seed = true
  isActive        Boolean  @default(true)

  // Ownership — null means system default
  createdByProviderId String?                     // provider custom workflow
  createdByAdminId    String?                     // regional admin default
  regionCode          String?                     // null = global, "MU" = Mauritius only

  // Link to service catalog
  platformServiceId   String?                     // linked PlatformService
  platformService     PlatformService? @relation(fields: [platformServiceId], references: [id])

  // Steps definition (ordered JSON array)
  // Each: { order, statusCode, label, description,
  //         actionsForPatient: [{action, label}],
  //         actionsForProvider: [{action, label}],
  //         flags: { triggers_video_call, triggers_stock_check,
  //                  triggers_stock_subtract, requires_prescription,
  //                  requires_content },
  //         notifyPatient: { title, message },
  //         notifyProvider: { title, message } }
  steps             Json

  // Allowed transitions (JSON array)
  // Each: { from, to, action, allowedRoles: ["patient"|"provider"|"system"],
  //         conditions?: { requiresPayment?, requiresPrescription? } }
  transitions       Json

  instances         WorkflowInstance[]
  notificationTemplates NotificationTemplate[]

  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  @@index([providerType, serviceMode])
  @@index([platformServiceId])
  @@index([createdByProviderId])
  @@index([createdByAdminId])
}

model WorkflowInstance {
  id              String   @id @default(uuid())
  templateId      String
  template        WorkflowTemplate @relation(fields: [templateId], references: [id])

  // Polymorphic booking reference
  bookingId       String
  bookingType     String                          // appointment, nurse_booking, etc.

  currentStatus   String                          // current step statusCode
  previousStatus  String?

  patientUserId   String
  providerUserId  String

  // Service mode for this instance
  serviceMode     String                          // office, home, video

  startedAt       DateTime @default(now())
  completedAt     DateTime?
  cancelledAt     DateTime?

  metadata        Json?                           // extra data per instance

  steps           WorkflowStepLog[]

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([bookingId, bookingType])
  @@index([patientUserId])
  @@index([providerUserId])
  @@index([currentStatus])
  @@index([templateId])
}

model WorkflowStepLog {
  id              String   @id @default(uuid())
  instanceId      String
  instance        WorkflowInstance @relation(fields: [instanceId], references: [id])

  fromStatus      String?                         // null for first step
  toStatus        String
  action          String                          // "accept", "start_care", etc.
  actionByUserId  String
  actionByRole    String                          // "patient", "provider", "system"

  // Display
  label           String                          // "Consultation en cours"
  message         String?                         // detailed message

  // Content attachment (prescription, lab results, care notes, etc.)
  contentType     String?                         // "prescription", "lab_result", "care_notes"
  contentData     Json?                           // { medications: [...] } etc.

  // Triggered actions results
  triggeredVideoCallId  String?                   // if video call was created
  triggeredStockActions Json?                     // [{ itemId, qty, action }]

  // Notification tracking
  notificationId  String?                         // Notification.id created

  createdAt       DateTime @default(now())

  @@index([instanceId])
  @@index([toStatus])
}

model NotificationTemplate {
  id              String   @id @default(uuid())
  workflowTemplateId String
  workflowTemplate   WorkflowTemplate @relation(fields: [workflowTemplateId], references: [id])

  statusCode      String                          // which step
  targetRole      String                          // "patient" or "provider"
  title           String                          // supports {{var}}
  message         String                          // supports {{var}}
  notificationType String  @default("workflow")   // notification type code

  // Ownership (null = system default)
  createdByProviderId String?
  createdByAdminId    String?

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@unique([workflowTemplateId, statusCode, targetRole, createdByProviderId])
  @@index([workflowTemplateId])
}

// ============================================================
// PROVIDER INVENTORY (generalized from PharmacyMedicine)
// ============================================================

model ProviderInventoryItem {
  id              String   @id @default(uuid())
  providerUserId  String                          // any provider, not just pharmacist
  providerType    String                          // PHARMACIST, OPTOMETRIST, DENTIST, etc.

  // Product info
  name            String
  genericName     String?                         // for medicines
  category        String                          // "medication", "equipment", "accessory", "supply"
  description     String?
  imageUrl        String?

  // Measurement
  unitOfMeasure   String   @default("unit")       // unit, box, bottle, pair, ml, mg, kg
  strength        String?                         // "500mg" for medicines
  dosageForm      String?                         // tablet, capsule, etc. (medicines only)

  // Pricing
  price           Float
  currency        String   @default("MUR")
  discountPercent Float?                          // optional discount

  // Stock
  quantity        Int      @default(0)
  minStockAlert   Int      @default(5)            // alert when stock <= this
  inStock         Boolean  @default(true)

  // Flags
  requiresPrescription Boolean @default(false)    // medicines needing Rx
  isActive        Boolean  @default(true)
  isFeatured      Boolean  @default(false)        // show in Health Shop highlights

  // Medicine-specific (nullable for non-medicines)
  sideEffects     String[] @default([])
  expiryDate      DateTime?

  // Relations
  orderItems      InventoryOrderItem[]

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([providerUserId])
  @@index([providerType, category])
  @@index([category])
  @@index([inStock])
  @@index([name])
}

model InventoryOrder {
  id              String   @id @default(uuid())
  patientUserId   String
  providerUserId  String
  providerType    String

  status          String   @default("pending")    // pending, confirmed, preparing,
                                                  // ready_for_pickup, ready_for_delivery,
                                                  // delivery_in_progress, delivered,
                                                  // picked_up, completed, cancelled

  totalAmount     Float
  currency        String   @default("MUR")
  deliveryType    String?                         // pickup, delivery
  deliveryAddress String?
  deliveryFee     Float    @default(0)

  // Prescription
  prescriptionRequired Boolean @default(false)
  prescriptionId  String?                         // reference to uploaded prescription

  // Workflow
  workflowInstanceId String?                      // linked workflow for order tracking

  items           InventoryOrderItem[]

  orderedAt       DateTime @default(now())
  confirmedAt     DateTime?
  deliveredAt     DateTime?
  cancelledAt     DateTime?

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([patientUserId])
  @@index([providerUserId])
  @@index([status])
}

model InventoryOrderItem {
  id              String   @id @default(uuid())
  orderId         String
  order           InventoryOrder @relation(fields: [orderId], references: [id])
  inventoryItemId String
  inventoryItem   ProviderInventoryItem @relation(fields: [inventoryItemId], references: [id])

  quantity        Int
  unitPrice       Float
  totalPrice      Float

  createdAt       DateTime @default(now())

  @@index([orderId])
  @@index([inventoryItemId])
}
```

### 3.2 Schema Modifications (existing models)

```prisma
// ADD to PlatformService model:
  workflowTemplates WorkflowTemplate[]

// KEEP PharmacyMedicine as-is (backward compatibility)
// Migration script will copy PharmacyMedicine → ProviderInventoryItem

// KEEP MedicineOrder as-is (backward compatibility)
// New orders go through InventoryOrder; old orders still work
```

### 3.3 Migration Strategy for EmergencyBooking

```prisma
// CHANGE EmergencyBooking.status from enum to String
// Before: status EmergencyStatus @default(pending)
// After:  status String @default("pending")
// Also remove the EmergencyStatus enum after migration
```

---

## 4. Implementation Phases

| Phase | Description | Priority | Depends On |
|-------|-------------|----------|------------|
| 1 | Database Schema | Critical | — |
| 2 | Workflow Engine Core (lib/) | Critical | Phase 1 |
| 3 | Provider Inventory (Health Shop) | Critical | Phase 1 |
| 4 | Status-Triggered Actions | Critical | Phase 2 |
| 5 | Seed Data (Default Workflows) | Critical | Phase 2 |
| 6 | Provider & Admin Workflow UI | High | Phase 2, 5 |
| 7 | Patient-Facing Workflow UI | High | Phase 2, 5 |
| 8 | Migration of Existing Bookings | Medium | Phase 2, 5 |

---

## Phase 1 — Database Schema

### Tasks

1. **Add new models to `prisma/schema.prisma`**
   - `WorkflowTemplate`
   - `WorkflowInstance`
   - `WorkflowStepLog`
   - `NotificationTemplate`
   - `ProviderInventoryItem`
   - `InventoryOrder`
   - `InventoryOrderItem`

2. **Add relation to PlatformService**
   - `workflowTemplates WorkflowTemplate[]`

3. **Migrate EmergencyBooking status**
   - Change `status` from `EmergencyStatus` enum to `String @default("pending")`
   - Remove `EmergencyStatus` enum (verify no other references)

4. **Run migration**
   ```bash
   npx prisma migrate dev --name add-workflow-engine-and-inventory
   ```

### Files to modify
- `prisma/schema.prisma`

### Files to create
- None (schema only)

---

## Phase 2 — Workflow Engine Core

### Architecture

```
lib/workflow/
  index.ts                              — Public API exports
  engine.ts                             — WorkflowEngine class (Template Method)
  registry.ts                           — WorkflowRegistry (template resolution)
  types.ts                              — TypeScript interfaces/types
  validators.ts                         — Transition validation logic
  notification-resolver.ts              — Template variable interpolation

  repositories/
    workflow-template.repository.ts     — Template CRUD
    workflow-instance.repository.ts     — Instance CRUD
    workflow-step-log.repository.ts     — Step log CRUD

  strategies/
    index.ts                            — Strategy registry
    base.strategy.ts                    — Abstract base
    video-call.strategy.ts              — triggers_video_call handler
    stock-check.strategy.ts             — triggers_stock_check handler
    stock-subtract.strategy.ts          — triggers_stock_subtract handler
    prescription-check.strategy.ts      — requires_prescription handler
    content-attachment.strategy.ts      — requires_content handler
```

### Core Types (`lib/workflow/types.ts`)

```typescript
// Step definition within a WorkflowTemplate
interface WorkflowStepDefinition {
  order: number
  statusCode: string                    // "pending", "confirmed", "doctor_travelling", etc.
  label: string                         // display label
  description?: string

  // Actions available at this step
  actionsForPatient: StepAction[]       // [{ action: "cancel", label: "Annuler" }]
  actionsForProvider: StepAction[]      // [{ action: "accept", label: "Accepter" }]

  // Step flags — what happens when this step is reached
  flags: {
    triggers_video_call?: boolean       // auto-create video call session
    triggers_stock_check?: boolean      // verify stock before proceeding
    triggers_stock_subtract?: boolean   // decrement inventory
    requires_prescription?: boolean     // validate prescription exists
    requires_content?: ContentType      // "prescription" | "lab_result" | "care_notes" | "report"
  }

  // Notification templates (default, can be overridden)
  notifyPatient?: { title: string; message: string }
  notifyProvider?: { title: string; message: string }
}

interface StepAction {
  action: string                        // action code: "accept", "deny", "start", etc.
  label: string                         // button label: "Accepter", "Refuser"
  targetStatus: string                  // status to transition to
  requiredRole: "patient" | "provider"
  confirmationRequired?: boolean        // show "Are you sure?" dialog
  style?: "primary" | "danger" | "secondary"
}

interface TransitionAllowed {
  from: string
  to: string
  action: string
  allowedRoles: ("patient" | "provider" | "system")[]
  conditions?: {
    requiresPayment?: boolean
    requiresPrescription?: boolean
    requiresContent?: ContentType
    maxTimeAfterPrevious?: number       // minutes
  }
}

type ContentType = "prescription" | "lab_result" | "care_notes" | "report" |
                   "dental_chart" | "eye_prescription" | "meal_plan" | "exercise_plan"

// Input to the transition engine
interface TransitionInput {
  instanceId?: string                   // direct instance reference
  bookingId?: string                    // alternative: lookup by booking
  bookingType?: string
  action: string                        // "accept", "start_care", "complete"
  actionByUserId: string
  actionByRole: "patient" | "provider" | "system"
  notes?: string
  contentType?: ContentType
  contentData?: Record<string, unknown>
  inventoryItems?: { itemId: string; quantity: number }[]  // for stock operations
}

// Output from the transition engine
interface TransitionResult {
  success: boolean
  instanceId: string
  previousStatus: string
  currentStatus: string
  stepLabel: string
  nextActionsForPatient: StepAction[]
  nextActionsForProvider: StepAction[]
  notification: {
    patientNotificationId?: string
    providerNotificationId?: string
  }
  triggeredActions: {
    videoCallId?: string
    stockCheckResult?: { available: boolean; unavailable?: string[] }
    stockSubtracted?: { itemId: string; newQuantity: number }[]
  }
}
```

### Engine Implementation (`lib/workflow/engine.ts`)

```typescript
class WorkflowEngine {
  constructor(
    private registry: WorkflowRegistry,
    private strategies: Map<string, StepFlagHandler>,
    private notificationResolver: NotificationResolver
  ) {}

  // Create a new workflow instance when a booking is created
  async createInstance(params: {
    bookingId: string
    bookingType: string
    platformServiceId: string
    providerUserId: string
    patientUserId: string
    serviceMode: "office" | "home" | "video"
  }): Promise<WorkflowInstance>

  // Transition to next status
  async transition(input: TransitionInput): Promise<TransitionResult> {
    return prisma.$transaction(async (tx) => {
      // 1. Load instance + template
      // 2. Validate transition is allowed
      // 3. Execute PRE-transition flags (stock_check, prescription)
      // 4. Update instance status
      // 5. Execute POST-transition flags (video_call, stock_subtract)
      // 6. Create step log
      // 7. Send notifications
      // 8. Sync booking model status
      // 9. Return result with next actions
    })
  }

  // Get current state and available actions
  async getState(instanceId: string): Promise<WorkflowState>

  // Get timeline / history
  async getTimeline(instanceId: string): Promise<WorkflowStepLog[]>
}
```

### Workflow Registry (`lib/workflow/registry.ts`)

```typescript
class WorkflowRegistry {
  // Resolve which template to use for a given booking
  // Priority: provider custom > regional admin > system default
  async resolve(params: {
    platformServiceId: string
    providerUserId: string
    serviceMode: string
    regionCode?: string
  }): Promise<WorkflowTemplate> {
    // 1. Check provider's custom template for this service + mode
    const providerTemplate = await prisma.workflowTemplate.findFirst({
      where: {
        platformServiceId,
        createdByProviderId: providerUserId,
        serviceMode,
        isActive: true
      }
    })
    if (providerTemplate) return providerTemplate

    // 2. Check regional admin template
    const regionalTemplate = await prisma.workflowTemplate.findFirst({
      where: {
        platformServiceId,
        createdByAdminId: { not: null },
        regionCode,
        serviceMode,
        isActive: true
      }
    })
    if (regionalTemplate) return regionalTemplate

    // 3. Fall back to system default
    const systemTemplate = await prisma.workflowTemplate.findFirst({
      where: {
        platformServiceId,
        isDefault: true,
        serviceMode,
        isActive: true
      }
    })
    if (systemTemplate) return systemTemplate

    // 4. Fall back to generic template for provider type
    return this.getGenericTemplate(providerType, serviceMode)
  }
}
```

### API Route (`app/api/workflow/transition/route.ts`)

```typescript
// POST /api/workflow/transition
export async function POST(request: NextRequest) {
  const rateLimitResult = await rateLimitAuth(request)
  if (!rateLimitResult.success) return rateLimited()

  const auth = await validateRequest(request)
  if (!auth) return unauthorized()

  const body = await request.json()
  const parsed = transitionSchema.safeParse(body)
  if (!parsed.success) return validationError(parsed.error)

  const engine = getWorkflowEngine()
  const result = await engine.transition({
    ...parsed.data,
    actionByUserId: auth.sub,
    actionByRole: determineRole(auth, parsed.data)
  })

  return NextResponse.json({ success: true, data: result })
}
```

---

## Phase 3 — Provider Inventory (Health Shop)

### Concept

**Every provider can sell items** — not just pharmacists. The existing `PharmacyMedicine` model stays for backward compatibility, but new functionality uses `ProviderInventoryItem`.

| Provider Type | Example Items | Requires Prescription |
|---------------|---------------|----------------------|
| Pharmacist | Medicines, vitamins, supplements, first aid | Some (configurable per item) |
| Optometrist | Glasses, contact lenses, lens solution, eye drops | Some |
| Dentist | Toothbrush, mouthwash, dental floss, whitening kit | No |
| Nanny | Baby bottles, toys, diapers, baby food | No |
| Nurse | Bandages, thermometer, BP monitor, glucose strips | No |
| Physiotherapist | Exercise bands, foam roller, hot/cold packs | No |
| Nutritionist | Supplements, protein powder, meal prep containers | No |
| Caregiver | Mobility aids, adult diapers, bed pads | No |
| Doctor | Medical devices, health monitors | Some |
| Lab Technician | Home test kits, sample collection kits | No |

### Page Rename

- **Current**: "Buy Medicines" / `/search/medicines`
- **New**: "Health Shop" / `/search/health-shop`
- Keep `/search/medicines` as redirect for backward compatibility

### API Routes

```
// Provider inventory management
GET    /api/inventory                      — Provider's own inventory
POST   /api/inventory                      — Add item to inventory
PATCH  /api/inventory/[id]                 — Update item
DELETE /api/inventory/[id]                 — Deactivate item

// Patient browsing
GET    /api/search/health-shop             — Browse all providers' items
GET    /api/search/health-shop/categories  — Get all categories

// Orders (generalized)
POST   /api/inventory/orders               — Create order (any provider)
GET    /api/inventory/orders               — Get orders (patient or provider)
PATCH  /api/inventory/orders/[id]          — Update order status

// Backward compatibility
GET    /api/search/medicines               — Redirect/proxy to health-shop
GET    /api/pharmacist/medicines           — Still works (PharmacyMedicine)
```

### Health Shop Categories

```typescript
const SHOP_CATEGORIES = [
  // Pharmacist
  { key: "medication", label: "Medications", icon: "Pill" },
  { key: "vitamins", label: "Vitamins & Supplements", icon: "Leaf" },
  { key: "first_aid", label: "First Aid", icon: "Plus" },
  { key: "personal_care", label: "Personal Care", icon: "Heart" },

  // Optometrist
  { key: "eyewear", label: "Eyewear & Lenses", icon: "Eye" },
  { key: "eye_care", label: "Eye Care Products", icon: "Droplets" },

  // Dentist
  { key: "dental_care", label: "Dental Care", icon: "Smile" },

  // Baby & Child
  { key: "baby_care", label: "Baby & Child Care", icon: "Baby" },

  // Medical devices
  { key: "medical_devices", label: "Medical Devices", icon: "Activity" },
  { key: "monitoring", label: "Health Monitoring", icon: "Monitor" },

  // Therapy & rehab
  { key: "rehab_equipment", label: "Rehab Equipment", icon: "Dumbbell" },

  // Nutrition
  { key: "nutrition", label: "Nutrition & Diet", icon: "Apple" },

  // General
  { key: "other", label: "Other Health Products", icon: "Package" },
]
```

### Files to create

```
lib/inventory/
  types.ts                    — Inventory types
  repository.ts               — Inventory CRUD
  order-service.ts             — Order creation with stock management

app/api/inventory/
  route.ts                    — GET/POST provider inventory
  [id]/route.ts               — PATCH/DELETE item
  orders/route.ts             — GET/POST orders
  orders/[id]/route.ts        — PATCH order status

app/api/search/health-shop/
  route.ts                    — Public search endpoint
  categories/route.ts         — Category listing

app/search/health-shop/
  page.tsx                    — Health Shop browse page
  layout.tsx                  — Layout with CartProvider
  contexts/CartContext.tsx     — Updated cart (supports any provider)

components/health-shop/
  ShopItemCard.tsx            — Product card
  ShopFilters.tsx             — Category/provider type filters
  ShopCart.tsx                — Floating cart
```

---

## Phase 4 — Status-Triggered Actions

### 4.1 `triggers_video_call`

When a step with this flag is reached:
1. Auto-create a `VideoCallSession` (or reuse room)
2. Generate `roomId` for the video call
3. Notification includes "Join Call" action link
4. Patient and provider both get the video link

```typescript
// lib/workflow/strategies/video-call.strategy.ts
export class VideoCallStrategy implements StepFlagHandler {
  flag = "triggers_video_call"

  async execute(ctx: TransitionContext): Promise<StepFlagResult> {
    const roomId = uuidv4()
    // Create or reuse video room
    const room = await prisma.videoRoom.create({
      data: {
        id: roomId,
        createdBy: ctx.providerUserId,
        participants: [ctx.patientUserId, ctx.providerUserId],
        status: "active"
      }
    })
    return { videoCallId: roomId, videoLink: `/video/${roomId}` }
  }
}
```

### 4.2 `triggers_stock_check`

Pre-transition validation: ensure all referenced inventory items are in stock.

```typescript
// lib/workflow/strategies/stock-check.strategy.ts
export class StockCheckStrategy implements StepFlagHandler {
  flag = "triggers_stock_check"

  async validate(ctx: TransitionContext): Promise<ValidationResult> {
    const items = ctx.input.inventoryItems || []
    const unavailable: string[] = []

    for (const item of items) {
      const inv = await prisma.providerInventoryItem.findUnique({
        where: { id: item.itemId }
      })
      if (!inv || !inv.inStock || inv.quantity < item.quantity) {
        unavailable.push(inv?.name || item.itemId)
      }
    }

    return {
      valid: unavailable.length === 0,
      errors: unavailable.map(name => `${name} is out of stock`)
    }
  }
}
```

### 4.3 `triggers_stock_subtract`

Post-transition: decrement stock quantities.

```typescript
// lib/workflow/strategies/stock-subtract.strategy.ts
export class StockSubtractStrategy implements StepFlagHandler {
  flag = "triggers_stock_subtract"

  async execute(ctx: TransitionContext): Promise<StepFlagResult> {
    const results: { itemId: string; newQuantity: number }[] = []

    for (const item of ctx.input.inventoryItems || []) {
      const updated = await prisma.providerInventoryItem.update({
        where: { id: item.itemId },
        data: {
          quantity: { decrement: item.quantity },
          inStock: undefined // will be set by trigger
        }
      })
      // Auto-update inStock flag
      if (updated.quantity <= 0) {
        await prisma.providerInventoryItem.update({
          where: { id: item.itemId },
          data: { inStock: false }
        })
      }
      // Low stock alert
      if (updated.quantity <= updated.minStockAlert) {
        await createNotification({
          userId: ctx.providerUserId,
          type: "stock_alert",
          title: "Low Stock Alert",
          message: `${updated.name} has only ${updated.quantity} ${updated.unitOfMeasure}(s) remaining`
        })
      }
      results.push({ itemId: item.itemId, newQuantity: updated.quantity })
    }

    return { stockSubtracted: results }
  }
}
```

### 4.4 `requires_prescription`

Pre-transition: validate that a valid prescription exists.

```typescript
// lib/workflow/strategies/prescription-check.strategy.ts
export class PrescriptionCheckStrategy implements StepFlagHandler {
  flag = "requires_prescription"

  async validate(ctx: TransitionContext): Promise<ValidationResult> {
    // For items that require prescription:
    // Check if patient has an active prescription from a doctor
    // that includes the relevant medication
    // OR if a prescription was uploaded with this booking

    // Items not requiring prescription (vitamin C, etc.) skip this check
    const itemsNeedingRx = ctx.input.inventoryItems?.filter(async (item) => {
      const inv = await prisma.providerInventoryItem.findUnique({
        where: { id: item.itemId }
      })
      return inv?.requiresPrescription
    }) || []

    if (itemsNeedingRx.length === 0) return { valid: true }

    // Check for prescription
    const hasValidPrescription = await checkPrescription(ctx.patientUserId, itemsNeedingRx)
    return {
      valid: hasValidPrescription,
      errors: hasValidPrescription ? [] : ["Valid prescription required for some items"]
    }
  }
}
```

---

## Phase 5 — Seed Data (Default Workflows)

### New seed file: `prisma/seeds/31-workflow-templates.seed.ts`

**DO NOT modify existing seeds (00-30).** Add new seed file at position 31.

### Seed Structure

For each provider type + service + mode combination, create a `WorkflowTemplate` with:
- Default steps from `docs/WORKFLOW-STATUS-SYSTEM.md`
- Default notification messages
- Appropriate flags per step

### Example Seed (Doctor Consultation):

```typescript
const doctorConsultationOffice: WorkflowTemplateSeed = {
  name: "Doctor Consultation - Office",
  slug: "doctor-consultation-office",
  providerType: "DOCTOR",
  serviceMode: "office",
  isDefault: true,
  steps: [
    {
      order: 1,
      statusCode: "pending",
      label: "Demande envoyee",
      actionsForPatient: [
        { action: "cancel", label: "Annuler", targetStatus: "cancelled", style: "danger" },
        { action: "reschedule", label: "Reprogrammer", targetStatus: "pending", style: "secondary" }
      ],
      actionsForProvider: [
        { action: "accept", label: "Accepter", targetStatus: "confirmed", style: "primary" },
        { action: "deny", label: "Refuser", targetStatus: "cancelled", style: "danger" }
      ],
      flags: {},
      notifyPatient: null,
      notifyProvider: {
        title: "Nouvelle demande de consultation",
        message: "{{patientName}} demande une consultation pour le {{scheduledAt}}"
      }
    },
    {
      order: 2,
      statusCode: "confirmed",
      label: "Consultation confirmee",
      actionsForPatient: [
        { action: "cancel", label: "Annuler", targetStatus: "cancelled", style: "danger" },
        { action: "reschedule", label: "Reprogrammer", targetStatus: "pending", style: "secondary" }
      ],
      actionsForProvider: [
        { action: "cancel", label: "Annuler", targetStatus: "cancelled", style: "danger" }
      ],
      flags: {},
      notifyPatient: {
        title: "Consultation confirmee",
        message: "Votre consultation avec {{providerName}} est confirmee pour le {{scheduledAt}}. Montant: {{amount}}"
      },
      notifyProvider: null
    },
    {
      order: 3,
      statusCode: "waiting_room",
      label: "En salle d'attente",
      actionsForPatient: [],
      actionsForProvider: [
        { action: "start_consultation", label: "Demarrer consultation", targetStatus: "in_consultation", style: "primary" }
      ],
      flags: {},
      notifyProvider: {
        title: "Patient en salle d'attente",
        message: "{{patientName}} est arrive et attend en salle d'attente"
      }
    },
    {
      order: 4,
      statusCode: "in_consultation",
      label: "Consultation en cours",
      actionsForPatient: [],
      actionsForProvider: [
        { action: "write_prescription", label: "Rediger ordonnance", targetStatus: "writing_prescription", style: "primary" },
        { action: "complete_no_rx", label: "Terminer sans ordonnance", targetStatus: "completed", style: "secondary" }
      ],
      flags: {},
      notifyPatient: {
        title: "Consultation en cours",
        message: "Votre consultation avec {{providerName}} a commence"
      }
    },
    {
      order: 5,
      statusCode: "writing_prescription",
      label: "Redaction ordonnance",
      actionsForPatient: [],
      actionsForProvider: [
        { action: "send_prescription", label: "Envoyer ordonnance", targetStatus: "completed", style: "primary" }
      ],
      flags: { requires_content: "prescription" }
    },
    {
      order: 6,
      statusCode: "completed",
      label: "Consultation terminee",
      actionsForPatient: [
        { action: "leave_review", label: "Laisser un avis", targetStatus: "completed", style: "secondary" },
        { action: "book_followup", label: "Reserver un suivi", targetStatus: "completed", style: "secondary" }
      ],
      actionsForProvider: [],
      flags: {},
      notifyPatient: {
        title: "Consultation terminee",
        message: "Votre consultation avec {{providerName}} est terminee. N'hesitez pas a laisser un avis."
      }
    }
  ],
  transitions: [
    { from: "pending", to: "confirmed", action: "accept", allowedRoles: ["provider"] },
    { from: "pending", to: "cancelled", action: "deny", allowedRoles: ["provider"] },
    { from: "pending", to: "cancelled", action: "cancel", allowedRoles: ["patient"] },
    { from: "confirmed", to: "waiting_room", action: "check_in", allowedRoles: ["provider", "system"] },
    { from: "confirmed", to: "cancelled", action: "cancel", allowedRoles: ["patient", "provider"] },
    { from: "waiting_room", to: "in_consultation", action: "start_consultation", allowedRoles: ["provider"] },
    { from: "in_consultation", to: "writing_prescription", action: "write_prescription", allowedRoles: ["provider"] },
    { from: "in_consultation", to: "completed", action: "complete_no_rx", allowedRoles: ["provider"] },
    { from: "writing_prescription", to: "completed", action: "send_prescription", allowedRoles: ["provider"] }
  ]
}
```

### Seed Counts (estimated)

| Provider Type | Workflows | Office | Home | Video | Total Templates |
|---------------|-----------|--------|------|-------|-----------------|
| Doctor | 4 | 4 | 3 | 4 | 11 |
| Nurse | 3 | 2 | 3 | 2 | 7 |
| Nanny | 2 | 1 | 2 | 1 | 4 |
| Lab Technician | 3 | 2 | 2 | 1 | 5 |
| Emergency Worker | 2 | 0 | 2 | 0 | 2 |
| Pharmacist | 2 | 2 | 2 | 1 | 5 |
| Insurance Rep | 2 | 1 | 0 | 1 | 2 |
| Caregiver | 2 | 1 | 2 | 1 | 4 |
| Physiotherapist | 2 | 2 | 1 | 1 | 4 |
| Dentist | 4 | 4 | 0 | 1 | 5 |
| Optometrist | 3 | 3 | 0 | 1 | 4 |
| Nutritionist | 3 | 2 | 2 | 2 | 6 |
| **Total** | **~33** | | | | **~59 templates** |

### Linking to PlatformService

Each template links to a `PlatformService` by `platformServiceId`. The seed will:
1. Look up existing PlatformServices from seed 30
2. Create WorkflowTemplates linked to appropriate services
3. Some services may have multiple templates (one per mode)

---

## Phase 6 — Provider & Admin Workflow UI

### Provider Dashboard Pages

```
app/[userType]/(dashboard)/workflows/
  page.tsx                — List workflows linked to my services
  create/page.tsx         — Create custom workflow (step builder)
  [id]/page.tsx           — View/edit workflow steps

app/[userType]/(dashboard)/inventory/
  page.tsx                — Manage inventory items (generalized)
  orders/page.tsx         — Manage incoming orders
```

### Regional Admin Pages

```
app/regional/(dashboard)/workflows/
  page.tsx                — List/manage regional workflow templates
  create/page.tsx         — Create regional workflow
  [id]/page.tsx           — Edit regional workflow
```

### Workflow Step Builder Component

```
components/workflow/
  WorkflowStepBuilder.tsx         — Drag-and-drop step editor
  WorkflowStepCard.tsx            — Single step card with flags
  WorkflowTransitionEditor.tsx    — Visual transition arrows
  WorkflowPreview.tsx             — Timeline preview
  WorkflowFlagToggle.tsx          — Toggle flags (video, stock, etc.)
  NotificationTemplateEditor.tsx  — Edit notification messages
```

---

## Phase 7 — Patient-Facing Workflow UI

### Booking Detail Page Enhancement

```
components/workflow/
  WorkflowTimeline.tsx           — Visual timeline of all steps
  WorkflowCurrentStep.tsx        — Current step with available actions
  WorkflowActionButton.tsx       — Action button with confirmation
  WorkflowContentViewer.tsx      — View prescription, lab results, etc.
  WorkflowVideoCallBanner.tsx    — "Join video call" banner when triggered
```

### Integration Points

- `/patient/(dashboard)/bookings/[id]` — Enhanced with workflow timeline
- `/[providerType]/(dashboard)/bookings/[id]` — Provider view with action buttons
- Real-time updates via Socket.IO when status changes

---

## Phase 8 — Migration of Existing Bookings

### Strategy

1. **Do NOT break existing bookings** — old bookings without workflow instances still work
2. **New bookings** automatically get a `WorkflowInstance`
3. **Optional migration script** to create `WorkflowInstance` for active existing bookings
4. **Booking model `.status` stays in sync** — the workflow engine updates both `WorkflowInstance.currentStatus` AND the booking model's `status` field

### Migration Script

```typescript
// prisma/scripts/migrate-bookings-to-workflow.ts
// For each active booking:
// 1. Find matching WorkflowTemplate
// 2. Create WorkflowInstance with current booking status
// 3. Create initial WorkflowStepLog entry
```

---

## File Structure

### Complete new file tree

```
lib/
  workflow/
    index.ts                              — Public exports
    engine.ts                             — WorkflowEngine class
    registry.ts                           — Template resolution
    types.ts                              — TypeScript types
    validators.ts                         — Transition validation
    notification-resolver.ts              — Template interpolation
    repositories/
      workflow-template.repository.ts
      workflow-instance.repository.ts
      workflow-step-log.repository.ts
    strategies/
      index.ts                            — Strategy registry
      base.strategy.ts
      video-call.strategy.ts
      stock-check.strategy.ts
      stock-subtract.strategy.ts
      prescription-check.strategy.ts
      content-attachment.strategy.ts

  inventory/
    types.ts
    repository.ts
    order-service.ts

app/api/
  workflow/
    transition/route.ts                   — POST transition
    instances/route.ts                    — GET instances
    instances/[id]/route.ts               — GET instance detail
    instances/[id]/timeline/route.ts      — GET step timeline
    templates/route.ts                    — GET/POST templates
    templates/[id]/route.ts               — GET/PATCH/DELETE template
    templates/[id]/notifications/route.ts — GET/PATCH notification templates
    my-templates/route.ts                 — GET/POST provider templates

  inventory/
    route.ts                              — GET/POST provider inventory
    [id]/route.ts                         — PATCH/DELETE item
    orders/route.ts                       — GET/POST orders
    orders/[id]/route.ts                  — PATCH order status

  search/
    health-shop/route.ts                  — Public browse
    health-shop/categories/route.ts       — Categories

  regional/
    workflow-templates/route.ts           — GET/POST regional templates
    workflow-templates/[id]/route.ts      — PATCH/DELETE

components/
  workflow/
    WorkflowTimeline.tsx
    WorkflowCurrentStep.tsx
    WorkflowActionButton.tsx
    WorkflowContentViewer.tsx
    WorkflowVideoCallBanner.tsx
    WorkflowStepBuilder.tsx
    WorkflowStepCard.tsx
    WorkflowFlagToggle.tsx
    NotificationTemplateEditor.tsx

  health-shop/
    ShopItemCard.tsx
    ShopFilters.tsx
    ShopCart.tsx

app/search/health-shop/
  page.tsx
  layout.tsx
  contexts/CartContext.tsx

// Booking detail pages (notification deep-link targets)
app/patient/(dashboard)/bookings/[type]/[id]/
  page.tsx                              — Patient booking detail with workflow timeline
app/[providerType]/(dashboard)/bookings/[type]/[id]/
  page.tsx                              — Provider booking detail with action buttons

prisma/
  seeds/
    34-workflow-templates.seed.ts        — Default workflow seeds (after existing 33)
    35-provider-inventory-migration.seed.ts — Migrate PharmacyMedicine → ProviderInventoryItem

// Test files
__tests__/
  unit/workflow/                        — Engine, registry, validators, strategies
  api/workflow/                         — API route tests (transition, instances, templates)
  api/inventory/                        — Inventory CRUD, orders, health-shop search
  integration/workflow/                 — End-to-end engine flows, seed validation
e2e/workflow/                           — Playwright browser tests
```

---

## API Endpoints

### Workflow Engine

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| POST | `/api/workflow/transition` | Auth required | Transition to next status |
| GET | `/api/workflow/instances` | Auth required | List user's workflow instances |
| GET | `/api/workflow/instances/[id]` | Auth required | Get instance with current state |
| GET | `/api/workflow/instances/[id]/timeline` | Auth required | Get step log / audit trail |
| GET | `/api/workflow/templates` | Auth required | List templates (filter by providerType, mode) |
| POST | `/api/workflow/templates` | Provider/Admin | Create custom template |
| GET | `/api/workflow/templates/[id]` | Auth required | Get template details |
| PATCH | `/api/workflow/templates/[id]` | Owner only | Update template |
| DELETE | `/api/workflow/templates/[id]` | Owner only | Deactivate template |
| GET | `/api/workflow/templates/[id]/notifications` | Owner | Get notification customizations |
| PATCH | `/api/workflow/templates/[id]/notifications` | Owner | Update notifications |
| GET | `/api/workflow/my-templates` | Provider | Provider's custom templates |
| POST | `/api/workflow/my-templates` | Provider | Create provider template |

### Inventory (Health Shop)

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET | `/api/inventory` | Provider | List own inventory |
| POST | `/api/inventory` | Provider | Add item |
| PATCH | `/api/inventory/[id]` | Provider | Update item |
| DELETE | `/api/inventory/[id]` | Provider | Deactivate item |
| GET | `/api/inventory/orders` | Auth required | List orders (patient or provider) |
| POST | `/api/inventory/orders` | Patient | Create order |
| PATCH | `/api/inventory/orders/[id]` | Provider | Update order status |
| GET | `/api/search/health-shop` | Public | Browse all items |
| GET | `/api/search/health-shop/categories` | Public | Get categories |

### Regional Admin

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET | `/api/regional/workflow-templates` | Regional Admin | List regional templates |
| POST | `/api/regional/workflow-templates` | Regional Admin | Create regional template |
| PATCH | `/api/regional/workflow-templates/[id]` | Regional Admin | Update |
| DELETE | `/api/regional/workflow-templates/[id]` | Regional Admin | Deactivate |

---

## Key Business Rules

### 1. Workflow-Service Linking
- Every `PlatformService` SHOULD have at least one `WorkflowTemplate` (system default)
- When a provider creates a custom service via `/api/services/custom`, they can also create a custom workflow
- If no custom workflow exists, the system default is used

### 2. Prescription Rules
- `requiresPrescription` is per `ProviderInventoryItem` (not global)
- Vitamins, OTC items: `requiresPrescription = false`
- Controlled medications: `requiresPrescription = true`
- The `requires_prescription` flag on a workflow step validates this at transition time

### 3. Stock Management
- `triggers_stock_check` is a PRE-transition validation (blocks if out of stock)
- `triggers_stock_subtract` is a POST-transition action (decrements after success)
- Low stock alerts at `minStockAlert` threshold
- Auto-set `inStock = false` when `quantity <= 0`

### 4. Video Call Integration
- `triggers_video_call` on a step means: when this status is reached, create a video room
- The notification for that step includes the video link
- Both patient and provider can join
- Works with existing `VideoCallSession` + Socket.IO + WebRTC infrastructure

### 5. Notification Rules
- EVERY status change triggers a notification (no exceptions)
- Custom notification messages override defaults
- Template variables are resolved at send time
- Socket.IO real-time push for connected users
- DB record for offline users (shown on next login)

### 6. Backward Compatibility
- Existing `PharmacyMedicine` model stays untouched
- Existing `MedicineOrder` model stays untouched
- Existing booking APIs still work (status field synced by engine)
- Existing `/search/medicines` page redirects to `/search/health-shop`
- Migration script (Phase 8) is optional and can be run anytime

### 7. Access Control
- Providers can only modify their own templates and inventory
- Regional admins can modify templates for their region
- System defaults cannot be modified (only overridden)
- Patients can only trigger patient-role actions
- Transition validation checks `allowedRoles` per transition

### 8. Notification Click → Booking Detail Page (Deep Linking)
- **Current behavior**: notification clicks route to collection pages (`/patient/bookings`)
- **New behavior**: notification clicks deep-link to booking detail page with workflow timeline
- Notification `referenceId` = booking ID, `referenceType` = booking type
- URL pattern: `/{userType}/bookings/{bookingType}/{bookingId}`
- Examples:
  - Patient: `/patient/bookings/appointment/APT-001` → shows workflow timeline + actions
  - Doctor: `/doctor/bookings/appointment/APT-001` → shows workflow timeline + provider actions
  - Nurse: `/nurse/bookings/nurse-booking/NB-001` → shows workflow timeline + actions
- The booking detail page renders:
  - **Workflow timeline** (all steps, current highlighted)
  - **Current step** with available action buttons for the logged-in user's role
  - **Content attachments** (prescription, lab results, care notes) at relevant steps
  - **Video call banner** if current step has `triggers_video_call`
  - **Status badge** with color coding
  - **Booking metadata** (date, provider/patient info, amount, etc.)
- `DashboardHeader.tsx` notification routes updated to use `referenceId` for deep links

---

## Testing Strategy

### Philosophy
- Every phase includes tests BEFORE moving to the next phase
- Tests run against the local dev server (app must be running)
- No mocking of the workflow engine in integration tests — test real behavior
- Playwright E2E tests verify the full user journey through the browser

### Test Types per Phase

| Type | Tool | Purpose | Location |
|------|------|---------|----------|
| **Unit tests** | Vitest | Pure logic: validators, template resolution, strategies | `__tests__/unit/workflow/` |
| **API tests** | Vitest | HTTP in/out: status codes, response shape, auth | `__tests__/api/workflow/` |
| **Integration tests** | Vitest | Multi-layer: engine + DB + notifications | `__tests__/integration/workflow/` |
| **E2E tests** | Playwright | Browser: patient books, provider accepts, status updates | `e2e/workflow/` |

### Phase 1 Tests — Database Schema

```
__tests__/unit/workflow/
  schema-validation.test.ts
```

| Test | What it verifies |
|------|-----------------|
| WorkflowTemplate model exists | Can create/read/delete a template |
| WorkflowInstance model exists | Can create with booking reference |
| WorkflowStepLog model exists | Can create step log entries |
| NotificationTemplate model exists | Can create notification overrides |
| ProviderInventoryItem model exists | Can create items for any provider type |
| InventoryOrder + Items work | Can create order with line items |
| PlatformService ↔ WorkflowTemplate relation | Template links to service |
| EmergencyBooking status is String | No longer enum, accepts any string |
| Existing models unchanged | Appointment, NurseBooking, etc. still work |

### Phase 2 Tests — Workflow Engine Core

```
__tests__/unit/workflow/
  engine.test.ts              — WorkflowEngine.transition() logic
  registry.test.ts            — Template resolution priority
  validators.test.ts          — Transition validation rules
  notification-resolver.test.ts — Template variable interpolation

__tests__/api/workflow/
  transition.test.ts          — POST /api/workflow/transition
  instances.test.ts           — GET /api/workflow/instances
  templates.test.ts           — GET/POST /api/workflow/templates
```

| Test | What it verifies |
|------|-----------------|
| Valid transition succeeds | pending → confirmed with provider role |
| Invalid transition blocked | patient cannot do provider-only action |
| Invalid from-status blocked | Cannot go from completed → pending |
| Notification created on transition | DB record + correct userId |
| Step log created | fromStatus, toStatus, action, actionBy recorded |
| Booking status synced | Appointment.status matches WorkflowInstance.currentStatus |
| Template resolution priority | Provider custom > regional admin > system default |
| Template variable interpolation | `{{patientName}}` resolved correctly |
| Auth required | 401 without token |
| Rate limiting | 429 after threshold |
| Instance not found | 404 with invalid ID |
| Wrong user blocked | Cannot transition another user's booking |

### Phase 3 Tests — Provider Inventory (Health Shop)

```
__tests__/api/inventory/
  inventory-crud.test.ts      — Provider CRUD operations
  inventory-orders.test.ts    — Order creation, status updates
  health-shop-search.test.ts  — Public search/browse

__tests__/unit/inventory/
  order-service.test.ts       — Order logic, stock validation
```

| Test | What it verifies |
|------|-----------------|
| Provider can add item | POST /api/inventory returns 201 |
| Provider can update item | PATCH updates price, quantity |
| Provider can deactivate item | DELETE sets isActive=false |
| Other provider cannot edit | 403 for wrong provider |
| Patient can browse shop | GET /api/search/health-shop returns items |
| Category filter works | Filter by "medication", "eyewear", etc. |
| Provider type filter works | Filter by PHARMACIST, DENTIST, etc. |
| Order creation debits wallet | Patient wallet decremented |
| Order creation credits provider | Provider wallet incremented |
| Out of stock blocked | Cannot order item with quantity=0 |
| Prescription required enforced | Rx items blocked without prescription |
| Non-Rx items pass | Vitamin C ordered without prescription |
| Stock decremented on order | Quantity reduced after order |
| Low stock alert sent | Notification when quantity <= minStockAlert |

### Phase 4 Tests — Status-Triggered Actions

```
__tests__/unit/workflow/strategies/
  video-call.strategy.test.ts
  stock-check.strategy.test.ts
  stock-subtract.strategy.test.ts
  prescription-check.strategy.test.ts
  content-attachment.strategy.test.ts

__tests__/integration/workflow/
  video-call-trigger.test.ts
  stock-workflow.test.ts
```

| Test | What it verifies |
|------|-----------------|
| triggers_video_call creates room | VideoRoom created, roomId in result |
| Video call notification has link | Notification message includes video link |
| triggers_stock_check blocks if OOS | Transition fails with stock error |
| triggers_stock_check passes if in stock | Transition succeeds |
| triggers_stock_subtract decrements | Item quantity reduced |
| Stock subtract sets inStock=false at 0 | Flag updated when depleted |
| Low stock alert at threshold | Notification sent to provider |
| requires_prescription validates | Fails without Rx, passes with Rx |
| requires_content attaches data | contentData stored in step log |
| Multiple flags compose | stock_check + stock_subtract in same step |

### Phase 5 Tests — Seed Data

```
__tests__/integration/workflow/
  seed-templates.test.ts
```

| Test | What it verifies |
|------|-----------------|
| All provider types have templates | At least 1 template per provider type |
| All service modes covered | office/home/video where applicable |
| Templates have valid steps JSON | Steps array parseable, statusCodes present |
| Templates have valid transitions | Every transition references existing steps |
| Notification messages defined | Default messages exist for key steps |
| Templates linked to PlatformServices | platformServiceId references valid service |
| Existing seeds still work | 00-33 seeds run without error |

### Phase 6 Tests — Provider & Admin Workflow UI

```
e2e/workflow/
  provider-workflow-management.spec.ts
  regional-admin-workflows.spec.ts
```

| Test | What it verifies |
|------|-----------------|
| Provider can view their workflows | Workflow list page loads with templates |
| Provider can create custom workflow | Step builder creates valid template |
| Provider can customize notifications | Custom message saved and used |
| Provider can toggle step flags | Video call flag toggles correctly |
| Regional admin can create template | Template saved with regionCode |
| Regional admin template used as fallback | When provider has no custom template |

### Phase 7 Tests — Patient-Facing Workflow UI + Notification Deep Links

```
e2e/workflow/
  booking-workflow-patient.spec.ts
  booking-workflow-provider.spec.ts
  notification-deep-link.spec.ts
```

| Test | What it verifies |
|------|-----------------|
| Patient creates booking → sees pending status | Booking detail page shows timeline |
| Provider accepts → patient sees confirmed | Real-time update via Socket.IO |
| Provider starts consultation → status updates | Timeline progresses |
| Provider completes → patient sees completed | Final step highlighted |
| Patient cancels → refund shown | Cancellation flow with refund info |
| Video call banner appears | When step has triggers_video_call |
| Prescription visible at step | Content viewer shows Rx details |
| Lab results visible at step | Content viewer shows lab data |
| Notification click → booking detail | Deep link navigates correctly |
| Notification shows correct message | Custom template variables resolved |
| Action buttons match role | Patient sees patient actions only |
| Provider sees provider actions | Provider sees provider actions only |
| Timeline shows all past steps | Full audit trail visible |
| Mobile responsive | Timeline works on small screens |

### Phase 8 Tests — Migration

```
__tests__/integration/workflow/
  migration.test.ts
```

| Test | What it verifies |
|------|-----------------|
| Existing bookings still load | Old bookings without workflow render |
| Migration creates instances | Script creates WorkflowInstance for active bookings |
| Migrated instance has correct status | currentStatus matches booking.status |
| New bookings auto-get workflow | Post-migration bookings have instances |

### Regression Tests (run after every phase)

```bash
# Run full suite after each phase
npx tsc --noEmit                    # Type safety
npx vitest run                       # All unit + API + integration tests
npx playwright test                  # All E2E tests
```

| Regression check | What it verifies |
|-----------------|-----------------|
| Existing booking APIs work | POST /api/bookings/doctor still creates appointment |
| Existing booking actions work | Accept/deny/cancel still function |
| Existing notification system works | Notifications still created and displayed |
| Existing wallet operations work | Debit/credit/refund unchanged |
| Existing search works | /api/search/providers returns results |
| Existing pharmacy works | PharmacyMedicine CRUD unchanged |
| Login/register unchanged | Auth flow works for all user types |
| Dashboard pages load | No broken imports or missing components |

### Test File Structure

```
__tests__/
  unit/
    workflow/
      engine.test.ts
      registry.test.ts
      validators.test.ts
      notification-resolver.test.ts
      strategies/
        video-call.strategy.test.ts
        stock-check.strategy.test.ts
        stock-subtract.strategy.test.ts
        prescription-check.strategy.test.ts
        content-attachment.strategy.test.ts
    inventory/
      order-service.test.ts
  api/
    workflow/
      transition.test.ts
      instances.test.ts
      templates.test.ts
    inventory/
      inventory-crud.test.ts
      inventory-orders.test.ts
      health-shop-search.test.ts
  integration/
    workflow/
      seed-templates.test.ts
      video-call-trigger.test.ts
      stock-workflow.test.ts
      migration.test.ts
      schema-validation.test.ts

e2e/
  workflow/
    booking-workflow-patient.spec.ts
    booking-workflow-provider.spec.ts
    provider-workflow-management.spec.ts
    regional-admin-workflows.spec.ts
    notification-deep-link.spec.ts
```

### Test Data Strategy

- Tests use seeded demo data (existing seeds 00-33 + new workflow seeds)
- Test users: existing seeded users (patient PAT001, doctor DOC001, etc.)
- API tests authenticate with JWT tokens generated for test users
- E2E tests login through the login page
- Each test suite handles its own cleanup (delete created records after test)
- Integration tests use `prisma.$transaction` with rollback for isolation
