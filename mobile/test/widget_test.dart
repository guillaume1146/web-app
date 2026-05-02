import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('Framework smoke test', (WidgetTester tester) async {
    // Verify the test framework works. Full app init (Riverpod + go_router)
    // is tested via integration tests; this just keeps the default generated
    // file from being recreated by `flutter create` with a wrong class name.
    await tester.pumpWidget(const MaterialApp(
      home: Scaffold(body: Center(child: Text('MediWyz'))),
    ));
    expect(find.text('MediWyz'), findsOneWidget);
  });
}
