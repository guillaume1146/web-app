import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../api/client.dart';
import '../theme/mediwyz_theme.dart';
import '../widgets/app_drawer.dart';
import '../widgets/skeleton.dart';

/// Find Insurance — any user can browse insurance companies and join.
/// Mirrors `/search/insurance-companies` on web.
class FindInsuranceScreen extends ConsumerStatefulWidget {
  const FindInsuranceScreen({super.key});
  @override
  ConsumerState<FindInsuranceScreen> createState() => _FindInsuranceScreenState();
}

class _FindInsuranceScreenState extends ConsumerState<FindInsuranceScreen> {
  final _query = TextEditingController();
  List<Map<String, dynamic>> _companies = [];
  bool _loading = true;
  String? _joiningId;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final res = await ApiClient.instance.get(
        '/corporate/insurance-companies',
        queryParameters: _query.text.trim().isEmpty ? null : {'q': _query.text.trim()},
      );
      final data = (res.data as Map?)?['data'] as List?;
      _companies = (data ?? []).map((e) => Map<String, dynamic>.from(e as Map)).toList();
    } catch (_) { _companies = []; }
    if (mounted) setState(() => _loading = false);
  }

  Future<void> _join(Map<String, dynamic> company) async {
    final id = company['id']?.toString();
    if (id == null) return;
    setState(() => _joiningId = id);
    try {
      final res = await ApiClient.instance.post('/corporate/insurance/$id/join');
      final success = (res.data as Map?)?['success'] == true;
      final msg = (res.data as Map?)?['message']?.toString();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(success
                ? 'Joined ${company['companyName']} — first contribution deducted'
                : (msg ?? 'Failed to join')),
            backgroundColor: success ? Colors.green : Colors.red,
          ),
        );
      }
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Network error'), backgroundColor: Colors.red),
        );
      }
    } finally {
      if (mounted) setState(() => _joiningId = null);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      drawer: const AppDrawer(),
      appBar: AppBar(
        title: const Row(children: [
          Icon(Icons.shield_outlined, color: MediWyzColors.teal),
          SizedBox(width: 8),
          Text('Find Insurance', style: TextStyle(fontWeight: FontWeight.bold)),
        ]),
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(12, 12, 12, 6),
            child: Row(children: [
              Expanded(
                child: TextField(
                  controller: _query,
                  onSubmitted: (_) => _load(),
                  decoration: InputDecoration(
                    hintText: 'Search by company name…',
                    prefixIcon: const Icon(Icons.search),
                    isDense: true,
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              FilledButton(
                onPressed: _load,
                style: FilledButton.styleFrom(backgroundColor: MediWyzColors.teal),
                child: const Text('Search'),
              ),
            ]),
          ),
          Expanded(
            child: _loading
                ? const Padding(padding: EdgeInsets.all(12), child: SkeletonList(lineCount: 4))
                : _companies.isEmpty
                    ? const EmptyState(
                        icon: Icons.shield_outlined,
                        title: 'No insurance companies',
                        description: 'Any user can create one from My Company and flag it as an insurance scheme.',
                      )
                    : RefreshIndicator(
                        onRefresh: _load,
                        child: ListView.builder(
                          padding: const EdgeInsets.all(12),
                          itemCount: _companies.length,
                          itemBuilder: (_, i) => _CompanyCard(
                            company: _companies[i],
                            joining: _joiningId == _companies[i]['id']?.toString(),
                            onJoin: () => _join(_companies[i]),
                          ),
                        ),
                      ),
          ),
        ],
      ),
    );
  }

  @override
  void dispose() {
    _query.dispose();
    super.dispose();
  }
}

class _CompanyCard extends StatelessWidget {
  final Map<String, dynamic> company;
  final bool joining;
  final VoidCallback onJoin;
  const _CompanyCard({required this.company, required this.joining, required this.onJoin});

  @override
  Widget build(BuildContext context) {
    final contribution = (company['monthlyContribution'] as num?)?.toDouble() ?? 0;
    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(color: Colors.indigo.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(8)),
                child: const Icon(Icons.shield_outlined, color: Colors.indigo),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      company['companyName']?.toString() ?? 'Company',
                      style: const TextStyle(fontWeight: FontWeight.bold, color: MediWyzColors.navy),
                      maxLines: 1, overflow: TextOverflow.ellipsis,
                    ),
                    if (company['industry'] != null)
                      Text(company['industry'].toString(), style: const TextStyle(fontSize: 12, color: Colors.black54)),
                  ],
                ),
              ),
            ]),
            if (company['coverageDescription'] != null) ...[
              const SizedBox(height: 10),
              Text(
                company['coverageDescription'].toString(),
                style: const TextStyle(fontSize: 13, color: Colors.black87),
                maxLines: 2, overflow: TextOverflow.ellipsis,
              ),
            ],
            const SizedBox(height: 12),
            Row(children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Monthly contribution', style: TextStyle(fontSize: 11, color: Colors.black54)),
                    Text('MUR ${contribution.toStringAsFixed(0)}', style: const TextStyle(fontWeight: FontWeight.bold, color: MediWyzColors.navy, fontSize: 16)),
                  ],
                ),
              ),
              FilledButton(
                onPressed: joining ? null : onJoin,
                style: FilledButton.styleFrom(backgroundColor: MediWyzColors.teal),
                child: joining
                    ? const SizedBox(height: 16, width: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                    : const Text('Join'),
              ),
            ]),
          ],
        ),
      ),
    );
  }
}
