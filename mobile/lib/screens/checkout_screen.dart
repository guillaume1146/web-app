import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../api/client.dart';
import '../services/cart_service.dart';
import '../theme/mediwyz_theme.dart';

/// Cart review + place order. One backend order per provider group.
class CheckoutScreen extends ConsumerStatefulWidget {
  const CheckoutScreen({super.key});
  @override
  ConsumerState<CheckoutScreen> createState() => _CheckoutScreenState();
}

class _CheckoutScreenState extends ConsumerState<CheckoutScreen> {
  String _delivery = 'pickup'; // 'pickup' or 'delivery'
  final _address = TextEditingController();
  final _notes = TextEditingController();
  bool _placing = false;

  @override
  void dispose() {
    _address.dispose();
    _notes.dispose();
    super.dispose();
  }

  Future<void> _placeOrder() async {
    final cart = ref.read(cartProvider);
    if (cart.lines.isEmpty) return;
    if (_delivery == 'delivery' && _address.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter a delivery address'), backgroundColor: Colors.red),
      );
      return;
    }

    setState(() => _placing = true);
    final groups = cart.groupByProvider();
    int placed = 0;
    for (final entry in groups.entries) {
      try {
        await ApiClient.instance.post('/inventory/orders', data: {
          'providerUserId': entry.key,
          'items': entry.value.map((l) => {'itemId': l.itemId, 'quantity': l.quantity}).toList(),
          'deliveryMethod': _delivery,
          if (_delivery == 'delivery') 'deliveryAddress': _address.text.trim(),
          if (_notes.text.trim().isNotEmpty) 'notes': _notes.text.trim(),
        });
        placed++;
      } catch (_) {}
    }

    if (!mounted) return;
    setState(() => _placing = false);

    if (placed == 0) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Order failed — please try again'), backgroundColor: Colors.red),
      );
      return;
    }

    ref.read(cartProvider.notifier).clear();
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('$placed order${placed == 1 ? '' : 's'} placed'), backgroundColor: Colors.green),
    );
    context.go('/bookings');
  }

  @override
  Widget build(BuildContext context) {
    final cart = ref.watch(cartProvider);
    final groups = cart.groupByProvider();

    return Scaffold(
      appBar: AppBar(title: const Text('Checkout', style: TextStyle(fontWeight: FontWeight.bold))),
      body: cart.lines.isEmpty
          ? const Center(child: Text('Your cart is empty'))
          : ListView(
              padding: const EdgeInsets.all(12),
              children: [
                for (final entry in groups.entries) _ProviderGroupCard(providerUserId: entry.key, lines: entry.value),
                const SizedBox(height: 12),
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(14),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('Delivery method', style: TextStyle(fontWeight: FontWeight.w600, color: MediWyzColors.navy)),
                        const SizedBox(height: 8),
                        Row(children: [
                          Expanded(
                            child: RadioListTile<String>(
                              contentPadding: EdgeInsets.zero,
                              title: const Text('Pickup'),
                              value: 'pickup',
                              groupValue: _delivery,
                              onChanged: (v) => setState(() => _delivery = v!),
                            ),
                          ),
                          Expanded(
                            child: RadioListTile<String>(
                              contentPadding: EdgeInsets.zero,
                              title: const Text('Delivery'),
                              value: 'delivery',
                              groupValue: _delivery,
                              onChanged: (v) => setState(() => _delivery = v!),
                            ),
                          ),
                        ]),
                        if (_delivery == 'delivery') ...[
                          const SizedBox(height: 8),
                          TextField(
                            controller: _address,
                            decoration: const InputDecoration(labelText: 'Delivery address', border: OutlineInputBorder(), isDense: true),
                            maxLines: 2,
                          ),
                        ],
                        const SizedBox(height: 10),
                        TextField(
                          controller: _notes,
                          decoration: const InputDecoration(labelText: 'Notes (optional)', border: OutlineInputBorder(), isDense: true),
                          maxLines: 2,
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 12),
                Card(
                  color: MediWyzColors.sky.withValues(alpha: 0.35),
                  child: Padding(
                    padding: const EdgeInsets.all(14),
                    child: Row(
                      children: [
                        const Expanded(child: Text('Total', style: TextStyle(fontWeight: FontWeight.w600, color: MediWyzColors.navy, fontSize: 16))),
                        Text('MUR ${cart.total.toStringAsFixed(0)}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18, color: MediWyzColors.navy)),
                      ],
                    ),
                  ),
                ),
              ],
            ),
      bottomNavigationBar: cart.lines.isEmpty
          ? null
          : SafeArea(
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: ElevatedButton.icon(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: MediWyzColors.teal,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                  ),
                  onPressed: _placing ? null : _placeOrder,
                  icon: _placing
                      ? const SizedBox(height: 16, width: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                      : const Icon(Icons.shopping_bag_outlined, color: Colors.white),
                  label: Text(
                    _placing ? 'Placing…' : 'Place order (${cart.itemCount} items)',
                    style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
                  ),
                ),
              ),
            ),
    );
  }
}

