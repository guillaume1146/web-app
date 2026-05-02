import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mediwyz_mobile/services/cart_service.dart';

void main() {
  group('CartService', () {
    late ProviderContainer container;

    setUp(() {
      container = ProviderContainer();
    });

    tearDown(() {
      container.dispose();
    });

    CartLine _line(String id, {String provider = 'P1', double price = 10, int qty = 1}) => CartLine(
          itemId: id,
          providerUserId: provider,
          providerName: 'Provider $provider',
          name: 'Item $id',
          price: price,
          quantity: qty,
        );

    test('starts empty', () {
      final state = container.read(cartProvider);
      expect(state.lines, isEmpty);
      expect(state.itemCount, 0);
      expect(state.total, 0);
    });

    test('adding a new line appends', () {
      container.read(cartProvider.notifier).add(_line('A'));
      final state = container.read(cartProvider);
      expect(state.lines.length, 1);
      expect(state.itemCount, 1);
      expect(state.total, 10);
    });

    test('adding same itemId twice increments quantity (no duplicate lines)', () {
      final notifier = container.read(cartProvider.notifier);
      notifier.add(_line('A', qty: 2));
      notifier.add(_line('A', qty: 3));
      final state = container.read(cartProvider);
      expect(state.lines.length, 1);
      expect(state.lines.first.quantity, 5);
      expect(state.total, 50);
    });

    test('setQuantity with 0 removes the line', () {
      final notifier = container.read(cartProvider.notifier);
      notifier.add(_line('A', qty: 2));
      notifier.setQuantity('A', 0);
      expect(container.read(cartProvider).lines, isEmpty);
    });

    test('remove deletes a specific line', () {
      final notifier = container.read(cartProvider.notifier);
      notifier.add(_line('A'));
      notifier.add(_line('B'));
      notifier.remove('A');
      final state = container.read(cartProvider);
      expect(state.lines.length, 1);
      expect(state.lines.first.itemId, 'B');
    });

    test('clear empties the cart', () {
      final notifier = container.read(cartProvider.notifier);
      notifier.add(_line('A'));
      notifier.add(_line('B', provider: 'P2'));
      notifier.clear();
      expect(container.read(cartProvider).lines, isEmpty);
    });

    test('groupByProvider buckets lines by providerUserId', () {
      final notifier = container.read(cartProvider.notifier);
      notifier.add(_line('A', provider: 'P1'));
      notifier.add(_line('B', provider: 'P1'));
      notifier.add(_line('C', provider: 'P2'));
      final groups = container.read(cartProvider).groupByProvider();
      expect(groups.keys.toSet(), {'P1', 'P2'});
      expect(groups['P1']!.length, 2);
      expect(groups['P2']!.length, 1);
    });

    test('total sums price * quantity across lines', () {
      final notifier = container.read(cartProvider.notifier);
      notifier.add(_line('A', price: 10, qty: 2)); // 20
      notifier.add(_line('B', price: 15, qty: 3)); // 45
      expect(container.read(cartProvider).total, 65);
      expect(container.read(cartProvider).itemCount, 5);
    });
  });
}
