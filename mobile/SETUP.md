# MediWyz Mobile (Flutter)

Cross-platform mobile + web client that mirrors the Next.js frontend.
Designed for **Flutter Web testing on Windows 10 without Android Studio**.

---

## Prerequisites (low-resource Windows 10 friendly)

1. **Flutter SDK** — extract to `C:\src\flutter` and add `C:\src\flutter\bin` to PATH
   ```powershell
   git clone https://github.com/flutter/flutter.git -b stable C:\src\flutter
   setx PATH "%PATH%;C:\src\flutter\bin"
   ```
2. **Chrome** (you already have it) — the dev target
3. **VS Code** + Flutter & Dart extensions (lighter than Android Studio)

Verify:
```powershell
flutter doctor
```
You will see ❌ for "Android toolchain" — **ignore it** if you only target web during dev.

---

## First-time setup of this project

The `lib/`, `pubspec.yaml`, and `web/` files are committed. Generate platform folders:

```powershell
cd mobile
flutter create . --platforms=web,android --org=com.mediwyz --project-name=mediwyz_mobile
flutter pub get
```

`flutter create .` in an existing folder ADDS missing platform folders without
overwriting `lib/`, `pubspec.yaml`, or `web/index.html`.

---

## Running

Backend must be up:
```powershell
cd backend && npm run start:dev      # port 3001
cd ..    && npm run dev               # Next.js port 3000 (proxy)
```

Then in another terminal:
```powershell
cd mobile
flutter run -d chrome
```

The Flutter Web app opens in Chrome and hits the same NestJS backend at
`http://localhost:3001/api/*` and Socket.IO at `ws://localhost:3001`.

---

## Configuration

Edit `lib/config.dart` to point at a different API host (production, staging, etc.).

---

## What works in Flutter Web

| Feature | Web | Why |
|---|---|---|
| Login + JWT cookie | ✅ | Browser handles cookies |
| Feed, posts, profiles | ✅ | Pure HTTP |
| Chat (Socket.IO) | ✅ | socket_io_client supports Web |
| Notifications | ✅ | Same Socket.IO transport |
| **Video calls (WebRTC)** | ✅ | flutter_webrtc uses browser WebRTC API |
| Booking + payment | ✅ | Pure HTTP |
| Health Shop ordering | ✅ | Pure HTTP |
| Camera/file upload | ✅ | Browser file picker |

What **needs a phone or emulator**:
- Push notifications (FCM)
- Native camera scanning (food scan, QR)
- Background sync

For everything else, Chrome is your test device.

---

## Architecture (mirrors the web app)

```
mobile/lib/
  main.dart                    → entry point + Riverpod root
  config.dart                  → API_BASE, SOCKET_URL constants
  api/
    client.dart                → Dio with cookie jar + interceptors
    auth_api.dart              → /auth/login, /auth/me
    bookings_api.dart          → /bookings, /workflow/transition
    chat_api.dart              → /conversations
  services/
    socket_service.dart        → Singleton Socket.IO connection
    auth_service.dart          → Riverpod provider for current user
  models/
    user.dart, role.dart, booking.dart, conversation.dart, …
  router/
    app_router.dart            → go_router with role-aware redirects
  screens/
    login/login_screen.dart
    feed/feed_screen.dart
    chat/chat_list_screen.dart
    chat/chat_room_screen.dart
    video/video_call_screen.dart
    profile/profile_screen.dart
  widgets/
    bottom_nav.dart            → Mobile equivalent of DashboardSidebar
    role_aware_sidebar.dart    → Loads /api/roles dynamically (no hardcoded roles)
  theme/
    mediwyz_theme.dart         → Brand palette: #001E40, #0C6780, #9AE1FF
```

No hardcoded provider role names — roles loaded from `/api/roles` at runtime,
matching the web app's dynamic-roles principle.
