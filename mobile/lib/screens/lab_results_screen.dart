import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../api/client.dart';
import '../services/auth_service.dart';
import '../theme/mediwyz_theme.dart';

class LabResultsScreen extends ConsumerStatefulWidget {
  const LabResultsScreen({super.key});
  @override
  ConsumerState<LabResultsScreen> createState() => _LabResultsScreenState();
}

class _LabResultsScreenState extends ConsumerState<LabResultsScreen> {
  List<Map<String, dynamic>> _items = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final user = ref.read(authProvider).user;
    if (user == null) return;
    try {
      final res = await ApiClient.instance.get('/users/${user['id']}/lab-results');
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
    return Scaffold(
      appBar: AppBar(title: const Text('Lab results', style: TextStyle(fontWeight: FontWeight.bold))),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _items.isEmpty
              ? const Center(child: Text('No lab results yet', style: TextStyle(color: Colors.black54)))
              : RefreshIndicator(
                  onRefresh: _load,
                  child: ListView.separated(
                    padding: const EdgeInsets.all(12),
                    itemCount: _items.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 8),
                    itemBuilder: (_, i) {
                      final r = _items[i];
                      final testName = r['testName']?.toString() ?? r['serviceName']?.toString() ?? 'Test';
                      final status = r['status']?.toString() ?? 'pending';
                      final isReady = status == 'results_ready' || status == 'completed';
                      return Card(
                        child: ListTile(
                          leading: CircleAvatar(
                            backgroundColor: (isReady ? Colors.green : Colors.amber).withValues(alpha: 0.15),
                            child: Icon(
                              isReady ? Icons.fact_check : Icons.pending_actions,
                              color: isReady ? Colors.green : Colors.amber.shade700,
                            ),
                          ),
                          title: Text(testName, style: const TextStyle(fontWeight: FontWeight.w600)),
                          subtitle: Text(
                            '${r['providerName']?.toString() ?? ''} · ${r['scheduledAt']?.toString().split('T').first ?? ''}',
                          ),
                          trailing: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                            decoration: BoxDecoration(
                              color: (isReady ? Colors.green : Colors.amber).withValues(alpha: 0.15),
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: Text(
                              isReady ? 'Ready' : 'Pending',
                              style: TextStyle(
                                fontSize: 10,
                                color: isReady ? Colors.green : Colors.amber.shade800,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ),
                          onTap: isReady
                              ? () {
                                  showDialog(
                                    context: context,
                                    builder: (_) => AlertDialog(
                                      title: Text(testName),
                                      content: SingleChildScrollView(
                                        child: Text(
                                          r['resultNotes']?.toString() ?? r['notes']?.toString() ?? 'No details available.',
                                          style: const TextStyle(color: MediWyzColors.navy),
                                        ),
                                      ),
                                      actions: [TextButton(onPressed: () => Navigator.pop(context), child: const Text('Close'))],
                                    ),
                                  );
                                }
                              : null,
                        ),
                      );
                    },
                  ),
                ),
    );
  }
}
