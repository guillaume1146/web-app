import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mediwyz_mobile/screens/checkout_screen.dart';
import 'package:mediwyz_mobile/services/cart_service.dart';

void main() {
  group('CheckoutScreen', () {
    testWidgets('empty cart shows empty state', (tester) async {
      await tester.pumpWidget(const ProviderScope(
        child: MaterialApp(home: CheckoutScreen()),
      ));
      expect(find.text('Your cart is empty'), findsOneWidget);
      // No place-order button visible
      expect(find.textContaining('Place order'), findsNothing);
    });

    testWidgets('cart with items shows totals + place-order button', (tester) async {
      final container = ProviderContainer();
      container.read(cartProvider.notifier).add(CartLine(
            itemId: 'A',
            providerUserId: 'P1',
            providerName: 'MediCare',
            name: 'Vitamin C',
            price: 150,
            quantity: 2,
          ));

      await tester.pumpWidget(UncontrolledProviderScope(
        container: container,
        child: const MaterialApp(home: CheckoutScreen()),
      ));

      expect(find.text('MediCare'), findsOneWidget);
      expect(find.text('Vitamin C'), findsOneWidget);
      // "MUR 300" appears twice: as per-provider subtotal and as grand total.
      expect(find.text('MUR 300'), findsNWidgets(2));
      expect(find.textContaining('Place order'), findsOneWidget);
    });

    testWidgets('delivery radio shows address field', (tester) async {
      final container = ProviderContainer();
      container.read(cartProvider.notifier).add(CartLine(
            itemId: 'A', providerUserId: 'P1', providerName: 'X',
            name: 'Y', price: 100, quantity: 1,
          ));

      await tester.pumpWidget(UncontrolledProviderScope(
        container: container,
        child: const MaterialApp(home: CheckoutScreen()),
      ));

      expect(find.text('Delivery address'), findsNothing);
      await tester.tap(find.text('Delivery'));
      await tester.pump();
      expect(find.text('Delivery address'), findsOneWidget);
    });
  });
}
