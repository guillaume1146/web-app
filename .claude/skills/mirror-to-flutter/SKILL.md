---
description: Take a web frontend change (new page, component, or API call) and replicate the feature on the Flutter mobile app
---

# Mirror web change to Flutter

When you've just shipped a web change under `app/` or `components/` and need the Flutter app to match.

## When to use

- User says: "I added X on web, now add it on mobile"
- Parity reviewer agent flagged a gap
- You see you've been editing `app/**/page.tsx` and realise `mobile/lib/screens/` needs the same screen

## Process

### 1. Read the web change end-to-end

- Open the changed file(s). Understand: what endpoint(s) does it call? what's the response shape? what form fields? what empty state?
- Identify the smallest coherent unit — a single page usually.

### 2. Identify the mobile route

- `app/patient/(dashboard)/health/page.tsx` → mobile `/health` or `/health-tracker`
- `app/corporate/(dashboard)/employees/page.tsx` → mobile `/my-company` (if corporate) or `/admin/accounts` (if admin)
- `app/provider/[slug]/(dashboard)/inventory/page.tsx` → mobile `/provider/inventory`
- **Never** reproduce the role-prefixed URL on mobile — mobile uses role-agnostic routes because dynamic-roles principle.

### 3. Create the Flutter screen

```
mobile/lib/screens/<feature>_screen.dart
```

Template: `ConsumerStatefulWidget` + `AppDrawer` + pull-to-refresh + loading + empty state + error banner. Reuse widgets from `mobile/lib/widgets/` — don't recreate `AppDrawer`, `MediWyzBottomNav`, etc.

### 4. Wire the API

Prefer adding a typed method to `mobile/lib/api/<feature>_api.dart` rather than inline `ApiClient.instance.get()`. Keeps swappable.

### 5. Route + navigation

- Add `GoRoute` in `mobile/lib/router/app_router.dart`
- Add entry in `mobile/lib/widgets/app_drawer.dart` under the right section
- Add entry in `mobile/lib/screens/more_menu_screen.dart` under the right section
- If it's a top-5 destination, swap it into `mobile/lib/widgets/bottom_nav.dart`

### 6. i18n

- Add copy as `t('key')` calls — not inline strings.
- Add keys to all 3 translation maps: `lib/i18n/translations/{en,fr,kr}.ts`.

### 7. Verify

- `cd mobile && flutter analyze` → 0 errors
- `flutter build web --debug` → succeeds
- Open `flutter run -d web-server --web-port=8080` and click the new route

## Conventions (mandatory)

- `AppDrawer` on every top-level screen
- `MediWyzBottomNav` only on screens reachable from bottom tabs (Feed/Chat/Search/Billing/More)
- Pull-to-refresh on every list screen
- Skeleton or `CircularProgressIndicator` while loading — never a blank screen
- Empty state: icon + "No X yet" + CTA if applicable
- Errors surface as `SnackBar` or inline banner — never silent

## DO NOT

- ❌ Hardcode role names (see `feedback_no_doctor_specific_code.md`)
- ❌ Hex colours inline — use `MediWyzColors` tokens
- ❌ `print()` — use `debugPrint()`
- ❌ New HTTP client — always `ApiClient.instance`
- ❌ Inline English text — use `t('key')`
- ❌ Leave `TODO` or stub empty handlers — implement or delete
