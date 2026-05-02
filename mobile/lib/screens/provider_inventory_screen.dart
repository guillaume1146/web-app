import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../api/client.dart';
import '../theme/mediwyz_theme.dart';
import '../widgets/app_drawer.dart';

/// Provider inventory: CRUD items available in the Health Shop.
class ProviderInventoryScreen extends ConsumerStatefulWidget {
  const ProviderInventoryScreen({super.key});
  @override
  ConsumerState<ProviderInventoryScreen> createState() => _ProviderInventoryScreenState();
}

class _ProviderInventoryScreenState extends ConsumerState<ProviderInventoryScreen> {
  List<Map<String, dynamic>> _items = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final res = await ApiClient.instance.get('/inventory');
      final data = (res.data as Map?)?['data'] as List?;
      setState(() {
        _items = data?.map((e) => Map<String, dynamic>.from(e as Map)).toList() ?? [];
        _loading = false;
      });
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _openEditor({Map<String, dynamic>? existing}) async {
    final saved = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      builder: (_) => Padding(
        padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
        child: _InventoryEditor(existing: existing),
      ),
    );
    if (saved == true) _load();
  }

  Future<void> _delete(String id) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Delete item?'),
        content: const Text('This cannot be undone.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: Colors.red),
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Delete'),
          ),
        ],
      ),
    );
    if (ok != true) return;
    try {
      await ApiClient.instance.delete('/inventory/$id');
      await _load();
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    final lowStock = _items.where((i) => (i['quantity'] as num? ?? 0) <= (i['minStockAlert'] as num? ?? 5)).length;

    return Scaffold(
      drawer: const AppDrawer(),
      appBar: AppBar(title: const Text('Inventory', style: TextStyle(fontWeight: FontWeight.bold))),
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: MediWyzColors.teal,
        onPressed: () => _openEditor(),
        icon: const Icon(Icons.add, color: Colors.white),
        label: const Text('Add item', style: TextStyle(color: Colors.white)),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _load,
              child: ListView(
                padding: const EdgeInsets.all(12),
                children: [
                  if (lowStock > 0)
                    Container(
                      padding: const EdgeInsets.all(10),
                      margin: const EdgeInsets.only(bottom: 10),
                      decoration: BoxDecoration(color: Colors.orange.shade50, borderRadius: BorderRadius.circular(10), border: Border.all(color: Colors.orange.shade200)),
                      child: Row(children: [
                        Icon(Icons.warning_amber_rounded, color: Colors.orange.shade700),
                        const SizedBox(width: 8),
                        Text('$lowStock item(s) running low', style: TextStyle(color: Colors.orange.shade800, fontWeight: FontWeight.w600)),
                      ]),
                    ),
                  if (_items.isEmpty)
                    const Padding(
                      padding: EdgeInsets.all(40),
                      child: Center(child: Text('No items yet — tap Add item', style: TextStyle(color: Colors.black54))),
                    )
                  else
                    ..._items.map((it) {
                      final qty = (it['quantity'] as num? ?? 0).toInt();
                      final min = (it['minStockAlert'] as num? ?? 5).toInt();
                      final low = qty <= min;
                      return Card(
                        margin: const EdgeInsets.only(bottom: 8),
                        child: ListTile(
                          leading: CircleAvatar(
                            backgroundColor: low ? Colors.orange.shade50 : MediWyzColors.sky,
                            child: Icon(Icons.medication_outlined, color: low ? Colors.orange.shade700 : MediWyzColors.navy),
                          ),
                          title: Text(it['name']?.toString() ?? 'Item', style: const TextStyle(fontWeight: FontWeight.w600)),
                          subtitle: Text('${it['price']} MUR · stock $qty${it['requiresPrescription'] == true ? ' · Rx' : ''}'),
                          trailing: Wrap(
                            spacing: 4,
                            children: [
                              IconButton(icon: const Icon(Icons.edit_outlined, size: 20), onPressed: () => _openEditor(existing: it)),
                              IconButton(icon: const Icon(Icons.delete_outline, size: 20, color: Colors.red), onPressed: () => _delete(it['id']?.toString() ?? '')),
                            ],
                          ),
                        ),
                      );
                    }),
                ],
              ),
            ),
    );
  }
}

class _InventoryEditor extends StatefulWidget {
  final Map<String, dynamic>? existing;
  const _InventoryEditor({this.existing});
  @override
  State<_InventoryEditor> createState() => _InventoryEditorState();
}

class _InventoryEditorState extends State<_InventoryEditor> {
  late final TextEditingController _name;
  late final TextEditingController _price;
  late final TextEditingController _quantity;
  late final TextEditingController _category;
  bool _rx = false;
  bool _busy = false;

  @override
  void initState() {
    super.initState();
    final e = widget.existing;
    _name = TextEditingController(text: e?['name']?.toString() ?? '');
    _price = TextEditingController(text: (e?['price'] ?? '').toString());
    _quantity = TextEditingController(text: (e?['quantity'] ?? '10').toString());
    _category = TextEditingController(text: e?['category']?.toString() ?? 'medication');
    _rx = e?['requiresPrescription'] == true;
  }

  Future<void> _save() async {
    if (_name.text.trim().isEmpty || _price.text.trim().isEmpty) return;
    setState(() => _busy = true);
    try {
      final body = {
        'name': _name.text.trim(),
        'category': _category.text.trim(),
        'price': double.tryParse(_price.text) ?? 0,
        'quantity': int.tryParse(_quantity.text) ?? 0,
        'requiresPrescription': _rx,
      };
      if (widget.existing != null) {
        await ApiClient.instance.patch('/inventory/${widget.existing!['id']}', data: body);
      } else {
        await ApiClient.instance.post('/inventory', data: body);
      }
      if (mounted) Navigator.pop(context, true);
    } catch (_) {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(20),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(widget.existing == null ? 'Add item' : 'Edit item', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: MediWyzColors.navy)),
          const SizedBox(height: 14),
          TextField(controller: _name, decoration: const InputDecoration(labelText: 'Name', border: OutlineInputBorder())),
          const SizedBox(height: 10),
          TextField(controller: _category, decoration: const InputDecoration(labelText: 'Category (medication, equipment, eyewear…)', border: OutlineInputBorder())),
          const SizedBox(height: 10),
          Row(children: [
            Expanded(child: TextField(controller: _price, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Price (MUR)', border: OutlineInputBorder()))),
            const SizedBox(width: 10),
            Expanded(child: TextField(controller: _quantity, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Stock', border: OutlineInputBorder()))),
          ]),
          const SizedBox(height: 10),
          SwitchListTile(
            title: const Text('Requires prescription'),
            value: _rx,
            onChanged: (v) => setState(() => _rx = v),
            activeColor: MediWyzColors.teal,
            contentPadding: EdgeInsets.zero,
          ),
          const SizedBox(height: 10),
          ElevatedButton(
            onPressed: _busy ? null : _save,
            style: ElevatedButton.styleFrom(backgroundColor: MediWyzColors.teal),
            child: _busy
                ? const SizedBox(height: 18, width: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                : const Text('Save'),
          ),
        ],
      ),
    );
  }

  @override
  void dispose() {
    _name.dispose(); _price.dispose(); _quantity.dispose(); _category.dispose();
    super.dispose();
  }
}
