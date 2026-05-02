import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// User-chosen locale for workflow labels, notifications, and AI prompts.
///
/// Default: `en`. Supported: `en`, `fr` (Mauritius / Madagascar / Togo / Benin /
/// Rwanda), `mfe` (Mauritian Creole). Persists via SharedPreferences so it
/// survives restart.
class LocaleState {
  final String code; // 'en' | 'fr' | 'mfe'
  const LocaleState(this.code);
}

class LocaleNotifier extends StateNotifier<LocaleState> {
  LocaleNotifier() : super(const LocaleState('en')) {
    _load();
  }

  static const _prefsKey = 'mediwyz_locale';

  Future<void> _load() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final stored = prefs.getString(_prefsKey);
      if (stored != null && stored.isNotEmpty) {
        state = LocaleState(stored);
      }
    } catch (e) {
      debugPrint('LocaleNotifier: failed to load ($e)');
    }
  }

  Future<void> set(String code) async {
    if (code == state.code) return;
    state = LocaleState(code);
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_prefsKey, code);
    } catch (e) {
      debugPrint('LocaleNotifier: failed to persist ($e)');
    }
  }
}

final localeProvider = StateNotifierProvider<LocaleNotifier, LocaleState>(
  (ref) => LocaleNotifier(),
);

/// Short display name for a given locale code.
String localeDisplayName(String code) {
  switch (code) {
    case 'fr': return 'Français';
    case 'mfe': return 'Kreol Morisien';
    case 'en':
    default: return 'English';
  }
}

/// Flag emoji for a given locale code.
String localeFlag(String code) {
  switch (code) {
    case 'fr': return '🇫🇷';
    case 'mfe': return '🇲🇺';
    case 'en':
    default: return '🇬🇧';
  }
}