class _ProviderGroupCard extends ConsumerWidget {
  final String providerUserId;
  final List<CartLine> lines;
  const _ProviderGroupCard({required this.providerUserId, required this.lines});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final subtotal = lines.fold(0.0, (s, l) => s + l.subtotal);
    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(children: [
              const Icon(Icons.store_outlined, size: 18, color: MediWyzColors.teal),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  lines.first.providerName,
                  style: const TextStyle(fontWeight: FontWeight.w600, color: MediWyzColors.navy),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ]),
            const Divider(height: 18),
            ...lines.map((l) => _LineTile(line: l, onDelta: (d) {
                  ref.read(cartProvider.notifier).setQuantity(l.itemId, l.quantity + d);
                }, onRemove: () => ref.read(cartProvider.notifier).remove(l.itemId))),
            const Divider(height: 18),
            Row(children: [
              const Spacer(),
              const Text('Subtotal: ', style: TextStyle(color: Colors.black54)),
              Text('MUR ${subtotal.toStringAsFixed(0)}',
                  style: const TextStyle(fontWeight: FontWeight.bold, color: MediWyzColors.teal)),
            ]),
          ],
        ),
      ),
    );
  }
}

class _LineTile extends StatelessWidget {
  final CartLine line;
  final void Function(int delta) onDelta;
  final VoidCallback onRemove;
  const _LineTile({required this.line, required this.onDelta, required this.onRemove});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(6),
            child: Container(
              width: 44, height: 44, color: MediWyzColors.sky,
              child: line.imageUrl != null
                  ? Image.network(line.imageUrl!, fit: BoxFit.cover,
                      errorBuilder: (_, __, ___) => const Icon(Icons.medical_services, color: MediWyzColors.navy))
                  : const Icon(Icons.medical_services, color: MediWyzColors.navy),
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(line.name, style: const TextStyle(fontWeight: FontWeight.w500), maxLines: 1, overflow: TextOverflow.ellipsis),
                Text('MUR ${line.price.toStringAsFixed(0)}', style: const TextStyle(color: Colors.black54, fontSize: 12)),
                if (line.requiresPrescription)
                  const Padding(
                    padding: EdgeInsets.only(top: 2),
                    child: Text('Prescription required', style: TextStyle(fontSize: 10, color: Colors.orange, fontWeight: FontWeight.w600)),
                  ),
              ],
            ),
          ),
          IconButton(icon: const Icon(Icons.remove_circle_outline, size: 20), onPressed: () => onDelta(-1)),
          Text('${line.quantity}', style: const TextStyle(fontWeight: FontWeight.bold)),
          IconButton(icon: const Icon(Icons.add_circle_outline, size: 20), onPressed: () => onDelta(1)),
          IconButton(icon: const Icon(Icons.delete_outline, size: 20, color: Colors.red), onPressed: onRemove),
        ],
      ),
    );
  }
}
