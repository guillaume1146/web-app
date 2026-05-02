import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../api/client.dart';
import '../services/auth_service.dart';
import '../theme/mediwyz_theme.dart';
import '../widgets/app_drawer.dart';
import '../widgets/skeleton.dart';

/// Referral partner dashboard — mirrors `/referral-partner/dashboard` on web.
/// Shows earnings, conversion funnel, recent conversions, and lead source table.
class ReferralDashboardScreen extends ConsumerStatefulWidget {
  const ReferralDashboardScreen({super.key});
  @override
  ConsumerState<ReferralDashboardScreen> createState() => _ReferralDashboardScreenState();
}

class _ReferralDashboardScreenState extends ConsumerState<ReferralDashboardScreen> {
  Map<String, dynamic>? _data;
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
      // /me auto-provisions a referral code on first access.
      final res = await ApiClient.instance.get('/referral-partners/me');
      _data = Map<String, dynamic>.from(((res.data as Map?)?['data'] as Map?) ?? {});
    } catch (_) {}
    if (mounted) setState(() => _loading = false);
  }

  @override
  Widget build(BuildContext context) {
    final stats = (_data?['stats'] as Map?) ?? {};
    final recent = ((_data?['recentConversions'] as List?) ?? []).cast<dynamic>();
    final sources = ((_data?['leadsBySource'] as List?) ?? []).cast<dynamic>();
    final code = stats['referralCode']?.toString() ?? '';

    return Scaffold(
      drawer: const AppDrawer(),
      appBar: AppBar(title: const Text('Referral partner', style: TextStyle(fontWeight: FontWeight.bold))),
      body: _loading
          ? const Padding(padding: EdgeInsets.all(16), child: SkeletonList(lineCount: 6))
          : RefreshIndicator(
              onRefresh: _load,
              child: ListView(
                padding: const EdgeInsets.all(12),
                children: [
                  // Referral code card
                  Card(
                    color: MediWyzColors.navy,
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('Your referral code', style: TextStyle(color: Colors.white70, fontSize: 12)),
                          const SizedBox(height: 6),
                          Row(children: [
                            Expanded(
                              child: Text(
                                code.isEmpty ? '—' : code,
                                style: const TextStyle(
                                    fontFamily: 'monospace',
                                    fontSize: 22,
                                    fontWeight: FontWeight.bold,
                                    color: Colors.white,
                                    letterSpacing: 2),
                              ),
                            ),
                            IconButton(
                              icon: const Icon(Icons.copy, color: Colors.white),
                              onPressed: code.isEmpty
                                  ? null
                                  : () {
                                      Clipboard.setData(ClipboardData(text: code));
                                      ScaffoldMessenger.of(context).showSnackBar(
                                        const SnackBar(content: Text('Code copied'), backgroundColor: Colors.green),
                                      );
                                    },
                            ),
                          ]),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),

                  // Stat grid
                  GridView.count(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    crossAxisCount: 2,
                    childAspectRatio: 1.5,
                    mainAxisSpacing: 10,
                    crossAxisSpacing: 10,
                    children: [
                      _StatCard(
                        icon: Icons.attach_money,
                        color: Colors.green,
                        label: 'Total earnings',
                        value: 'MUR ${(stats['totalEarnings'] ?? 0).toStringAsFixed(0)}',
                      ),
                      _StatCard(
                        icon: Icons.people_outline,
                        color: Colors.blue,
                        label: 'Referrals',
                        value: '${stats['totalReferrals'] ?? 0}',
                      ),
                      _StatCard(
                        icon: Icons.trending_up,
                        color: Colors.purple,
                        label: 'Conversion',
                        value: '${stats['conversionRate'] ?? 0}%',
                      ),
                      _StatCard(
                        icon: Icons.access_time,
                        color: Colors.orange,
                        label: 'Pending payout',
                        value: 'MUR ${(stats['pendingPayouts'] ?? 0).toStringAsFixed(0)}',
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),

                  // This month
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(14),
                      child: Row(children: [
                        const Icon(Icons.calendar_month, color: MediWyzColors.teal),
                        const SizedBox(width: 10),
                        const Expanded(child: Text('This month', style: TextStyle(fontWeight: FontWeight.w600, color: MediWyzColors.navy))),
                        Text('MUR ${(stats['thisMonthEarnings'] ?? 0).toStringAsFixed(0)}',
                            style: const TextStyle(fontWeight: FontWeight.bold, color: MediWyzColors.teal)),
                        const SizedBox(width: 10),
                        Text('· ${stats['thisMonthReferrals'] ?? 0} conv.',
                            style: const TextStyle(color: Colors.black54, fontSize: 12)),
                      ]),
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Recent conversions
                  const Padding(
                    padding: EdgeInsets.symmetric(horizontal: 4, vertical: 6),
                    child: Text('Recent conversions', style: TextStyle(fontWeight: FontWeight.w600, color: MediWyzColors.navy)),
                  ),
                  if (recent.isEmpty)
                    const EmptyState(icon: Icons.person_add_outlined, title: 'No conversions yet', description: 'Share your code to earn commissions')
                  else
                    Card(
                      child: Column(
                        children: recent.take(10).map((c) {
                          final m = c as Map;
                          final name = '${m['firstName'] ?? ''} ${m['lastName'] ?? ''}'.trim();
                          return ListTile(
                            leading: const CircleAvatar(backgroundColor: MediWyzColors.sky, child: Icon(Icons.person, color: MediWyzColors.navy, size: 18)),
                            title: Text(name.isEmpty ? 'User' : name, style: const TextStyle(fontSize: 14)),
                            subtitle: Text(m['userType']?.toString().replaceAll('_', ' ') ?? ''),
                            trailing: Text(_formatDate(m['createdAt']?.toString() ?? ''),
                                style: const TextStyle(fontSize: 11, color: Colors.black54)),
                          );
                        }).toList(),
                      ),
                    ),
                  const SizedBox(height: 16),

                  // Leads by source
                  if (sources.isNotEmpty) ...[
                    const Padding(
                      padding: EdgeInsets.symmetric(horizontal: 4, vertical: 6),
                      child: Text('Leads by source', style: TextStyle(fontWeight: FontWeight.w600, color: MediWyzColors.navy)),
                    ),
                    Card(
                      child: Column(
                        children: sources.map((s) {
                          final m = s as Map;
                          return ListTile(
                            leading: const Icon(Icons.link, color: MediWyzColors.teal),
                            title: Text(m['source']?.toString() ?? 'Direct'),
                            subtitle: Text('${m['visitors']} visits · ${m['conversions']} conv.'),
                            trailing: Text('${m['conversionRate'] ?? 0}%',
                                style: const TextStyle(fontWeight: FontWeight.bold, color: MediWyzColors.teal)),
                          );
                        }).toList(),
                      ),
                    ),
                  ],
                ],
              ),
            ),
    );
  }

  String _formatDate(String iso) {
    try {
      final d = DateTime.parse(iso).toLocal();
      return '${d.day}/${d.month}/${d.year}';
    } catch (_) {
      return '';
    }
  }
}

class _StatCard extends StatelessWidget {
  final IconData icon;
  final Color color;
  final String label;
  final String value;
  const _StatCard({required this.icon, required this.color, required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Container(
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(color: color.withValues(alpha: 0.15), borderRadius: BorderRadius.circular(8)),
              child: Icon(icon, size: 18, color: color),
            ),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(value, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18, color: MediWyzColors.navy)),
                Text(label, style: const TextStyle(color: Colors.black54, fontSize: 11)),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
