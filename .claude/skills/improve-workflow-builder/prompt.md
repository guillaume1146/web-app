---
description: Make the workflow builder easier + more practical — baseline-then-iterate walkthrough that stays faithful to the 10 UX principles and the runtime contract
user-invocable: true
---

# Improve Workflow Builder

Step-by-step skill for improving any part of the workflow authoring/execution surface in a way that's measurable and reversible. Use when the user says "the workflow builder is hard", "add a feature to the workflow builder", or when the workflow-ux-reviewer agent flags Important/Critical findings.

## When to invoke

- User reports confusion / friction on the workflow builder
- Runtime bug: a step button doesn't transition to the next status
- Notification missing / malformed at a specific step
- Adding a new step flag (triggers_X) and wiring its strategy + UI toggle
- Building richer views: graph, preview, drag-and-drop, AI-assist

## Step 1 — Baseline, don't guess

1. Read `.claude/rules/workflow-builder-ux.md` — the contract.
2. Open a ≥9-step seeded template in the builder (`nurse-sample-collection-home` has 10 steps — use it). Walk through every action and note where it feels wrong.
3. Look at `app/regional/(dashboard)/workflows/page.tsx` (list) + `[id]/page.tsx` (edit) + `components/workflow/builder/WorkflowBuilder.tsx` + `StepEditor.tsx` + `StepFlagToggles.tsx`. Read them before changing anything.
4. If a bug was reported: reproduce it with the seeded data FIRST. If you can't reproduce, the user's report needs more detail — ask.

## Step 2 — Identify the friction category

Match the issue to one of these:

- **Authoring friction** — too many clicks / fields / modals. Fix: remove steps, auto-derive, inline-edit. (Rule sections 2–5.)
- **Discovery friction** — user doesn't know what a flag does. Fix: clearer labels, grouped toggles, hover tooltips linking to strategy code. (Rule sections 10 + step-flag rules.)
- **Confidence friction** — user hesitates to publish. Fix: preview tab, usage metrics, version snapshot banner. (Rule sections 7 + 9 + 10.)
- **Runtime friction** — button clicks but nothing happens. Fix: check `WorkflowEngine.transition()` + step.actionsForProvider + step action strategy registration.
- **Relationship friction** — user can't tell how role × service × template connect. Fix: show the cascade at the top of the builder (resolved-from: system-default / regional / provider-custom).

## Step 3 — Prefer auto-derive over new inputs

Before adding a field, ask: can this be inferred?

- Transitions from actions
- Slug from name
- Step order from position
- Role options from `ProviderRole` table (not hardcoded)
- Status dropdown options from OTHER steps on the same template
- Placeholders from a fixed allow-list
- Notification recipient from the per-step `notifyPatient` / `notifyProvider` presence

If the answer is "yes, it can be inferred" — DON'T add the input. Expose the auto-derived value read-only.

## Step 4 — Don't break the dynamic-role rule

The builder MUST work for any `ProviderRole` — including ones the admin just created via CRUD. That means:

- Provider-type dropdown is populated from `GET /api/roles?isProvider=true`.
- No `if (providerType === 'DOCTOR') …` branching in `WorkflowBuilder.tsx` or its children.
- Per-step flags are a fixed universal set, not a role-specific list.
- Seeding a new ProviderRole in the DB must immediately make it choosable in the builder.

Cross-reference `.claude/rules/dynamic-roles.md`.

## Step 5 — End-to-end smoke test any change

Any UX change must be proved with this loop:

1. Open the builder, add a step, wire an action → `target_status` arrow.
2. Save the template.
3. Create a booking that uses the service mapped to this template.
4. As the provider, click the action button on the booking card.
5. Assert: the booking's `WorkflowInstance.currentStatus` moved to the target; a `WorkflowStepLog` row was written; both affected users got a `Notification` via Socket.IO.
6. If any `triggers_X` flag was on the target step, assert its strategy fired (payment moved money, video room created, etc.).

If the loop has 6 yeses, ship. Any no = fix before merging.

## Step 6 — Measure

- Add instrumentation: time-to-first-save on a fresh template, number of errors surfaced during edit, drop-off rate after clicking "Create workflow".
- Watch the `AiCallLog`-style telemetry (if we have a similar WorkflowLog table) to detect templates with high abandon rates.
- A/B improvements behind env flags (`WORKFLOW_BUILDER_AI_ASSIST_ENABLED=true`) and ramp.

## Step 7 — Idea pool (high-leverage improvements)

When the user asks "what can we add?", draw from here (don't invent on the fly):

- **Template library**: "Start from" menu listing 10 vetted templates (Doctor consultation, Pharmacy dispense, Home nurse visit, …). Clicking clones the template into edit mode.
- **Graph view**: toggle list ↔ graph (nodes + arrows) for templates with ≥8 steps. Uses `react-flow` or a minimal SVG.
- **AI-assist**: "Describe this workflow in plain English" → call Groq → return a step list the user reviews. Cheap, high signal.
- **Placeholder picker**: each notification editor gets a `{{…}}` token-picker so placeholder typos die.
- **Preview tab (web chrome)**: renders the patient app's booking card around the workflow preview so the user sees exactly what their member will see — not just raw text.
- **Drag-to-reorder**: uses `@dnd-kit/sortable`; step numbers auto-renumber.
- **Real-time metrics on the list page**: instances-today + avg-duration per template (already in scope — just needs wiring).
- **Version history drawer**: when editing a published template, right-side drawer shows prior versions + a diff.
- **Validation panel**: pinned at the bottom showing every issue found so far + a "jump to" link to each offending field.
- **Bulk notification edit**: change "we're on our way" across 5 steps at once.

## Anti-patterns this skill explicitly rejects

- Adding a wizard of >3 screens to create a workflow
- Requiring users to type JSON into a textarea
- A single template shared across 20 provider types — templates should be authored per (providerType × serviceMode), with cross-template cloning for reuse
- Breaking backward compat for in-flight bookings — always version
- Silent saves, silent publishes
- "Advanced mode" toggles that hide fields — either the field is essential (show it) or it isn't (drop it)

## When the user asks to add a new step-flag

1. Decide: is it deterministic enough to express as a flag, or is it business logic that belongs in the booking service?
2. Add the flag to `workflow/types.ts` + the `StepFlagToggles.tsx` grouped set.
3. Create a strategy class under `backend/src/workflow/strategies/`.
4. Register it in `workflow.module.ts`.
5. Write a `.spec.ts` for the strategy — trigger match, no-match, side-effect, idempotency.
6. Add a tooltip on the toggle describing the side effect in plain language.
7. Update this skill's idea pool if it opens a new category.

## Tools you'll likely use

- `Read`, `Grep`, `Glob` — find the relevant files
- `Edit`, `Write` — builder + strategy updates
- `Bash` — `npx jest backend/src/workflow` for engine tests; `npx tsc --noEmit` for both projects
- `Agent` (subagent_type=workflow-ux-reviewer) — send the final diff for review before merging
