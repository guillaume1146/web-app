# SaaS / Enterprise-grade Best Practice — Hard Rule

MediWyz is a multi-tenant SaaS serving patients, providers, insurance members, and corporate customers across six countries. Every feature should compete with the best of healthcare SaaS (Oscar, Teladoc), social health (MyFitnessPal, Strava), and enterprise admin (Linear, Stripe, Vercel). This rule captures the patterns we expect every new feature to satisfy — or to consciously waive with a written note.

## The 8 pillars

### 1. Activation first, retention forever
- Every new user has **≤3 steps from signup → first meaningful action** (first booking, first post, first AI chat).
- Unfinished activation = onboarding checklist on the dashboard, NOT a locked experience.
- Retention hooks: streaks (health tracker), digest emails/push (weekly activity), anniversary nudges ("1 year ago you booked your first appointment").

### 2. Feature flags everywhere
- New features ship behind a flag (`RoleFeatureConfig`, env var, or experiment key).
- Roll out: internal → 1% of users → 10% → 100% (never straight to 100%).
- Kill switch must exist even for "safe" features. A flag review that says "this can't fail" still needs a flag.

### 3. Measure what you shipped
- Every new surface emits an event (at minimum: screen view, primary CTA click, error shown, empty state shown).
- No anonymous events — tag `userId`, `userType`, `region`, `locale`.
- Aggregate: weekly/monthly active users by feature. If you can't answer "how many used this last week?", the feature has no analytics.

### 4. Empty states & first-run = product surface area
Treat the empty state as marketing copy for your feature.
- Bad: "No bookings yet"
- Good: "Ready for your first visit? Find a doctor near you → [Browse doctors]"
The empty state is often the most-viewed screen for new users.

### 5. Errors are conversations
- Every error tells the user *what happened*, *what they can do*, *how to reach a human*.
- Network errors: clear retry + offline badge.
- 4xx: explain the rule ("You need a prescription to buy this" — not "403 Forbidden").
- 5xx: apologise, log, offer a "contact support" link.

### 6. Accessibility is a feature
- WCAG AA (contrast ≥ 4.5:1, keyboard-navigable, screen-reader labels).
- `semanticLabel` on every icon-only button (Flutter) / `aria-label` (web).
- Motion-reduce respected: if the user has `prefers-reduced-motion`, kill the animations.

### 7. Performance budget per screen
- First meaningful paint: ≤1.5s on 3G.
- JS bundle per route: ≤120kb gzip.
- API call on critical path: ≤500ms median.
- Flutter: no frame above 16ms during a typical scroll.
If a new screen exceeds budget, ship it behind a flag + add a "perf debt" task.

### 8. Multi-tenant sanity
- Every query scoped by `userId` / `companyId` / `regionCode` as appropriate.
- Admin tools never leak cross-tenant data (including logs, error messages, autocomplete).
- i18n: every user-facing string keyed, never inline English.
- Timezone: store UTC, display in `UserPreference.timezone`.

## Healthcare-specific patterns (non-negotiable)

- **Consent** on first clinical interaction ("Share health data with provider X for this booking?")
- **Audit trail** for every clinical action (prescription view, lab result access, medical record edit)
- **Privacy-by-default** — patient data never appears in search/autocomplete to non-providers
- **Emergency escape hatch** — one-tap path to emergency services on every screen
- **Stigma-aware copy** — no "failure" language around mental health, chronic conditions, or reproductive care

## Enterprise SaaS signals that signal "professional"

- Roles + capabilities + permissions (we have this — capability, not role)
- API key management per company (future)
- SSO support (future — SAML/OIDC for enterprise plans)
- SCIM user provisioning (future — for bulk corporate onboarding)
- Audit export (admin can download a CSV of user actions)
- Data export / right-to-be-forgotten flows (GDPR-ready; we serve EU-adjacent regions)
- Status page (public health of the platform — `/status` endpoint)
- Usage-based billing metering (corporate plans already have quotas — surface them)

## Social SaaS patterns worth stealing

- **Stories / ephemeral content** — providers post short updates that expire
- **Share-to-earn** — referral code surfaces in every share sheet
- **Friend/connection graph** — "patients of Dr. Sarah also consulted…" (anonymised)
- **Activity feed** — not just your data, but contextual nudges ("3 providers near you added evening slots")
- **Bookmarks / favourites** — "my providers" for one-tap rebooking

## PWA / mobile parity essentials

- Offline-first for reads: patients can view past prescriptions + lab results with no network.
- Service worker caches `/api/roles`, `/api/regions`, `/api/users/:id` on first hit.
- Push notifications (web + Flutter) for status changes, not just chat messages.
- Deep linking: every booking/prescription has a shareable URL that logs you in and jumps to it.

## Forbidden patterns

- ❌ Features shipped without an activation metric
- ❌ Feature flags that default-on in production on day-1
- ❌ Placeholder copy (`lorem ipsum`, `"Your text here"`) in any merged code
- ❌ Hardcoded English strings in net-new user-visible code
- ❌ New schemas without tenant scoping when they hold user data
- ❌ Polling for changes where a Socket.IO event exists
- ❌ Large JS libraries for trivial features (date-fns for a formatter we wrote ourselves)
- ❌ Modal dialogs for non-blocking decisions

## Review checklist per PR

Before merging a user-visible feature:
1. Can I name the activation metric? Where does it fire?
2. Is there a feature flag? What's the default in prod?
3. What does the empty state say? Is there a CTA?
4. What happens on network error? On 4xx? On 5xx?
5. Has a non-English user seen this screen? (Test with fr locale.)
6. Is every icon-only button labelled?
7. What's the perf budget? Did I measure?
8. Which roles can see this? Can they NOT see competitors' data?
9. Is there an analytics event on primary CTA?
10. Is the empty state prose competitive with Linear / Stripe?

Ten yes's = ship. Any no = write a note explaining the trade-off or address it.
