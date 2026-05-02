---
description: Scaffold a new Flutter screen mirroring a web page, wired to API + Riverpod
---

# Add a Flutter Screen

When the user asks for a new mobile screen that mirrors a web page (e.g., "add the Health Shop browser to mobile").

## Steps

1. **Find the web equivalent** — read `app/<path>/page.tsx` to know the API endpoint and field shape.
2. **Create model** if not present — `mobile/lib/models/<entity>.dart` with Freezed (`@freezed`).
3. **Create API method** — `mobile/lib/api/<feature>_api.dart` mirroring the endpoint.
4. **Create state notifier** — `mobile/lib/services/<feature>_service.dart` with `StateNotifierProvider` if state is shared, or use `FutureProvider` for read-only fetches.
5. **Create screen** — `mobile/lib/screens/<feature>_screen.dart`:
   - `ConsumerStatefulWidget` if it has local UI state
   - `ConsumerWidget` if pure read-only
   - Wrap with `Scaffold` + `MediWyzBottomNav` for top-level screens
6. **Add route** — append a `GoRoute` in `mobile/lib/router/app_router.dart`.
7. **Verify** by running `flutter run -d chrome` and clicking through.

## Conventions

- Imports order: dart core → flutter → packages → relative.
- One screen per file; widgets >150 lines extract into `widgets/`.
- All async errors handled — show `SnackBar` or inline error widget, never silent.
- `const` constructors wherever possible.

## DO NOT

- ❌ Inline a hardcoded role (`'doctor'`) — fetch from `RolesApi`.
- ❌ Use `setState` for data that other screens read.
- ❌ Use a different HTTP client — always `ApiClient.instance`.
- ❌ Hardcode strings users see — these will need translation later.
- ❌ Use `BuildContext` after async without checking `mounted`.
