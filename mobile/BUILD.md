# MediWyz Mobile — Build instructions

## Prerequisites

| Platform | Required |
|---|---|
| Web (dev) | Flutter SDK + Chrome — no extra install |
| Android APK | Android SDK cmdline-tools + accepted licenses |
| Android .aab (Play Store) | Android SDK + upload keystore |
| iOS | macOS + Xcode (cannot build from Windows/Linux) |

## Web

```bash
flutter run -d web-server --web-port=8080 --web-hostname=127.0.0.1
# …or a static build:
flutter build web --release
```

Output: `build/web/` — serve with any static host.

## Android — debug APK

```bash
flutter build apk --debug
```

Output: `build/app/outputs/flutter-apk/app-debug.apk`

### One-time Android setup on Windows 10 (without Android Studio)

1. Download **cmdline-tools** only:
   https://developer.android.com/studio#command-line-tools-only
2. Extract to `C:\Android\cmdline-tools\latest\` (the `latest/` wrapper matters)
3. Set env:
   ```powershell
   setx ANDROID_HOME "C:\Android"
   setx PATH "%PATH%;C:\Android\cmdline-tools\latest\bin;C:\Android\platform-tools"
   ```
4. Install required packages:
   ```bash
   sdkmanager "platform-tools" "platforms;android-34" "build-tools;34.0.0"
   ```
5. Accept licenses:
   ```bash
   flutter doctor --android-licenses   # press 'y' a lot
   ```
6. Verify: `flutter doctor` — should show ✓ for Android toolchain.

## Android — release APK (signed)

1. Generate a signing key (one time):
   ```bash
   keytool -genkey -v -keystore ~/mediwyz-release.keystore -alias mediwyz -keyalg RSA -keysize 2048 -validity 10000
   ```
2. Place `key.properties` in `mobile/android/`:
   ```
   storePassword=<yours>
   keyPassword=<yours>
   keyAlias=mediwyz
   storeFile=/absolute/path/to/mediwyz-release.keystore
   ```
3. Edit `android/app/build.gradle.kts` — add the `signingConfigs { release { ... } }` block referencing `key.properties` (Flutter's template already includes the pattern).
4. Build:
   ```bash
   flutter build apk --release
   ```

## Android — Play Store bundle

```bash
flutter build appbundle --release
```

Output: `build/app/outputs/bundle/release/app-release.aab` — upload to Google Play Console.

## iOS (requires macOS)

On a Mac with Xcode:
```bash
flutter create . --platforms=ios --org=com.mediwyz
cd ios && pod install && cd ..
flutter build ios --release
# Then open ios/Runner.xcworkspace in Xcode → Archive → Distribute
```

## Pointing the build at a remote backend

All three forms accept `--dart-define`:

```bash
flutter build apk --release \
  --dart-define=API_BASE=https://api.mediwyz.com/api \
  --dart-define=SOCKET_URL=https://api.mediwyz.com
```

Without those, the app defaults to `http://127.0.0.1:3001` (dev localhost).

## Known platform limits

| Feature | Web | Android | iOS |
|---|---|---|---|
| Auth (JWT cookie) | ✅ | ✅ | ✅ |
| REST API | ✅ | ✅ | ✅ |
| Socket.IO | ✅ | ✅ | ✅ |
| WebRTC video | ✅ (via `flutter_webrtc` 0.12) | ✅ | ✅ |
| File picker (image/doc) | ✅ | ✅ | ✅ |
| Native camera | ❌ browser file picker only | ✅ via `image_picker` | ✅ via `image_picker` |
| Push notifications | ❌ (use Socket.IO instead) | 🚧 FCM not wired yet | 🚧 APNs not wired yet |
| Biometric unlock | ❌ | 🚧 not wired | 🚧 not wired |
| Background service | ❌ | 🚧 not wired | ❌ strictly limited |
