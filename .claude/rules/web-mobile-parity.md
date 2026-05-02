---
description: Any user-facing change on the Next.js web frontend must mirror to the Flutter mobile app in the same change set
globs: "{app,components,mobile/lib}/**/*"
---

# Web ↔ Mobile parity (hard rule)

The Flutter mobile app (`mobile/`) is a first-class client, not an afterthought. It must match the web app's mobile-responsive UI closely.

## The rule

Every change on the web frontend that affects what a user sees or does must have a matching change on the Flutter side in the **same commit or sequential commit pair**. No merging web-only changes that create a parity regression.

## What counts as "user-facing"

| Change | Needs Flutter mirror? |
|---|---|
| New route / page under `app/**/page.tsx` | ✅ add Flutter screen + route |
| New form field in an existing form | ✅ add Flutter field |
| New API endpoint call (even silent) | ✅ add Flutter API method + wire |
| New button / menu item / navigation entry | ✅ update drawer + more-menu |
| Visible copy change on shared UI | ✅ update Flutter strings |
| Layout-only refactor of an existing page | ⚠️ only if breaks visual match |
| Pure backend refactor (no API shape change) | ❌ no Flutter change |
| CSS-only styling tweak on desktop breakpoint | ❌ no Flutter change (mobile only mirrors mobile-web) |

## Allowed divergence

Mobile can diverge where native mobile affordances beat web conventions:

- Bottom-sheet instead of modal dialog
- Pull-to-refresh instead of a reload button
- Native share sheet instead of copy-link
- Haptic feedback on button press
- Swipe-to-dismiss on list items

These are acceptable — the goal is **semantic** parity (same features, same data flow), not pixel-perfect replication of web cards.

## Check before merging

Before you think a feature is done, verify on both sides:

1. Web (mobile-responsive viewport 375 × 812) shows feature X.
2. Flutter (`flutter run -d web-server`) shows feature X.
3. Same backend endpoints, same user permissions.
4. Same terminology and copy (use i18n keys, see `lib/i18n/`).
5. Both handle the same edge cases (empty state, loading, error).

If any of those 5 fail, the PR is incomplete.

## Source-of-truth precedence

- **Endpoints**: NestJS backend — both clients adapt.
- **Response shape**: backend service's DTO is canonical.
- **Feature flag logic**: `RoleFeatureConfig` is checked by both sides via `/api/role-config/:userType`.
- **Dynamic roles**: `ProviderRole` table — never hardcoded client-side.

## Forbidden

- ❌ Web-only feature that providers or patients would notice on mobile
- ❌ Hardcoded role names in Dart (see `feedback_no_doctor_specific_code.md`)
- ❌ Different API shapes between web and Flutter clients of the same endpoint
- ❌ Different translation keys for the same UI text on web vs mobile
- ❌ Divergent routes (`/prescriptions` on web but `/patient/prescriptions` on mobile)

## When parity is intentionally postponed

If you must ship a web-only change (e.g. admin super-tool that only makes sense on desktop), document it in the commit: `[web-only]` prefix + justify in the message. Then create a follow-up task in `mobile/BACKLOG.md` so it's not forgotten.
