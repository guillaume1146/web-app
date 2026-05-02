import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../api/client.dart';
import '../services/auth_service.dart';
import '../theme/mediwyz_theme.dart';
import '../widgets/app_drawer.dart';

/// Insurance rep: enrolled clients + invite-by-email flow.
class InsurancePortfolioScreen extends ConsumerStatefulWidget {
  const InsurancePortfolioScreen({super.key});
  @override
  ConsumerState<InsurancePortfolioScreen> createState() => _InsurancePortfolioScreenState();
}

class _InsurancePortfolioScreenState extends ConsumerState<InsurancePortfolioScreen> {
  List<Map<String, dynamic>> _clients = [];
  List<Map<String, dynamic>> _plans = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final user = ref.read(authProvider).user;
    if (user == null) return;
    setState(() => _loading = true);
    try {
      final results = await Future.wait([
        ApiClient.instance.get('/insurance/${user['id']}/clients'),
        ApiClient.instance.get('/insurance/${user['id']}/plans'),
      ]);
      setState(() {
        final c = (results[0].data as Map?)?['data'] as List?;
        final p = (results[1].data as Map?)?['data'] as List?;
        _clients = c?.map((e) => Map<String, dynamic>.from(e as Map)).toList() ?? [];
        _plans = p?.map((e) => Map<String, dynamic>.from(e as Map)).toList() ?? [];
        _loading = false;
      });
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _invite() async {
    final user = ref.read(authProvider).user;
    if (user == null) return;
    final emailCtrl = TextEditingController();
    String? selectedPlan = _plans.isNotEmpty ? _plans.first['id']?.toString() : null;

    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setSB) => AlertDialog(
          title: const Text('Invite client'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: emailCtrl,
                decoration: const InputDecoration(labelText: 'Client email', border: OutlineInputBorder()),
                keyboardType: TextInputType.emailAddress,
              ),
              const SizedBox(height: 10),
              DropdownButtonFormField<String?>(
                initialValue: selectedPlan,
                decoration: const InputDecoration(labelText: 'Plan (optional)', border: OutlineInputBorder()),
                items: [
                  const DropdownMenuItem(value: null, child: Text('No plan')),
                  ..._plans.map((p) => DropdownMenuItem(
                    value: p['id']?.toString(),
                    child: Text(p['planName']?.toString() ?? p['name']?.toString() ?? 'Plan'),
                  )),
                ],
                onChanged: (v) => setSB(() => selectedPlan = v),
              ),
            ],
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
            FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Send')),
          ],
        ),
      ),
    );

    if (ok != true || emailCtrl.text.trim().isEmpty) return;
    try {
      await ApiClient.instance.post('/insurance/${user['id']}/clients', data: {
        'email': emailCtrl.text.trim(),
        if (selectedPlan != null) 'planId': selectedPlan,
      });
      await _load();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Client invited'), backgroundColor: Colors.green),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed: $e'), backgroundColor: Colors.red),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      drawer: const AppDrawer(),
      appBar: AppBar(
        title: const Text('Portfolio', style: TextStyle(fontWeight: FontWeight.bold)),
      ),
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: MediWyzColors.teal,
        onPressed: _invite,
        icon: const Icon(Icons.person_add, color: Colors.white),
        label: const Text('Invite', style: TextStyle(color: Colors.white)),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _load,
              child: ListView(
                padding: const EdgeInsets.all(12),
                children: [
                  Row(
                    children: [
                      Expanded(child: _StatTile(label: 'Clients', value: '${_clients.length}')),
                      const SizedBox(width: 10),
                      Expanded(child: _StatTile(label: 'Plans', value: '${_plans.length}')),
                    ],
                  ),
                  const SizedBox(height: 14),
                  const Padding(
                    padding: EdgeInsets.symmetric(horizontal: 4, vertical: 6),
                    child: Text('Clients', style: TextStyle(fontWeight: FontWeight.w600, color: MediWyzColors.navy, fontSize: 16)),
                  ),
                  if (_clients.isEmpty)
                    const Card(child: Padding(padding: EdgeInsets.all(20), child: Center(child: Text('No clients yet — tap Invite', style: TextStyle(color: Colors.black54)))))
                  else
                    ..._clients.map((c) {
                      final patient = c['patient'] is Map ? c['patient'] as Map : {};
                      final user = patient['user'] is Map ? patient['user'] as Map : {};
                      final name = '${user['firstName'] ?? ''} ${user['lastName'] ?? ''}'.trim();
                      return Card(
                        margin: const EdgeInsets.only(bottom: 6),
                        child: ListTile(
                          leading: const CircleAvatar(child: Icon(Icons.person_outline)),
                          title: Text(c['policyHolderName']?.toString() ?? (name.isEmpty ? 'Client' : name), style: const TextStyle(fontWeight: FontWeight.w600)),
                          subtitle: Text(user['email']?.toString() ?? (c['plan']?['planName']?.toString() ?? '')),
                          trailing: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                            decoration: BoxDecoration(color: Colors.green.shade50, borderRadius: BorderRadius.circular(10)),
                            child: Text('Active', style: TextStyle(color: Colors.green.shade700, fontSize: 10, fontWeight: FontWeight.w600)),
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

class _StatTile extends StatelessWidget {
  final String label; final String value;
  const _StatTile({required this.label, required this.value});
  @override
  Widget build(BuildContext context) => Card(
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(value, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 22, color: MediWyzColors.navy)),
              Text(label, style: const TextStyle(color: Colors.black54, fontSize: 12)),
            ],
          ),
        ),
      );
}
