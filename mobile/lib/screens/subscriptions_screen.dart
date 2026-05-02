import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../api/client.dart';
import '../services/auth_service.dart';
import '../theme/mediwyz_theme.dart';

class SubscriptionsScreen extends ConsumerStatefulWidget {
  const SubscriptionsScreen({super.key});
  @override
  ConsumerState<SubscriptionsScreen> createState() => _SubscriptionsScreenState();
}

class _SubscriptionsScreenState extends ConsumerState<SubscriptionsScreen> {
  List<Map<String, dynamic>> _plans = [];
  Map<String, dynamic>? _currentSub;
  bool _loading = true;
  String? _busyPlanId;

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
        ApiClient.instance.get('/subscriptions'),
        ApiClient.instance.get('/users/${user['id']}/subscription'),
      ]);
      final plans = (results[0].data as Map?)?['data'] as List?;
      setState(() {
        _plans = plans?.map((e) => Map<String, dynamic>.from(e as Map)).toList() ?? [];
        final subData = (results[1].data as Map?)?['data'];
        _currentSub = subData is Map ? Map<String, dynamic>.from(subData) : null;
      });
    } catch (_) {}
    finally { if (mounted) setState(() => _loading = false); }
  }

  Future<void> _subscribe(String planId) async {
    final user = ref.read(authProvider).user;
    if (user == null) return;
    setState(() => _busyPlanId = planId);
    try {
      final res = await ApiClient.instance.post('/users/${user['id']}/subscription', data: {'planId': planId});
      if ((res.data as Map?)?['success'] == true) {
        await _load();
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Subscribed'), backgroundColor: Colors.green),
          );
        }
      }
    } catch (_) {}
    finally { if (mounted) setState(() => _busyPlanId = null); }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Plans', style: TextStyle(fontWeight: FontWeight.bold))),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _load,
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  if (_currentSub != null) ...[
                    Card(
                      color: MediWyzColors.teal,
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text('CURRENT PLAN', style: TextStyle(color: Colors.white70, fontSize: 11, letterSpacing: 0.5)),
                            const SizedBox(height: 4),
                            Text(
                              _currentSub!['plan']?['name']?.toString() ?? _currentSub!['planName']?.toString() ?? 'Active',
                              style: const TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold),
                            ),
                            Text(
                              'Ends ${_currentSub!['endDate']?.toString().split('T').first ?? '—'}',
                              style: const TextStyle(color: Colors.white70, fontSize: 12),
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),
                  ],
                  const Padding(
                    padding: EdgeInsets.symmetric(horizontal: 4, vertical: 8),
                    child: Text('Available plans', style: TextStyle(fontWeight: FontWeight.w600, color: MediWyzColors.navy)),
                  ),
                  if (_plans.isEmpty)
                    const Padding(padding: EdgeInsets.all(20), child: Center(child: Text('No plans available', style: TextStyle(color: Colors.black54))))
                  else
                    ..._plans.map((p) {
                      final price = (p['price'] ?? p['monthlyPrice'] ?? 0) as num;
                      final pid = p['id']?.toString() ?? '';
                      final isCurrent = _currentSub?['planId'] == pid || _currentSub?['plan']?['id'] == pid;
                      final busy = _busyPlanId == pid;
                      return Card(
                        margin: const EdgeInsets.only(bottom: 10),
                        child: Padding(
                          padding: const EdgeInsets.all(14),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  Expanded(
                                    child: Text(
                                      p['name']?.toString() ?? 'Plan',
                                      style: const TextStyle(fontWeight: FontWeight.bold, color: MediWyzColors.navy, fontSize: 16),
                                    ),
                                  ),
                                  Text('$price MUR/mo', style: const TextStyle(fontWeight: FontWeight.bold, color: MediWyzColors.teal)),
                                ],
                              ),
                              if (p['description'] != null) ...[
                                const SizedBox(height: 6),
                                Text(p['description'].toString(), style: const TextStyle(color: Colors.black54, fontSize: 13)),
                              ],
                              const SizedBox(height: 10),
                              isCurrent
                                  ? Container(
                                      alignment: Alignment.center,
                                      padding: const EdgeInsets.symmetric(vertical: 8),
                                      decoration: BoxDecoration(color: Colors.green.shade50, borderRadius: BorderRadius.circular(8)),
                                      child: const Text('Current plan', style: TextStyle(color: Colors.green, fontWeight: FontWeight.w600)),
                                    )
                                  : SizedBox(
                                      width: double.infinity,
                                      child: ElevatedButton(
                                        onPressed: busy ? null : () => _subscribe(pid),
                                        style: ElevatedButton.styleFrom(backgroundColor: MediWyzColors.teal),
                                        child: busy
                                            ? const SizedBox(height: 18, width: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                                            : const Text('Subscribe'),
                                      ),
                                    ),
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
