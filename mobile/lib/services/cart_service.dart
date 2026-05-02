import 'package:flutter_riverpod/flutter_riverpod.dart';

/// One line in the Health Shop cart. Grouped by `providerUserId` at checkout —
/// the backend takes one provider per order.
class CartLine {
  final String itemId;
  final String providerUserId;
  final String providerName;
  final String name;
  final double price;
  final String? imageUrl;
  final bool requiresPrescription;
  final int quantity;

  CartLine({
    required this.itemId,
    required this.providerUserId,
    required this.providerName,
    required this.name,
    required this.price,
    required this.quantity,
    this.imageUrl,
    this.requiresPrescription = false,
  });

  CartLine copyWith({int? quantity}) => CartLine(
        itemId: itemId,
        providerUserId: providerUserId,
        providerName: providerName,
        name: name,
        price: price,
        quantity: quantity ?? this.quantity,
        imageUrl: imageUrl,
        requiresPrescription: requiresPrescription,
      );

  double get subtotal => price * quantity;
}

class CartState {
  final List<CartLine> lines;
  const CartState(this.lines);
  const CartState.empty() : lines = const [];

  int get itemCount => lines.fold(0, (s, l) => s + l.quantity);
  double get total => lines.fold(0.0, (s, l) => s + l.subtotal);

  Map<String, List<CartLine>> groupByProvider() {
    final map = <String, List<CartLine>>{};
    for (final l in lines) {
      map.putIfAbsent(l.providerUserId, () => []).add(l);
    }
    return map;
  }
}

class CartNotifier extends StateNotifier<CartState> {
  CartNotifier() : super(const CartState.empty());

  void add(CartLine line) {
    final existing = state.lines.indexWhere((l) => l.itemId == line.itemId);
    if (existing >= 0) {
      final next = [...state.lines];
      next[existing] = next[existing].copyWith(quantity: next[existing].quantity + line.quantity);
      state = CartState(next);
    } else {
      state = CartState([...state.lines, line]);
    }
  }

  void setQuantity(String itemId, int quantity) {
    if (quantity <= 0) return remove(itemId);
    final next = state.lines.map((l) => l.itemId == itemId ? l.copyWith(quantity: quantity) : l).toList();
    state = CartState(next);
  }

  void remove(String itemId) {
    state = CartState(state.lines.where((l) => l.itemId != itemId).toList());
  }

  void clear() => state = const CartState.empty();
}

final cartProvider = StateNotifierProvider<CartNotifier, CartState>((ref) => CartNotifier());
