import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../api/client.dart';
import '../services/auth_service.dart';

/// Fast-lane emergency — lists available emergency workers and lets the user
/// request dispatch with one tap. Uses the generic /search/providers endpoint
/// with type=EMERGENCY_WORKER (dynamic-roles compliant).
class EmergencyScreen extends ConsumerStatefulWidget {
  const EmergencyScreen({super.key});
  @override
  ConsumerState<EmergencyScreen> createState() => _EmergencyScreenState();
}

class _EmergencyScreenState extends ConsumerState<EmergencyScreen> {
  List<Map<String, dynamic>> _workers = [];
  bool _loading = true;
  bool _requesting = false;
  final _reason = TextEditingController(text: 'Emergency assistance needed');
  String? _statusMessage;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final res = await ApiClient.instance.get(
        '/search/providers',
        queryParameters: {'type': 'EMERGENCY_WORKER', 'limit': 20},
      );
      final data = (res.data as Map?)?['data'] as List?;
      setState(() {
        _workers = data?.map((e) => Map<String, dynamic>.from(e as Map)).toList() ?? [];
        _loading = false;
      });
    } catch (_) {
      setState(() => _loading = false);
    }
  }

  Future<void> _request(Map<String, dynamic> worker) async {
    final user = ref.read(authProvider).user;
    if (user == null) return;

    final confirm = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        title: Text('Request ${worker['name']}?'),
        content: const Text('This will dispatch emergency assistance immediately. Only use for real emergencies.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: Colors.red),
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Dispatch'),
          ),
        ],
      ),
    );
    if (confirm != true || !mounted) return;

    setState(() { _requesting = true; _statusMessage = null; });
    try {
      final now = DateTime.now();
      final res = await ApiClient.instance.post('/bookings', data: {
        'providerUserId': worker['id'],
        'providerType': 'EMERGENCY_WORKER',
        'type': 'home_visit',
        'reason': _reason.text.trim(),
        'scheduledDate': '${now.year.toString().padLeft(4, '0')}-${now.month.toString().padLeft(2, '0')}-${now.day.toString().padLeft(2, '0')}',
        'scheduledTime': '${now.hour.toString().padLeft(2, '0')}:${now.minute.toString().padLeft(2, '0')}',
        'priority': 'urgent',
      });
      final data = res.data as Map?;
      if (data?['success'] == true) {
        setState(() => _statusMessage = '✓ Dispatched — you\'ll receive confirmation shortly.');
      } else {
        setState(() => _statusMessage = data?['message']?.toString() ?? 'Dispatch failed');
      }
    } catch (e) {
      setState(() => _statusMessage = 'Network error — call 114 directly.');
    } finally {
      if (mounted) setState(() => _requesting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Emergency', style: TextStyle(fontWeight: FontWeight.bold)),
        backgroundColor: Colors.red.shade700,
        foregroundColor: Colors.white,
      ),
      body: Column(
        children: [
          // Hero banner
          Container(
            width: double.infinity,
            color: Colors.red.shade50,
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(color: Colors.red.shade700, borderRadius: BorderRadius.circular(10)),
                      child: const Icon(Icons.emergency, color: Colors.white),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('Life-threatening? Call 114', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.red.shade800)),
                          const Text('Use this page for non-life-threatening urgent care.',
                              style: TextStyle(fontSize: 12, color: Colors.black54)),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                TextField(
                  controller: _reason,
                  maxLines: 2,
                  decoration: InputDecoration(
                    labelText: 'What\'s happening?',
                    filled: true,
                    fillColor: Colors.white,
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                ),
              ],
            ),
          ),
          if (_statusMessage != null)
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(12),
              color: _statusMessage!.startsWith('✓') ? Colors.green.shade50 : Colors.orange.shade50,
              child: Text(_statusMessage!, textAlign: TextAlign.center),
            ),
          if (_requesting) const LinearProgressIndicator(),
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator())
                : _workers.isEmpty
                    ? const Center(child: Text('No emergency workers available'))
                    : ListView.separated(
                        padding: const EdgeInsets.all(12),
                        itemCount: _workers.length,
                        separatorBuilder: (_, __) => const SizedBox(height: 8),
                        itemBuilder: (_, i) {
                          final w = _workers[i];
                          final name = w['name']?.toString() ?? 'Emergency worker';
                          final zone = w['responseZone']?.toString() ?? w['address']?.toString() ?? '—';
                          return Card(
                            child: ListTile(
                              leading: CircleAvatar(
                                backgroundColor: Colors.red.shade100,
                                child: const Icon(Icons.local_hospital, color: Colors.red),
                              ),
                              title: Text(name, style: const TextStyle(fontWeight: FontWeight.w600)),
                              subtitle: Text(zone),
                              trailing: FilledButton(
                                style: FilledButton.styleFrom(
                                  backgroundColor: Colors.red.shade700,
                                  foregroundColor: Colors.white,
                                ),
                                onPressed: _requesting ? null : () => _request(w),
                                child: const Text('Dispatch'),
                              ),
                            ),
                          );
                        },
                      ),
          ),
        ],
      ),
    );
  }

  @override
  void dispose() {
    _reason.dispose();
    super.dispose();
  }
}
