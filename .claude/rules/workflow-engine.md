# Workflow Engine — 3-Tier Trigger Architecture

## Core Principle
ALL booking status changes go through `WorkflowEngine.transition()` — never update status directly in DB.
Every service MUST have a workflow template — bookings throw `BadRequestException` if none resolves.

---

## What the platform tracks — and what it does NOT

The platform ONLY tracks `ProviderInventoryItem` (Health Shop products that providers sell to patients).
Clinical supplies a provider uses *during* service delivery (syringes, gloves, reagents) are their **internal concern** — the platform never models, checks, or deducts those.

---

## Two separate domains — never mix them

### Domain 1: Health Shop — provider sells items to a patient
The patient buys a product. The workflow engine handles the order lifecycle.
Stock check (before acceptance) and stock subtract (at completion/collection) are **systematic and automatic** — no step flags, no admin configuration per step.

Configured at the **template level** via `serviceConfig.stock`:

```json
{
  "stock": {
    "checkOnAcceptance": true,
    "subtractOnCompletion": true
  }
}
```

| Field | Effect |
|---|---|
| `checkOnAcceptance` | Before the order is accepted, verify every `inventoryItems` entry has sufficient stock. Throws if any item is unavailable. |
| `subtractOnCompletion` | When the booking reaches a terminal success step, deduct all `inventoryItems` from the provider's `ProviderInventoryItem` records. |

Pre-flight prescription check (for prescription-only items) is configured via `serviceConfig.preflight.requires`:

```json
{
  "preflight": { "requires": ["db:prescription"] }
}
```

Health Shop templates (`health-shop-delivery-order`, `health-shop-pickup-order`, `pharmacy-prescription-fulfilment`) already have these configs in seed 50.

### Domain 2: Clinical workflows — scan/examine → return result to member
The service IS the production of a result (lab test, BP check, eye scan, dental X-ray).
The content requirement is **systematic via WorkflowStepType.defaultFlags** — the admin picks the right step type and the behaviour comes automatically. No manual flag placement needed.

Seeded step types and their automatic flags:
| StepType code | defaultFlags | Meaning |
|---|---|---|
| `RESULTS_READY` | `{ "requires_content": "lab_result" }` | Lab tech must attach result before marking ready |
| `EXAM_COMPLETE` | `{ "requires_content": "report" }` | Provider must upload exam report |
| `PRESCRIPTION_WRITTEN` | `{ "requires_content": "eye_prescription" }` | Optometrist must attach eye prescription |
| `CARE_NOTES` | `{ "requires_content": "care_notes" }` | Nurse must write care notes |
| `VIDEO_CALL_READY` | `{ "triggers_video_call": true }` | Auto-creates video room |
| `TREATMENT_PLAN_CREATED` | `{ "requires_content": "exercise_plan" }` | Physio must attach exercise plan |

The engine merges these defaults into `resolvedFlags` before running validators.
**Explicit flags on the step always override the step type's defaults.**

---

## 3-Tier Trigger System (inside the workflow engine)

### Tier 1: SYSTEMATIC (always execute — not configurable)
| Action | When |
|--------|------|
| Notifications to both sides | Every transition |
| Conversation creation | On acceptance |
| Audit log (WorkflowStepLog) | Every transition |
| Booking status sync | Every transition |

### Tier 2: SEMI-AUTOMATIC (booking context — not configurable)
| Action | When | Condition |
|--------|------|-----------|
| Video room | On accept/confirm | `serviceMode === 'video'` |
| Payment | On accept/confirm | `metadata.servicePrice > 0` and timing matches |
| Balance pre-flight | On accept/confirm | Always — even with `paymentTiming = PAY_LATER` |
| **Stock check** | **On accept/confirm** | **`serviceConfig.stock.checkOnAcceptance = true`** |
| Refund | On cancel/deny | If payment was already made |
| Review request | On completion | Always |
| **Stock subtract** | **On terminal success step** | **`serviceConfig.stock.subtractOnCompletion = true`** |

### Tier 2+: SERVICE-LEVEL SYSTEMATIC (serviceConfig JSON — zero schema change)
Configured once on the template. Adding a new behaviour = new Strategy class + new string key. No migration.

```json
{
  "preflight": {
    "requires": ["db:prescription", "input:dental_chart"]
  },
  "stock": {
    "checkOnAcceptance": true,
    "subtractOnCompletion": true
  },
  "onComplete": {
    "actions": ["any_registered_handler_key"]
  }
}
```

| String format | What happens |
|---|---|
| `"db:prescription"` | Block acceptance if no active prescription in DB |
| `"input:<ContentType>"` | Block acceptance if that content type not in transition input |
| Any registered handler key | Execute that handler on completion (backward compat / future extensibility) |

### Tier 3: STEP-TYPE-DRIVEN (defaultFlags — automatic when admin picks a step type)
The admin picks a `WorkflowStepType` (e.g. `RESULTS_READY`) and the engine merges its `defaultFlags` into `resolvedFlags`. No manual flag placement needed. See Domain 2 table above.

**There are NO manually configurable per-step flags.** Every workflow behaviour fires systematically:

| Behaviour | How it fires |
|---|---|
| `triggers_video_call` | Tier 2: `serviceMode === 'video'` on acceptance, or `VIDEO_CALL_READY`/`VIDEO_CALL_ACTIVE` step type |
| `triggers_audio_call` | Tier 2: `AUDIO_CALL_READY`/`AUDIO_CALL_ACTIVE` step type |
| `triggers_payment` | Tier 2: `paymentTiming` on template (`ON_ACCEPTANCE` or `ON_COMPLETION`) |
| `triggers_refund` | Tier 2: any cancel/deny/decline/reject action |
| `triggers_conversation` | Tier 2: acceptance, or `CONFIRMED` step type |
| `triggers_review_request` | Tier 2: terminal success step |
| `triggers_stock_check` | Tier 2: `serviceConfig.stock.checkOnAcceptance = true` |
| `triggers_stock_subtract` | Tier 2: `serviceConfig.stock.subtractOnCompletion = true` |
| `requires_content` | Tier 3: step type `defaultFlags` only (RESULTS_READY, EXAM_COMPLETE, etc.) |
| `requires_prescription` | Tier 3: step type `defaultFlags` only (MEDICATION_REVIEW, etc.) |

The `StepFlags` interface only carries `triggers_video_call`, `triggers_audio_call`, `requires_content`, and `requires_prescription` — all four are set exclusively by `WorkflowStepType.defaultFlags`, never by an admin in the builder.

---

## WorkflowStepType — the step library
Seeded atoms with pre-set `defaultFlags`. The engine merges them automatically.
Admin picks a step type → behavior comes with it → no flag configuration needed.
Step-level explicit flags always override the defaults.

## Template Resolution Cascade (6 levels — specificity wins)
1. Provider's custom template linked to this exact `platformServiceId`
2. Regional admin template linked to this exact `platformServiceId` + region
3. System default linked to this exact `platformServiceId`
4. Regional admin generic template for `(providerType + serviceMode + region)`
5. System default for `(providerType + serviceMode)`
6. Provider's generic fallback (last resort)

**Rule:** provider-custom templates only win when explicitly linked to a `platformServiceId`.
Without a link they are drafts and don't override the system default.

## API Endpoints
```
POST /api/workflow/transition      — status change (all tiers fire)
GET  /api/workflow/instances/:id   — instance with timeline
GET  /api/workflow/templates       — list templates
POST /api/workflow/templates       — create (body.serviceConfig for service-level config)
PATCH /api/workflow/templates/:id  — update
```
