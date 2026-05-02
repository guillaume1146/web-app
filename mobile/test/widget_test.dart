import 'package:flutter_test/flutter_test.dart';
import 'package:mediwyz_mobile/main.dart';

void main() {
  testWidgets('App smoke test', (WidgetTester tester) async {
    await tester.pumpWidget(const MediWyzApp());
    expect(find.byType(MediWyzApp), findsOneWidget);
  });
}
