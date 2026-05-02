# Workflow Builder UX — Hard Rule

MediWyz lets any Regional Admin — and, longer-term, any provider — compose their own booking workflows with N steps, status transitions, step-level flags (payment / video / stock), and per-step notifications. The builder at `components/workflow/builder/WorkflowBuilder.tsx` is the authoring surface; runtime lives in `backend/src/workflow/` (engine + strategies). This is one of the most powerful features in the app, and also the one most likely to scare a non-technical user.

Treat every change to the workflow builder as a UX decision first, a schema decision second.

## The stack — know where each concern lives

```
  ProviderRole  ────────────────────────┐
     (CRUD by regional admin)           │
                                        ▼
     PlatformService ────────►  WorkflowTemplate  ───────►  WorkflowInstance
        (what is offered)         (how the flow runs)         (one live booking)
                                        │
                                        ▼
                                     StepFlag
                                 (triggers_payment,
                                  triggers_video_call,
                                  triggers_stock_subtract, …)
```

- A **ProviderRole** defines who can do the work (DOCTOR / NURSE / DENTIST / future AUDIOLOGIST …). Stored in DB, CRUD-managed.
- A **PlatformService** is a bookable action (`Home visit`, `Video consultation`, `Sample collection`). Tied to a providerType.
- A **WorkflowTemplate** is the N-step script the engine runs for one (providerType × serviceMode) pair. Resolution order: provider-custom → regional admin → system default.
- A **WorkflowInstance** is the live state for one booking.
- **StepFlags** compose side effects onto a step: video room, payment, stock subtract, content requirement. Never hardcode these per role — compose with flags.

Any UX change must preserve this separation. Don't let the builder leak concepts from one layer into another (e.g. don't put "providerType" selection inside the step editor; it belongs on the template as a whole).

## The UX principles (non-negotiable)

### 1. Template-first, never blank-page
A new user creating their first workflow should NEVER see an empty canvas. The builder must default to a 5-step template (pending → confirmed → in_progress → completed + cancelled) that already works end-to-end. Creating a workflow = editing that default, not typing every field from scratch.

### 2. One screen, no modals
Step editor, transitions view, notification editor all live on one scrollable page. No stacked modals. No "next" wizards. The user can see the whole graph at a glance.

### 3. Drag-to-reorder, click-to-expand
Reordering steps is drag-and-drop. Editing a step is a click on the collapsed row (which expands inline). Never a separate page.

### 4. Auto-generate what you can infer
Transitions are AUTO-generated from step actions (`pending.accept → confirmed`). Step ordering is auto-numbered. Slugs are auto-computed from names. The user types as little as possible. Every auto-generated value stays visible so they can override.

### 5. Plain-language action codes
Internal codes are `snake_case` (e.g. `sample_collected`). The user types a Button Label (`"I've collected the sample"`) and the code auto-slugifies. Never force them to type codes by hand.

### 6. Inline validation, non-blocking
Errors appear under the offending field in red, and the Save button shows a count of problems — `Save (3 issues)` — not a modal. The user can keep editing other steps while fixing.

### 7. Preview before save
Every builder has a "Preview" tab that renders the workflow AS A PATIENT AND AS A PROVIDER would see it — shows the buttons that will appear at each step, the notification text (filled with `{{placeholder}}` → sample data), the estimated duration. Preview is a mandatory step before hitting save on a new template.

### 8. Save = done, not deployed
Save creates a draft. Explicit "Publish" button makes it the active template for that (providerType × serviceMode). Drafts never affect production bookings.

### 9. Show who's using it
On the template list, each template shows: # instances today / this week / total, avg duration, drop-off rate. An owner-mode chart. Editing a template that has 500 in-flight bookings should show a warning banner.

### 10. Version before destruction
Publishing a new version of an existing template snapshots the old one. Old in-flight bookings continue running the old version. The schema + engine must support this — don't patch templates in-place for live bookings.

## Notification UX rules

