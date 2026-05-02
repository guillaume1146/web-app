---
description: Flutter/Dart conventions for the mobile/ project
globs: "mobile/**/*.dart"
---

# Flutter Mobile App

The `mobile/` folder mirrors the Next.js web app feature-for-feature. **The web app is the source of truth** — when web behavior changes, mobile follows.

## Architecture

```
lib/
  main.dart           ← entry, ProviderScope, MaterialApp.router
  config.dart         ← API_BASE, SOCKET_URL constants (no hardcoded URLs elsewhere)
  api/                ← thin HTTP wrappers, one file per backend module
  services/           ← Riverpod StateNotifiers + singletons (auth, socket)
  models/             ← Freezed data classes — never raw Map<String, dynamic> in screen code
  router/             ← go_router + auth-aware redirects
  screens/            ← One file per screen, named *_screen.dart
  widgets/            ← Reusable building blocks
  theme/              ← Brand palette, ThemeData
```

## State Management

- **Riverpod** only. No Provider/InheritedWidget/GetX/Bloc mixed in.
- Async data: `FutureProvider` or `StreamProvider`.
- Mutable state: `StateNotifierProvider`.
- Never use `setState` for shared state — only for purely-local UI flags.

## API

- All HTTP via `ApiClient.instance` (Dio).
- Web: cookies handled by browser. Native: `dio_cookie_manager` persists.
- Always check `success` field before reading `data`.

## Dynamic Roles (mirrors web rule)

- **Never hardcode role names in Dart**. Roles loaded via `RolesApi.list()`.
- Sidebar / bottom-nav items that depend on role are derived from the API response.

## Web-first Dev (Windows-friendly)

- Develop with `flutter run -d chrome`. The whole flow (auth, chat, video) works in browser.
- Don't add native-only plugins unless web has a fallback (`kIsWeb` branch).

## Forbidden

- ❌ `print()` for logging — use `debugPrint()`
- ❌ Direct `http.get()` — always go through `ApiClient`
- ❌ Hardcoded `localhost:3001` in screens — use `AppConfig`
- ❌ Mixing Material + Cupertino widgets randomly
- ❌ Building native release without testing on real device first
