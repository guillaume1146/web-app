import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../api/client.dart';
import '../theme/mediwyz_theme.dart';
import '../widgets/app_drawer.dart';

class InsuranceClaimsScreen extends ConsumerStatefulWidget {
  const InsuranceClaimsScreen({super.key});
  @override
  ConsumerState<InsuranceClaimsScreen> createState() => _InsuranceClaimsScreenState();
}

class _InsuranceClaimsScreenState extends ConsumerState<InsuranceClaimsScreen> with SingleTickerProviderStateMixin {
  late final TabController _tabs;
  Map<String, List<Map<String, dynamic>>> _buckets = {'pending': [], 'approved': [], 'denied': []};
  bool _loading = true;
  String? _busyId;

  @override
  void initState() {
    super.initState();
    _tabs = TabController(length: 3, vsync: this);
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final results = await Future.wait([
        ApiClient.instance.get('/insurance/claims', queryParameters: {'status': 'pending', 'limit': 50}),
        ApiClient.instance.get('/insurance/claims', queryParameters: {'status': 'approved', 'limit': 50}),
        ApiClient.instance.get('/insurance/claims', queryParameters: {'status': 'denied', 'limit': 50}),
      ]);
      List<Map<String, dynamic>> parse(dynamic body) {
        final d = (body as Map?)?['data'] as List?;
        return d?.map((e) => Map<String, dynamic>.from(e as Map)).toList() ?? [];
      }
      setState(() {
        _buckets = {
          'pending': parse(results[0].data),
          'approved': parse(results[1].data),
          'denied': parse(results[2].data),
        };
        _loading = false;
      });
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _act(String id, String status, {String? notes}) async {
    setState(() => _busyId = id);
    try {
      await ApiClient.instance.patch('/insurance/claims/$id', data: {'status': status, if (notes != null) 'notes': notes});
      await _load();
    } catch (_) {}
    finally { if (mounted) setState(() => _busyId = null); }
  }

  Future<void> _viewClaim(Map<String, dynamic> c) async {
    await showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (_) => _ClaimDetail(
        claim: c,
        onApprove: () { Navigator.pop(context); _act(c['id']?.toString() ?? '', 'approved'); },
        onReject: (notes) { Navigator.pop(context); _act(c['id']?.toString() ?? '', 'denied', notes: notes); },
      ),
    );
  }

  Widget _claimList(List<Map<String, dynamic>> items, {required bool showActions}) {
    if (items.isEmpty) return const Center(child: Text('Nothing here', style: TextStyle(color: Colors.black54)));
    return RefreshIndicator(
      onRefresh: _load,
      child: ListView.separated(
        padding: const EdgeInsets.all(12),
        itemCount: items.length,
        separatorBuilder: (_, __) => const SizedBox(height: 8),
        itemBuilder: (_, i) {
          final c = items[i];
          final amount = (c['claimAmount'] as num?) ?? 0;
          final busy = _busyId == c['id']?.toString();
          return Card(
            child: ListTile(
              leading: CircleAvatar(
                backgroundColor: _statusColor(c['status']).withValues(alpha: 0.15),
                child: Icon(Icons.description_outlined, color: _statusColor(c['status'])),
              ),
              title: Text(c['policyHolderName']?.toString() ?? 'Claim', style: const TextStyle(fontWeight: FontWeight.w600)),
              subtitle: Text(
                '${c['policyType'] ?? 'Claim'} · $amount MUR',
                style: const TextStyle(fontSize: 12),
              ),
              trailing: showActions && !busy
                  ? Wrap(spacing: 4, children: [
                      IconButton(icon: const Icon(Icons.check_circle, color: Colors.green, size: 22), onPressed: () => _act(c['id']?.toString() ?? '', 'approved')),
                      IconButton(icon: const Icon(Icons.cancel_outlined, color: Colors.red, size: 22), onPressed: () => _viewClaim(c)),
                    ])
                  : null,
              onTap: () => _viewClaim(c),
            ),
          );
        },
      ),
    );
  }

  Color _statusColor(dynamic s) => switch (s?.toString()) {
    'approved' => Colors.green,
    'denied' => Colors.red,
    _ => Colors.orange,
  };

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      drawer: const AppDrawer(),
      appBar: AppBar(
        title: const Text('Claims', style: TextStyle(fontWeight: FontWeight.bold)),
        bottom: TabBar(
          controller: _tabs,
          labelColor: MediWyzColors.teal,
          indicatorColor: MediWyzColors.teal,
          tabs: [
            Tab(text: 'Pending (${_buckets['pending']!.length})'),
            Tab(text: 'Approved (${_buckets['approved']!.length})'),
            Tab(text: 'Denied (${_buckets['denied']!.length})'),
          ],
        ),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : TabBarView(
              controller: _tabs,
              children: [
                _claimList(_buckets['pending']!, showActions: true),
                _claimList(_buckets['approved']!, showActions: false),
                _claimList(_buckets['denied']!, showActions: false),
              ],
            ),
    );
  }

  @override
  void dispose() {
    _tabs.dispose();
    super.dispose();
  }
}

class _ClaimDetail extends StatelessWidget {
  final Map<String, dynamic> claim;
  final VoidCallback onApprove;
  final void Function(String? notes) onReject;
  const _ClaimDetail({required this.claim, required this.onApprove, required this.onReject});

  @override
  Widget build(BuildContext context) {
    final amount = (claim['claimAmount'] as num?) ?? 0;
    final notesCtrl = TextEditingController();
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(claim['policyHolderName']?.toString() ?? 'Claim',
                style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: MediWyzColors.navy)),
            const SizedBox(height: 4),
            Text('${claim['policyType'] ?? 'Claim'} · $amount MUR', style: const TextStyle(color: Colors.black54)),
            const SizedBox(height: 14),
            if (claim['description'] != null) Text(claim['description'].toString()),
            const SizedBox(height: 14),
            TextField(
              controller: notesCtrl,
              maxLines: 2,
              decoration: const InputDecoration(labelText: 'Decision notes (optional)', border: OutlineInputBorder()),
            ),
            const SizedBox(height: 14),
            Row(children: [
              Expanded(
                child: FilledButton.icon(
                  onPressed: onApprove,
                  icon: const Icon(Icons.check),
                  label: const Text('Approve'),
                  style: FilledButton.styleFrom(backgroundColor: Colors.green),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: () => onReject(notesCtrl.text.trim().isEmpty ? null : notesCtrl.text.trim()),
                  icon: const Icon(Icons.close),
                  label: const Text('Reject'),
                  style: OutlinedButton.styleFrom(foregroundColor: Colors.red),
                ),
              ),
            ]),
          ],
        ),
      ),
    );
  }
}
