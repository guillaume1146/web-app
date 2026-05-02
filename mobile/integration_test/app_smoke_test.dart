import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:mediwyz_mobile/main.dart' as app;

/// End-to-end smoke test — boots the real app and verifies the unauthenticated
/// flow reaches the login screen. Run with:
///   flutter test integration_test/app_smoke_test.dart -d chrome
void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  testWidgets('app boots and lands on login when unauthenticated', (tester) async {
    app.main();
    await tester.pumpAndSettle(const Duration(seconds: 2));

    // Login screen should render — look for our branded copy.
    expect(find.byType(MaterialApp), findsOneWidget);

    // There's either a "Welcome back" / "Sign in" header or an email field.
    // Either proves we at least rendered a screen without crashing.
    final loginLikely = find.textContaining(RegExp('Sign in|Welcome|Log in|Email', caseSensitive: false));
    expect(loginLikely.evaluate().isNotEmpty, isTrue,
        reason: 'Expected login-like UI to render after boot');
  });

  testWidgets('ProviderScope is wired so Riverpod providers resolve', (tester) async {
    app.main();
    await tester.pumpAndSettle(const Duration(seconds: 2));
    expect(find.byType(ProviderScope), findsOneWidget);
  });
}
