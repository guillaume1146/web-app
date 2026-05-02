import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../api/client.dart';
import '../theme/mediwyz_theme.dart';
import '../widgets/app_drawer.dart';

/// Provider: list of services offered. Toggle active, edit custom price.
class ProviderServicesScreen extends ConsumerStatefulWidget {
  const ProviderServicesScreen({super.key});
  @override
  ConsumerState<ProviderServicesScreen> createState() => _ProviderServicesScreenState();
}

class _ProviderServicesScreenState extends ConsumerState<ProviderServicesScreen> {
  List<Map<String, dynamic>> _services = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final res = await ApiClient.instance.get('/services/my-services');
      final data = (res.data as Map?)?['data'] as List?;
      setState(() {
        _services = data?.map((e) => Map<String, dynamic>.from(e as Map)).toList() ?? [];
        _loading = false;
      });
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _toggleActive(Map<String, dynamic> s) async {
    final isActive = s['isActive'] == true;
    try {
      await ApiClient.instance.patch('/services/my-services/${s['id']}', data: {'isActive': !isActive});
      await _load();
    } catch (_) {}
  }

  Future<void> _editPrice(Map<String, dynamic> s) async {
    final controller = TextEditingController(text: (s['priceOverride'] ?? s['defaultPrice'] ?? 0).toString());
    final saved = await showDialog<double?>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Custom price'),
        content: TextField(
          controller: controller,
          keyboardType: const TextInputType.numberWithOptions(decimal: true),
          autofocus: true,
          decoration: const InputDecoration(labelText: 'Price (MUR)', border: OutlineInputBorder()),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
          FilledButton(
            onPressed: () => Navigator.pop(context, double.tryParse(controller.text)),
            child: const Text('Save'),
          ),
        ],
      ),
    );
    if (saved == null) return;
    try {
      await ApiClient.instance.patch('/services/my-services/${s['id']}', data: {'priceOverride': saved});
      await _load();
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      drawer: const AppDrawer(),
      appBar: AppBar(title: const Text('My services', style: TextStyle(fontWeight: FontWeight.bold))),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _services.isEmpty
              ? const Center(child: Text('No services configured yet', style: TextStyle(color: Colors.black54)))
              : RefreshIndicator(
                  onRefresh: _load,
                  child: ListView.separated(
                    padding: const EdgeInsets.all(12),
                    itemCount: _services.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 8),
                    itemBuilder: (_, i) {
                      final s = _services[i];
                      final name = s['serviceName']?.toString() ?? s['name']?.toString() ?? 'Service';
                      final mode = s['mode']?.toString() ?? 'in-person';
                      final price = (s['priceOverride'] ?? s['defaultPrice'] ?? 0) as num;
                      final isActive = s['isActive'] == true;

                      return Card(
                        child: ListTile(
                          leading: CircleAvatar(
                            backgroundColor: (isActive ? MediWyzColors.teal : Colors.grey).withValues(alpha: 0.15),
                            child: Icon(Icons.medical_services_outlined, color: isActive ? MediWyzColors.teal : Colors.grey),
                          ),
                          title: Text(name, style: const TextStyle(fontWeight: FontWeight.w600)),
                          subtitle: Row(
                            children: [
                              Text(mode, style: const TextStyle(fontSize: 12)),
                              const Text(' · '),
                              Text('$price MUR', style: const TextStyle(fontSize: 12, color: MediWyzColors.teal, fontWeight: FontWeight.w600)),
                              if (s['priceOverride'] != null) ...[
                                const SizedBox(width: 4),
                                const Icon(Icons.edit_outlined, size: 12, color: Colors.black45),
                              ],
                            ],
                          ),
                          trailing: Switch(
                            value: isActive,
                            activeThumbColor: MediWyzColors.teal,
                            onChanged: (_) => _toggleActive(s),
                          ),
                          onTap: () => _editPrice(s),
                        ),
                      );
                    },
                  ),
                ),
    );
  }
}
