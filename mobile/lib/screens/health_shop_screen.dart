import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../api/client.dart';
import '../services/cart_service.dart';
import '../theme/mediwyz_theme.dart';

/// Health Shop — browse items from ALL providers' inventory (not just pharmacists).
/// Mirrors app/search/health-shop/page.tsx. Tap "Add" to push to cart; cart
/// badge in the app-bar opens the checkout screen.
class HealthShopScreen extends ConsumerStatefulWidget {
  const HealthShopScreen({super.key});
  @override
  ConsumerState<HealthShopScreen> createState() => _HealthShopScreenState();
}

class _HealthShopScreenState extends ConsumerState<HealthShopScreen> {
  List<Map<String, dynamic>> _items = [];
  bool _loading = true;
  String _query = '';

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final res = await ApiClient.instance.get(
        '/search/health-shop',
        queryParameters: {'q': _query, 'limit': 50},
      );
      final data = (res.data as Map?)?['data'] as List?;
      setState(() {
        _items = data?.map((e) => Map<String, dynamic>.from(e as Map)).toList() ?? [];
        _loading = false;
      });
    } catch (_) {
      setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final cartCount = ref.watch(cartProvider).itemCount;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Health Shop', style: TextStyle(fontWeight: FontWeight.bold)),
        actions: [
          Stack(
            clipBehavior: Clip.none,
            children: [
              IconButton(
                icon: const Icon(Icons.shopping_cart_outlined),
                onPressed: () => context.push('/checkout'),
              ),
              if (cartCount > 0)
                Positioned(
                  right: 6,
                  top: 6,
                  child: Container(
                    padding: const EdgeInsets.all(3),
                    decoration: const BoxDecoration(color: Colors.red, shape: BoxShape.circle),
                    constraints: const BoxConstraints(minWidth: 16, minHeight: 16),
                    child: Text('$cartCount',
                        textAlign: TextAlign.center,
                        style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold)),
                  ),
                ),
            ],
          ),
          const SizedBox(width: 6),
        ],
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(12),
            child: TextField(
              decoration: InputDecoration(
                hintText: 'Search medicines, glasses, supplies…',
                prefixIcon: const Icon(Icons.search),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
              ),
              onSubmitted: (v) {
                _query = v;
                _load();
              },
            ),
          ),
          if (_loading) const LinearProgressIndicator(),
          Expanded(
            child: _items.isEmpty && !_loading
                ? const Center(child: Text('No items found'))
                : GridView.builder(
                    padding: const EdgeInsets.all(12),
                    gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                      crossAxisCount: 2,
                      childAspectRatio: 0.68,
                      crossAxisSpacing: 10,
                      mainAxisSpacing: 10,
                    ),
                    itemCount: _items.length,
                    itemBuilder: (_, i) => _ItemCard(item: _items[i]),
                  ),
          ),
        ],
      ),
      floatingActionButton: cartCount == 0
          ? null
          : FloatingActionButton.extended(
              backgroundColor: MediWyzColors.teal,
              icon: const Icon(Icons.shopping_bag_outlined, color: Colors.white),
              label: Text('Checkout ($cartCount)', style: const TextStyle(color: Colors.white)),
              onPressed: () => context.push('/checkout'),
            ),
    );
  }
}

class _ItemCard extends ConsumerWidget {
  final Map<String, dynamic> item;
  const _ItemCard({required this.item});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final price = (item['price'] as num?)?.toDouble() ?? 0;
    final requiresRx = item['requiresPrescription'] == true;
    final providerUserId = item['providerUserId']?.toString() ?? item['providerId']?.toString() ?? '';
    final stock = (item['stock'] as num?)?.toInt() ?? 0;

    return Card(
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Expanded(
            child: Container(
              color: MediWyzColors.sky,
              child: item['imageUrl'] != null
                  ? Image.network(item['imageUrl'].toString(), fit: BoxFit.cover,
                      errorBuilder: (_, __, ___) => const Icon(Icons.medical_services, size: 48, color: MediWyzColors.navy))
                  : const Icon(Icons.medical_services, size: 48, color: MediWyzColors.navy),
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(10),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  item['name']?.toString() ?? '',
                  style: const TextStyle(fontWeight: FontWeight.w600, color: MediWyzColors.navy),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 2),
                Text(
                  item['providerName']?.toString() ?? '',
                  style: const TextStyle(color: Colors.black54, fontSize: 11),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 6),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text('MUR ${price.toStringAsFixed(0)}',
                        style: const TextStyle(fontWeight: FontWeight.bold, color: MediWyzColors.teal)),
                    if (requiresRx)
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: Colors.orange.withValues(alpha: 0.15),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: const Text('Rx',
                            style: TextStyle(fontSize: 10, color: Colors.orange, fontWeight: FontWeight.bold)),
                      ),
                  ],
                ),
                const SizedBox(height: 6),
                SizedBox(
                  width: double.infinity,
                  height: 30,
                  child: OutlinedButton.icon(
                    style: OutlinedButton.styleFrom(
                      foregroundColor: MediWyzColors.teal,
                      side: const BorderSide(color: MediWyzColors.teal),
                      padding: const EdgeInsets.symmetric(horizontal: 8),
                    ),
                    icon: const Icon(Icons.add_shopping_cart, size: 14),
                    label: const Text('Add', style: TextStyle(fontSize: 12)),
                    onPressed: providerUserId.isEmpty || stock == 0
                        ? null
                        : () {
                            ref.read(cartProvider.notifier).add(CartLine(
                                  itemId: item['id']?.toString() ?? '',
                                  providerUserId: providerUserId,
                                  providerName: item['providerName']?.toString() ?? '',
                                  name: item['name']?.toString() ?? '',
                                  price: price,
                                  quantity: 1,
                                  imageUrl: item['imageUrl']?.toString(),
                                  requiresPrescription: requiresRx,
                                ));
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(
                                content: Text('${item['name']} added to cart'),
                                duration: const Duration(seconds: 1),
                                backgroundColor: MediWyzColors.teal,
                              ),
                            );
                          },
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
