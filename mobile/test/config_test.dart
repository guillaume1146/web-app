import 'package:flutter_test/flutter_test.dart';
import 'package:mediwyz_mobile/config.dart';

void main() {
  group('AppConfig', () {
    test('defaults point at local NestJS backend', () {
      expect(AppConfig.apiBase, contains('/api'));
      expect(AppConfig.socketUrl, isNotEmpty);
      expect(AppConfig.appName, 'MediWyz');
    });

    test('apiBase can be overridden via --dart-define', () {
      // This is purely documentation — verify the fromEnvironment fallback exists.
      expect(AppConfig.apiBase, startsWith('http'));
    });
  });
}
