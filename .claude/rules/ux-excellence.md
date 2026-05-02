# UX Excellence — Hard Rule

MediWyz is a health platform. Users (patients, providers, insurance members) are often anxious, busy, or in the middle of a medical situation. Every interaction must feel **clear, fast, and reassuring**. This rule is not optional polish — it's the product.

## The six principles

### 1. One screen = one decision
Every screen should have a single obvious next action. If a user has to pause and ask "what do I do now?", the screen is broken.
- Primary CTA visible without scrolling
- Secondary actions are text-only or small
- No more than one destructive action per screen (and it lives far from the primary CTA)

### 2. Status beats jargon
Never expose raw status codes (`sample_collected`, `IN_PROGRESS`, `DENIED_BY_PROVIDER`) to end users. Translate to human copy and pair with a visual:
- ✅ "Your lab tech collected your sample at 3:45 PM. Results expected within 24 hours."
- ❌ "Status: sample_collected"
Step labels live in the DB (`WorkflowStep.label`) — if you see hardcoded status strings in the UI, move them.

### 3. The timeline is sacred
Every booking / order / enrollment must show a progression: past → current → next. Users need to know where they are, what happened, and what's coming. Use the `WorkflowTimeline` component, never invent a new one. Surface `expectedDurationMinutes` as "usually ready within X" copy.

### 4. Actions are visible, one tap away
`WorkflowStep.actionsForPatient` / `actionsForProvider` are the source of truth for "what can I do now?" Render them as primary buttons on the booking card, NOT buried in sub-screens. Every transition flows through `POST /api/workflow/transition`.

### 5. Empty states teach, don't apologise
Empty list → don't just say "No data". Say what to do next.
- ✅ "No appointments yet. Find a doctor in your area →"
- ❌ "No results."

### 6. Errors are opportunities
When something fails, explain what happened + what to try. Never show a raw error code.
- ✅ "Your wallet balance is too low. Top up to continue →"
- ❌ "400 Bad Request"

## Perceived-speed rules

- Any action that takes >300ms must show a loading indicator within 100ms
- Use optimistic updates for reversible actions (like/unlike, favourite, toggle)
- Skeleton screens for initial loads (never a spinner on a blank page)
- Preload the next-likely screen (e.g. prefetch provider detail when a search result card enters viewport)
- `RefreshIndicator` (Flutter) + pull-to-refresh pattern everywhere a list exists

## Information density

- **Patient views** — minimal. Show 3-5 most relevant fields. Hide the rest behind "Show more".
- **Provider views** — dense. Table-like layouts, bulk actions, keyboard shortcuts where possible.
- **Admin views** — densest. Sortable tables, filters, CSV export.

Know your audience for each screen. The same data should render differently for a patient vs a provider dashboard.

## Typography & spacing

- Headings: always `fontWeight: FontWeight.bold` (Flutter) / `font-bold` (Tailwind) — half-weights feel unconfident
- Body text: minimum 13px mobile, 14px desktop
- Use `MediWyzColors.navy` for primary text, `Colors.black54` for secondary, `Colors.black45` for meta. No other greys.
- Cards: 12px radius, always 16px internal padding (mobile), 20px (desktop)
- Gutter between sections: 16px mobile, 24px desktop

## Motion & haptics

- Route transitions: `Curves.easeOut`, 200ms — never bouncy
- Haptic feedback (`HapticFeedback.selectionClick()`) on: primary CTA tap, refresh trigger, delete confirmation
- NO haptics on passive events (scrolling, typing)

## Forbidden patterns

- ❌ Blocking modals for non-destructive actions
- ❌ Toasts without an auto-dismiss or a close button
- ❌ Forms longer than 7 fields without sectioning
- ❌ "Are you sure?" confirmation for trivial actions (rename, favourite)
- ❌ Hiding the primary CTA behind a kebab menu
- ❌ Icons without labels on primary navigation
- ❌ Fixed-width layouts that overflow on small screens
- ❌ Red for anything that isn't destructive or an error

## Self-check for every new screen

1. What is the user here to do? (One sentence)
2. Where is the primary CTA? (Should be visible without scrolling)
3. What does the screen show while loading? (Not a blank spinner)
4. What does it show when empty? (Action-oriented copy, not "No data")
5. What happens on error? (Clear message + recovery path)
6. Is the timeline visible? (For any stateful flow)
7. Is this accessible? (Labels on icons, contrast ≥ 4.5:1, focus rings)

If you can't answer all seven, the screen is not ready to ship.