- Each step has OPTIONAL `notifyPatient` and `notifyProvider` slots on the template — authors fill them when they want custom copy.
- Title + message, each with `{{placeholder}}` support. The builder shows a tag-picker so users don't misremember placeholder names.
- Supported placeholders: `{{patientName}}`, `{{providerName}}`, `{{serviceName}}`, `{{scheduledAt}}`, `{{amount}}`, `{{status}}`, `{{bookingId}}`, `{{actionBy}}`, `{{eta}}`.
- Preview mode renders each notification with demo data (`Marie Dupont`, `15:00`, `500 MUR`) so the user sees exactly what the member will receive.
- **Runtime invariant — non-negotiable, enforced by the engine:** every status change (including initial workflow creation) emits a notification to BOTH the patient and the provider. When a side has no template-authored copy, the engine auto-synthesises `"Your booking moved to: <step label>"`. No step is ever silent at runtime. `notifyX = null` on the template means "use the default", not "don't notify". Guarded by `backend/src/workflow/always-notify-both.spec.ts` — do not regress.
- The builder's preview tab still shows a soft warning when a step has neither side authored, so admins know the default will be used. That's guidance, not a hard error.

## Action-button rules

- Each step has `actionsForPatient[]` and `actionsForProvider[]`. Empty arrays are valid (terminal states, passive steps).
- Action object: `{ action: snake_case_code, label: "Human text", targetStatus: existing_status_code, style: primary|secondary|danger }`.
- The `targetStatus` dropdown ONLY shows statuses already defined on the current template — impossible to point to a missing state.
- Danger-styled buttons (cancel, reject) auto-get a "are you sure?" confirmation at runtime. The builder doesn't expose that toggle — danger implies it.

## Step-flag toggles

Flags compose behaviour. The builder groups them:

- **Money**: `triggers_payment` (charge patient, credit provider 85/15), `triggers_refund` (reverse the payment)
- **Conversation**: `triggers_conversation` (opens chat channel), `triggers_video_call` (spawns video room)
- **Content**: `requires_content: <type>` (e.g. `lab_result`, `care_notes`), `requires_prescription`
- **Stock**: no longer in flags — inventory orders handle stock automatically in the order service
- **Completion signals**: `triggers_review_request` (asks for review), `triggers_completion_bonus`

Each flag has a one-line hover tooltip explaining the side effect in plain language + a link to the strategy class that runs it.

## Forbidden patterns

- ❌ A modal that blocks editing other fields while saving
- ❌ Typing a raw JSON blob for steps or transitions
- ❌ A "next" wizard with >3 steps to create a basic workflow
- ❌ Requiring the user to type `snake_case` codes by hand
- ❌ A select box of 30+ providerTypes without search (use a combobox; DB-driven)
- ❌ Hardcoded role names in the builder (`if (providerType === 'DOCTOR')`) — breaks the dynamic roles rule
- ❌ Saving partial data silently — always show what was saved and what was skipped
- ❌ "Transition" lists that duplicate what the actions array already expresses — transitions are auto-derived, not typed
- ❌ A "status code" field without a sibling "human label" — runtime UI shows labels, DB stores codes, both required
- ❌ One giant flat list of 100 flag toggles — group them by domain (money / chat / content / …)

## Self-check before merging any builder change

1. Can a non-technical user (regional admin with minimal training) create a basic 5-step workflow in under 2 minutes, end-to-end?
2. If the user opens a 10-step seeded template (e.g. `nurse-sample-collection-home`), does every step's expand-edit-reorder-delete round-trip work without crashing?
3. Can they add a new step BETWEEN two existing steps and have the order auto-renumber correctly?
4. Does every step button trigger the correct status transition + notification at runtime? (E2E test.)
5. Does the preview show what the patient will literally see?
6. Does Save produce a template that `WorkflowEngine.attachWorkflow()` can consume without throwing?
7. Are published templates visible to the engine immediately? Is the cache invalidated?
8. If the user is editing a template with live instances, are they warned?
9. Does Save return a response that tells them "ok, here's your new template id" — not a silent redirect?
10. Does undo/discard reliably reset the form?

All 10 yeses = ship. Any no = write a note explaining the trade-off OR fix it.
