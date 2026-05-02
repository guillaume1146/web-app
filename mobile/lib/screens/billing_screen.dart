import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../api/client.dart';
import '../services/auth_service.dart';
import '../theme/mediwyz_theme.dart';
import '../widgets/app_drawer.dart';
import '../widgets/bottom_nav.dart';

class BillingScreen extends ConsumerStatefulWidget {
  const BillingScreen({super.key});
  @override
  ConsumerState<BillingScreen> createState() => _BillingScreenState();
}

class _BillingScreenState extends ConsumerState<BillingScreen> {
  Map<String, dynamic>? _wallet;
  List<Map<String, dynamic>> _txs = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final user = ref.read(authProvider).user;
    if (user == null) return;
    final userId = user['id'];
    try {
      final res = await ApiClient.instance.get('/users/$userId/wallet');
      final body = res.data as Map?;
      final data = body?['data'] as Map?;
      setState(() {
        _wallet = data == null ? null : Map<String, dynamic>.from(data);
        final txs = (data?['transactions'] as List?) ?? [];
        _txs = txs.map((e) => Map<String, dynamic>.from(e as Map)).toList();
        _loading = false;
      });
    } catch (_) {
      setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Billing', style: TextStyle(fontWeight: FontWeight.bold))),
      drawer: const AppDrawer(),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _load,
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  // Balance card
                  Card(
                    color: MediWyzColors.teal,
                    child: Padding(
                      padding: const EdgeInsets.all(20),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('Account Balance', style: TextStyle(color: Colors.white70, fontSize: 12)),
                          const SizedBox(height: 4),
                          Text(
                            '${_wallet?['balance']?.toString() ?? '0'} MUR',
                            style: const TextStyle(color: Colors.white, fontSize: 28, fontWeight: FontWeight.bold),
                          ),
                          const SizedBox(height: 12),
                          Row(
                            children: [
                              FilledButton.icon(
                                style: FilledButton.styleFrom(backgroundColor: Colors.white, foregroundColor: MediWyzColors.teal),
                                onPressed: () {
                                  // TODO: top up flow
                                },
                                icon: const Icon(Icons.add),
                                label: const Text('Top up'),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 20),
                  const Padding(
                    padding: EdgeInsets.symmetric(horizontal: 4, vertical: 8),
                    child: Text('Recent Transactions', style: TextStyle(fontWeight: FontWeight.w600, color: MediWyzColors.navy)),
                  ),
                  if (_txs.isEmpty)
                    const Padding(
                      padding: EdgeInsets.symmetric(vertical: 20),
                      child: Center(child: Text('No transactions yet', style: TextStyle(color: Colors.black54))),
                    )
                  else
                    ..._txs.map((t) {
                      final amount = (t['amount'] as num?) ?? 0;
                      final isCredit = amount > 0;
                      return Card(
                        margin: const EdgeInsets.only(bottom: 8),
                        child: ListTile(
                          leading: CircleAvatar(
                            backgroundColor: (isCredit ? Colors.green : Colors.red).withValues(alpha: 0.1),
                            child: Icon(
                              isCredit ? Icons.arrow_downward : Icons.arrow_upward,
                              color: isCredit ? Colors.green : Colors.red,
                              size: 18,
                            ),
                          ),
                          title: Text(t['description']?.toString() ?? 'Transaction', maxLines: 1, overflow: TextOverflow.ellipsis),
                          subtitle: Text(t['createdAt']?.toString().split('T').first ?? ''),
                          trailing: Text(
                            '${isCredit ? '+' : ''}${amount.toString()} MUR',
                            style: TextStyle(
                              color: isCredit ? Colors.green : Colors.red,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                      );
                    }),
                ],
              ),
            ),
      bottomNavigationBar: const MediWyzBottomNav(currentIndex: 3),
    );
  }
}
