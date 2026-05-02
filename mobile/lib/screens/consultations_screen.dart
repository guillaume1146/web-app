import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../api/client.dart';
import '../theme/mediwyz_theme.dart';
import '../widgets/app_drawer.dart';

/// Filtered view of bookings — Upcoming / Past / All.
/// Works for any user type since it pulls /bookings/unified with the correct role.
class ConsultationsScreen extends ConsumerStatefulWidget {
  const ConsultationsScreen({super.key});
  @override
  ConsumerState<ConsultationsScreen> createState() => _ConsultationsScreenState();
}

class _ConsultationsScreenState extends ConsumerState<ConsultationsScreen> with SingleTickerProviderStateMixin {
  late final TabController _tabs;
  List<Map<String, dynamic>> _bookings = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _tabs = TabController(length: 3, vsync: this);
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final res = await ApiClient.instance.get('/bookings/unified', queryParameters: {'role': 'patient'});
      final data = (res.data as Map?)?['data'] as List?;
      setState(() {
        _bookings = data?.map((e) => Map<String, dynamic>.from(e as Map)).toList() ?? [];
        _loading = false;
      });
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  List<Map<String, dynamic>> _filter(String bucket) {
    final now = DateTime.now();
    return _bookings.where((b) {
      final s = b['status']?.toString() ?? '';
      final dt = DateTime.tryParse(b['scheduledAt']?.toString() ?? '');
      switch (bucket) {
        case 'upcoming':
          return const {'pending', 'accepted', 'confirmed', 'upcoming', 'in_progress'}.contains(s) && (dt == null || dt.isAfter(now.subtract(const Duration(hours: 2))));
        case 'past':
          return const {'completed', 'resolved', 'cancelled', 'denied'}.contains(s);
        default:
          return true;
      }
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      drawer: const AppDrawer(),
      appBar: AppBar(
        title: const Text('My consultations', style: TextStyle(fontWeight: FontWeight.bold)),
        bottom: TabBar(
          controller: _tabs,
          labelColor: MediWyzColors.teal,
          indicatorColor: MediWyzColors.teal,
          tabs: [
            Tab(text: 'Upcoming (${_filter('upcoming').length})'),
            Tab(text: 'Past (${_filter('past').length})'),
            Tab(text: 'All (${_bookings.length})'),
          ],
        ),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : TabBarView(
              controller: _tabs,
              children: [
                _list(_filter('upcoming')),
                _list(_filter('past')),
                _list(_bookings),
              ],
            ),
    );
  }

  Widget _list(List<Map<String, dynamic>> items) {
    if (items.isEmpty) return const Center(child: Text('Nothing to show', style: TextStyle(color: Colors.black54)));
    return RefreshIndicator(
      onRefresh: _load,
      child: ListView.separated(
        padding: const EdgeInsets.all(12),
        itemCount: items.length,
        separatorBuilder: (_, __) => const SizedBox(height: 8),
        itemBuilder: (_, i) {
          final b = items[i];
          final dt = DateTime.tryParse(b['scheduledAt']?.toString() ?? '');
          final status = b['status']?.toString() ?? 'pending';
          final providerName = b['providerName']?.toString() ?? 'Provider';

          return Card(
            child: ListTile(
              leading: CircleAvatar(
                backgroundColor: _statusColor(status).withValues(alpha: 0.15),
                child: Icon(Icons.event_note, color: _statusColor(status)),
              ),
              title: Text(b['serviceName']?.toString() ?? providerName, style: const TextStyle(fontWeight: FontWeight.w600)),
              subtitle: Text('${providerName} · ${dt != null ? '${dt.day}/${dt.month}/${dt.year} ${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}' : 'No date'}'),
              trailing: Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(color: _statusColor(status).withValues(alpha: 0.15), borderRadius: BorderRadius.circular(10)),
                child: Text(status, style: TextStyle(color: _statusColor(status), fontSize: 10, fontWeight: FontWeight.w600)),
              ),
              onTap: () => context.go('/bookings'),
            ),
          );
        },
      ),
    );
  }

  Color _statusColor(String s) => switch (s) {
    'completed' || 'resolved' => Colors.green,
    'cancelled' || 'denied' => Colors.red,
    'pending' => Colors.orange,
    _ => MediWyzColors.teal,
  };

  @override
  void dispose() {
    _tabs.dispose();
    super.dispose();
  }
}
