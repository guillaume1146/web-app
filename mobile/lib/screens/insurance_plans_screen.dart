import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../api/client.dart';
import '../theme/mediwyz_theme.dart';
import '../widgets/app_drawer.dart';
import '../widgets/skeleton.dart';

/// Browses all active insurance plan listings — any user can explore
/// coverage before contacting a rep. Mirrors `/search/insurance` on web.
class InsurancePlansScreen extends ConsumerStatefulWidget {
  const InsurancePlansScreen({super.key});
  @override
  ConsumerState<InsurancePlansScreen> createState() => _InsurancePlansScreenState();
}

class _InsurancePlansScreenState extends ConsumerState<InsurancePlansScreen> {
  List<Map<String, dynamic>> _plans = [];
  bool _loading = true;
  String _query = '';
  String _typeFilter = 'All';

  static const _types = ['All', 'Health', 'Dental', 'Vision', 'Life', 'Family'];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final res = await ApiClient.instance.get('/insurance/plans',
          queryParameters: _query.isEmpty ? null : {'q': _query});
      final data = (res.data as Map?)?['data'] as List?;
      _plans = (data ?? []).map((e) => Map<String, dynamic>.from(e as Map)).toList();
    } catch (_) {}
    if (mounted) setState(() => _loading = false);
  }

  List<Map<String, dynamic>> get _filtered => _typeFilter == 'All'
      ? _plans
      : _plans.where((p) => (p['planType']?.toString() ?? '').toLowerCase() == _typeFilter.toLowerCase()).toList();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      drawer: const AppDrawer(),
      appBar: AppBar(title: const Text('Insurance plans', style: TextStyle(fontWeight: FontWeight.bold))),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(12, 12, 12, 6),
            child: TextField(
              decoration: InputDecoration(
                hintText: 'Search by plan name…',
                prefixIcon: const Icon(Icons.search),
                isDense: true,
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
              ),
              onChanged: (v) => setState(() => _query = v),
              onSubmitted: (_) => _load(),
            ),
          ),
          SizedBox(
            height: 40,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 12),
              itemCount: _types.length,
              separatorBuilder: (_, __) => const SizedBox(width: 6),
              itemBuilder: (_, i) {
                final t = _types[i];
                final selected = _typeFilter == t;
                return ChoiceChip(
                  label: Text(t),
                  selected: selected,
                  onSelected: (_) => setState(() => _typeFilter = t),
                  selectedColor: MediWyzColors.sky,
                  labelStyle: TextStyle(
                    color: selected ? MediWyzColors.navy : Colors.black87,
                    fontWeight: selected ? FontWeight.w600 : FontWeight.w500,
                  ),
                );
              },
            ),
          ),
          Expanded(
            child: _loading
                ? const Padding(padding: EdgeInsets.all(12), child: SkeletonList(lineCount: 4))
                : _filtered.isEmpty
                    ? const EmptyState(icon: Icons.shield_outlined, title: 'No plans', description: 'Try a different search or filter')
                    : RefreshIndicator(
                        onRefresh: _load,
                        child: ListView.builder(
                          padding: const EdgeInsets.all(12),
                          itemCount: _filtered.length,
                          itemBuilder: (_, i) => _PlanCard(plan: _filtered[i]),
                        ),
                      ),
          ),
        ],
      ),
    );
  }
}

class _PlanCard extends StatelessWidget {
  final Map<String, dynamic> plan;
  const _PlanCard({required this.plan});

  @override
  Widget build(BuildContext context) {
    final rep = plan['insuranceRep'] as Map?;
    final repUser = rep?['user'] as Map?;
    final repName = repUser == null ? '' : '${repUser['firstName'] ?? ''} ${repUser['lastName'] ?? ''}'.trim();
    final company = rep?['companyName']?.toString() ?? '';
    final coverage = (plan['coverageDetails'] as List?)?.cast<dynamic>() ?? [];
    final currency = plan['currency']?.toString() ?? 'MUR';

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
                    plan['planName']?.toString() ?? '—',
                    style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: MediWyzColors.navy),
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                  decoration: BoxDecoration(color: MediWyzColors.sky, borderRadius: BorderRadius.circular(10)),
                  child: Text(
                    plan['planType']?.toString() ?? '',
                    style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w600, color: MediWyzColors.navy),
                  ),
                ),
              ],
            ),
            if (company.isNotEmpty)
              Padding(
                padding: const EdgeInsets.only(top: 4),
                child: Text(
                  repName.isEmpty ? company : '$company • $repName',
                  style: const TextStyle(color: Colors.black54, fontSize: 12),
                ),
              ),
            const SizedBox(height: 10),
            Text(
              plan['description']?.toString() ?? '',
              maxLines: 3,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontSize: 13),
            ),
            const SizedBox(height: 10),
            Row(children: [
              _Pill(label: 'Premium', value: '$currency ${(plan['monthlyPremium'] ?? 0).toStringAsFixed(0)}/mo', color: MediWyzColors.teal),
              const SizedBox(width: 6),
              _Pill(label: 'Coverage', value: '$currency ${(plan['coverageAmount'] ?? 0).toStringAsFixed(0)}', color: Colors.green),
              if (plan['deductible'] != null) ...[
                const SizedBox(width: 6),
                _Pill(label: 'Deductible', value: '$currency ${(plan['deductible']).toStringAsFixed(0)}', color: Colors.orange),
              ],
            ]),
            if (coverage.isNotEmpty) ...[
              const SizedBox(height: 10),
              const Text('Includes:', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Colors.black54)),
              const SizedBox(height: 4),
              Wrap(
                spacing: 6,
                runSpacing: 4,
                children: coverage.take(6).map((c) {
                  return Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: MediWyzColors.sky.withValues(alpha: 0.35),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(c.toString(), style: const TextStyle(fontSize: 11, color: MediWyzColors.navy)),
                  );
                }).toList(),
              ),
            ],
            const SizedBox(height: 10),
            Align(
              alignment: Alignment.centerRight,
              child: TextButton.icon(
                style: TextButton.styleFrom(foregroundColor: MediWyzColors.teal),
                icon: const Icon(Icons.info_outline, size: 16),
                label: const Text('Request info'),
                onPressed: () {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text('Contact ${company.isEmpty ? 'the rep' : company} via Messages to enroll'),
                      backgroundColor: MediWyzColors.teal,
                    ),
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _Pill extends StatelessWidget {
  final String label;
  final String value;
  final Color color;
  const _Pill({required this.label, required this.value, required this.color});

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
        decoration: BoxDecoration(color: color.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(8)),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(label, style: const TextStyle(fontSize: 10, color: Colors.black54)),
            Text(value, style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: color)),
          ],
        ),
      ),
    );
  }
}
