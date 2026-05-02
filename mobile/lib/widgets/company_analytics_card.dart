import 'package:flutter/material.dart';
import '../api/client.dart';
import '../theme/mediwyz_theme.dart';

/// Owner analytics tile — embedded on the Flutter My Company screen. Shows
/// member counts, expected monthly revenue, and claims summary. Graceful
/// empty (returns nothing) if the caller does not own a company.
class CompanyAnalyticsCard extends StatefulWidget {
  const CompanyAnalyticsCard({super.key});
  @override
  State<CompanyAnalyticsCard> createState() => _CompanyAnalyticsCardState();
}

class _CompanyAnalyticsCardState extends State<CompanyAnalyticsCard> {
  Map<String, dynamic>? _data;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final res = await ApiClient.instance.get('/corporate/analytics');
      final success = (res.data as Map?)?['success'] == true;
      if (success && mounted) {
        setState(() => _data = Map<String, dynamic>.from((res.data as Map)['data'] as Map));
      }
    } catch (_) { /* silent — user may not own a company */ }
    if (mounted) setState(() => _loading = false);
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) return const SizedBox.shrink();
    if (_data == null) return const SizedBox.shrink();

    final company = (_data!['company'] as Map?) ?? {};
    final members = (_data!['members'] as Map?) ?? {};
    final claims = (_data!['claimsByStatus'] as Map?) ?? {};
    final revenue = (_data!['monthlyExpectedRevenue'] as num?)?.toDouble() ?? 0;
    final pendingClaims = ((claims['pending'] as Map?)?['count'] as num?)?.toInt() ?? 0;
    final paidTotal = ((claims['paid'] as Map?)?['totalAmount'] as num?)?.toDouble() ?? 0;
    final isInsurance = company['isInsuranceCompany'] == true;

    return Card(
      margin: const EdgeInsets.only(bottom: 16),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(children: [
              Expanded(
                child: Text('Analytics — ${company['name'] ?? 'Company'}',
                  style: const TextStyle(fontWeight: FontWeight.bold, color: MediWyzColors.navy)),
              ),
              if (isInsurance)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(color: Colors.indigo.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(10)),
                  child: const Row(mainAxisSize: MainAxisSize.min, children: [
                    Icon(Icons.shield_outlined, size: 12, color: Colors.indigo),
                    SizedBox(width: 3),
                    Text('Insurance', style: TextStyle(fontSize: 10, color: Colors.indigo, fontWeight: FontWeight.w600)),
                  ]),
                ),
            ]),
            const SizedBox(height: 12),
            Row(children: [
              _Tile(label: 'Active', value: '${members['active'] ?? 0}', color: Colors.grey.shade700),
              _Tile(label: 'Pending', value: '${members['pending'] ?? 0}', color: Colors.amber.shade700),
              _Tile(label: 'MUR/mo', value: revenue.toStringAsFixed(0), color: Colors.green.shade700),
              if (isInsurance)
                _Tile(
                  label: pendingClaims > 0 ? 'Claims' : 'Paid',
                  value: pendingClaims > 0 ? '$pendingClaims' : 'MUR ${paidTotal.toStringAsFixed(0)}',
                  color: pendingClaims > 0 ? Colors.red.shade700 : Colors.indigo.shade700,
                ),
            ]),
          ],
        ),
      ),
    );
  }
}

class _Tile extends StatelessWidget {
  final String label; final String value; final Color color;
  const _Tile({required this.label, required this.value, required this.color});
  @override
  Widget build(BuildContext context) => Expanded(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 2),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(value, style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: color), overflow: TextOverflow.ellipsis),
              Text(label, style: const TextStyle(fontSize: 10, color: Colors.black54)),
            ],
          ),
        ),
      );
}
