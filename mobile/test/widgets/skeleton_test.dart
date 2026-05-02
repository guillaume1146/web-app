import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mediwyz_mobile/widgets/skeleton.dart';

void main() {
  group('Skeleton widgets', () {
    testWidgets('Skeleton animates within a bounded container', (tester) async {
      await tester.pumpWidget(const MaterialApp(
        home: Scaffold(body: SizedBox(width: 200, height: 20, child: Skeleton())),
      ));
      expect(find.byType(Skeleton), findsOneWidget);
      // Let the animation advance
      await tester.pump(const Duration(milliseconds: 200));
      await tester.pump(const Duration(milliseconds: 500));
    });

    testWidgets('SkeletonList renders the requested number of cards', (tester) async {
      await tester.pumpWidget(const MaterialApp(home: Scaffold(body: SkeletonList(lineCount: 4))));
      await tester.pump();
      expect(find.byType(SkeletonCard), findsNWidgets(4));
    });

    testWidgets('EmptyState shows title + description + action', (tester) async {
      await tester.pumpWidget(MaterialApp(
        home: Scaffold(
          body: EmptyState(
            icon: Icons.inbox_outlined,
            title: 'No notifications',
            description: 'You are all caught up',
            action: FilledButton(onPressed: () {}, child: const Text('Refresh')),
          ),
        ),
      ));
      expect(find.text('No notifications'), findsOneWidget);
      expect(find.text('You are all caught up'), findsOneWidget);
      expect(find.text('Refresh'), findsOneWidget);
      expect(find.byIcon(Icons.inbox_outlined), findsOneWidget);
    });
  });
}
