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

The `ios/` folder is git-ignored (Flutter regenerates it). On a Mac with Xcode:
```bash
# 1. Generate the Xcode project
flutter create --platforms=ios --org=com.mediwyz --project-name=mediwyz_mobile .

# 2. Apply the custom Info.plist (camera/mic permissions + bundle ID com.mediwyz.mobile)
#    Copy mobile/ios/Runner/Info.plist.template → ios/Runner/Info.plist
#    (or the CI workflow applies it automatically)

# 3. Install CocoaPods dependencies
cd ios && pod install && cd ..

# 4. Build for testing (no signing)
flutter build ios --release --no-codesign \
  --dart-define=API_BASE=https://mediwyz.com/api \
  --dart-define=SOCKET_URL=https://mediwyz.com

# 5. For App Store: open ios/Runner.xcworkspace in Xcode → Product → Archive → Distribute
```

**Bundle ID**: `com.mediwyz.mobile`  
**Minimum iOS**: 13.0  
**CI**: The GitHub Actions `mobile.yml` workflow builds iOS automatically on every push to `main` (macOS runner, no-codesign).

## Pointing the build at a remote backend

Pass `--dart-define` at build time:

```bash
# Android
flutter build apk --release \
  --dart-define=API_BASE=https://mediwyz.com/api \
  --dart-define=SOCKET_URL=https://mediwyz.com

# iOS
flutter build ios --release --no-codesign \
  --dart-define=API_BASE=https://mediwyz.com/api \
  --dart-define=SOCKET_URL=https://mediwyz.com

# Web
flutter build web --release \
  --dart-define=API_BASE=https://mediwyz.com/api \
  --dart-define=SOCKET_URL=https://mediwyz.com
```

In release mode without `--dart-define`, `config.dart` automatically defaults to `https://mediwyz.com`.

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
