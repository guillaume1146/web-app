import 'dart:io' show Platform;
import 'package:flutter/foundation.dart' show kIsWeb;

/// MediWyz mobile config.
///
/// Three ways to pick the backend URL (precedence top→bottom):
///
/// 1. `--dart-define=API_BASE=https://api.mediwyz.com/api` at build time (wins everywhere).
/// 2. Auto-detect by host:
///    - Flutter Web in Chrome → `http://127.0.0.1:3001`
///    - Android emulator      → `http://10.0.2.2:3001` (emulator's alias for dev machine)
///    - Real Android device   → falls back to `127.0.0.1` which won't work → override at build time
///    - iOS simulator         → `http://127.0.0.1:3001`
/// 3. Fallback: `http://127.0.0.1:3001`.
class AppConfig {
  // Compile-time overrides — always win when provided.
  static const String _envApi = String.fromEnvironment('API_BASE');
  static const String _envSocket = String.fromEnvironment('SOCKET_URL');

  /// REST base URL — backend NestJS controllers.
  static String get apiBase {
    if (_envApi.isNotEmpty) return _envApi;
    return '${_host()}/api';
  }

  /// Socket.IO URL (chat, notifications, WebRTC signaling).
  static String get socketUrl {
    if (_envSocket.isNotEmpty) return _envSocket;
    return _host();
  }

  /// App display name.
  static const String appName = 'MediWyz';

  static String _host() {
    if (kIsWeb) return 'http://127.0.0.1:3001';
    try {
      if (Platform.isAndroid) return 'http://10.0.2.2:3001';
      if (Platform.isIOS) return 'http://127.0.0.1:3001';
    } catch (_) { /* non-IO env (tests) */ }
    return 'http://127.0.0.1:3001';
  }
}
