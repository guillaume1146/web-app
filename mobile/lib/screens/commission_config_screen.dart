import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../api/client.dart';
import '../theme/mediwyz_theme.dart';
import '../widgets/app_drawer.dart';

class CommissionConfigScreen extends ConsumerStatefulWidget {
  const CommissionConfigScreen({super.key});
  @override
  ConsumerState<CommissionConfigScreen> createState() => _CommissionConfigScreenState();
}

class _CommissionConfigScreenState extends ConsumerState<CommissionConfigScreen> {
  final _platform = TextEditingController();
  final _provider = TextEditingController();
  bool _loading = true;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final res = await ApiClient.instance.get('/admin/commission-config');
      final data = (res.data as Map?)?['data'] as Map?;
      if (data != null) {
        _platform.text = (data['platformCommissionRate'] ?? 15).toString();
        _provider.text = (data['providerRate'] ?? 85).toString();
      }
    } catch (_) {}
    if (mounted) setState(() => _loading = false);
  }

  Future<void> _save() async {
    final p = double.tryParse(_platform.text) ?? 15;
    final pr = double.tryParse(_provider.text) ?? 85;
    if ((p + pr - 100).abs() > 0.01) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Platform + provider must equal 100'), backgroundColor: Colors.red),
      );
      return;
    }
    setState(() => _saving = true);
    try {
      await ApiClient.instance.put('/admin/commission-config', data: {
        'platformCommissionRate': p,
        'providerRate': pr,
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Commission updated'), backgroundColor: Colors.green),
        );
      }
    } catch (_) {}
    if (mounted) setState(() => _saving = false);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      drawer: const AppDrawer(),
      appBar: AppBar(title: const Text('Commission config', style: TextStyle(fontWeight: FontWeight.bold))),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(14),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('Revenue split', style: TextStyle(fontWeight: FontWeight.w600, color: MediWyzColors.navy, fontSize: 16)),
                          const SizedBox(height: 4),
                          const Text('Percentages must total 100.', style: TextStyle(color: Colors.black54, fontSize: 12)),
                          const SizedBox(height: 14),
                          TextField(
                            controller: _platform,
                            keyboardType: const TextInputType.numberWithOptions(decimal: true),
                            decoration: const InputDecoration(labelText: 'Platform % (MediWyz)', border: OutlineInputBorder(), suffixText: '%'),
                          ),
                          const SizedBox(height: 10),
                          TextField(
                            controller: _provider,
                            keyboardType: const TextInputType.numberWithOptions(decimal: true),
                            decoration: const InputDecoration(labelText: 'Provider %', border: OutlineInputBorder(), suffixText: '%'),
                          ),
                          const SizedBox(height: 14),
                          ElevatedButton(
                            onPressed: _saving ? null : _save,
                            style: ElevatedButton.styleFrom(backgroundColor: MediWyzColors.teal),
                            child: _saving
                                ? const SizedBox(height: 18, width: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                                : const Text('Save'),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
    );
  }

  @override
  void dispose() {
    _platform.dispose();
    _provider.dispose();
    super.dispose();
  }
}
