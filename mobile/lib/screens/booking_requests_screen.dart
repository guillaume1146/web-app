import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../api/client.dart';
import '../theme/mediwyz_theme.dart';
import '../widgets/app_drawer.dart';

/// Provider view: pending/active bookings for the current user as provider.
/// Actions go through POST /bookings/action (accept / deny / complete / start).
class BookingRequestsScreen extends ConsumerStatefulWidget {
  const BookingRequestsScreen({super.key});
  @override
  ConsumerState<BookingRequestsScreen> createState() => _BookingRequestsScreenState();
}

class _BookingRequestsScreenState extends ConsumerState<BookingRequestsScreen> with SingleTickerProviderStateMixin {
  late final TabController _tabs;
  List<Map<String, dynamic>> _all = [];
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
      final res = await ApiClient.instance.get('/bookings/unified', queryParameters: {'role': 'provider'});
      final data = (res.data as Map?)?['data'] as List?;
      setState(() {
        _all = data?.map((e) => Map<String, dynamic>.from(e as Map)).toList() ?? [];
        _loading = false;
      });
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _action(Map<String, dynamic> b, String action) async {
    setState(() => _busyId = b['id']?.toString());
    try {
      await ApiClient.instance.post('/bookings/action', data: {
        'bookingId': b['id'],
        'bookingType': b['bookingType'] ?? 'service_booking',
        'action': action,
      });
      await _load();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Booking $action' 'd'), backgroundColor: Colors.green),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed: $e'), backgroundColor: Colors.red),
        );
      }
    } finally {
      if (mounted) setState(() => _busyId = null);
    }
  }

  List<Map<String, dynamic>> _filter(String bucket) {
    return _all.where((b) {
      final s = b['status']?.toString() ?? '';
      switch (bucket) {
        case 'pending':
          return s == 'pending';
        case 'active':
          return const {'accepted', 'confirmed', 'in_progress', 'dispatched', 'en_route', 'upcoming'}.contains(s);
        case 'done':
          return const {'completed', 'resolved', 'cancelled', 'denied'}.contains(s);
      }
      return false;
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      drawer: const AppDrawer(),
      appBar: AppBar(
        title: const Text('Booking requests', style: TextStyle(fontWeight: FontWeight.bold)),
        bottom: TabBar(
          controller: _tabs,
          labelColor: MediWyzColors.teal,
          indicatorColor: MediWyzColors.teal,
          tabs: [
            Tab(text: 'Pending (${_filter('pending').length})'),
            Tab(text: 'Active (${_filter('active').length})'),
            Tab(text: 'Past (${_filter('done').length})'),
          ],
        ),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : TabBarView(
              controller: _tabs,
              children: [
                _list(_filter('pending'), pending: true),
                _list(_filter('active'), active: true),
                _list(_filter('done')),
              ],
            ),
    );
  }

  Widget _list(List<Map<String, dynamic>> items, {bool pending = false, bool active = false}) {
    if (items.isEmpty) {
      return const Center(child: Text('Nothing here yet', style: TextStyle(color: Colors.black54)));
    }
    return RefreshIndicator(
      onRefresh: _load,
      child: ListView.separated(
        padding: const EdgeInsets.all(12),
        itemCount: items.length,
        separatorBuilder: (_, __) => const SizedBox(height: 8),
        itemBuilder: (_, i) {
          final b = items[i];
          final scheduledAt = b['scheduledAt']?.toString();
          final date = scheduledAt != null ? DateTime.tryParse(scheduledAt) : null;
          final busy = _busyId == b['id']?.toString();
          final status = b['status']?.toString() ?? 'pending';

          return Card(
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      const CircleAvatar(
                        backgroundColor: MediWyzColors.sky,
                        child: Icon(Icons.person, color: MediWyzColors.navy),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              b['patientName']?.toString() ?? 'Patient',
                              style: const TextStyle(fontWeight: FontWeight.w600, color: MediWyzColors.navy),
                            ),
                            Text(
                              b['serviceName']?.toString() ?? b['type']?.toString() ?? 'Consultation',
                              style: const TextStyle(fontSize: 12, color: Colors.black54),
                            ),
                          ],
                        ),
                      ),
                      _StatusChip(status: status),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      const Icon(Icons.schedule, size: 14, color: Colors.black45),
                      const SizedBox(width: 4),
                      Text(
                        date == null
                            ? 'No date'
                            : '${date.day.toString().padLeft(2, '0')}/${date.month.toString().padLeft(2, '0')} at ${date.hour.toString().padLeft(2, '0')}:${date.minute.toString().padLeft(2, '0')}',
                        style: const TextStyle(fontSize: 12, color: Colors.black54),
                      ),
                      if (b['price'] != null) ...[
                        const Spacer(),
                        Text('${b['price']} MUR', style: const TextStyle(fontWeight: FontWeight.w600, color: MediWyzColors.teal)),
                      ],
                    ],
                  ),
                  if (b['reason'] != null && b['reason'].toString().isNotEmpty) ...[
                    const SizedBox(height: 6),
                    Text(b['reason'].toString(), style: const TextStyle(fontSize: 12, color: Colors.black87)),
                  ],
                  if (pending || active) ...[
                    const SizedBox(height: 10),
                    Row(
                      children: [
                        if (pending) ...[
                          Expanded(
                            child: FilledButton.icon(
                              onPressed: busy ? null : () => _action(b, 'accept'),
                              icon: const Icon(Icons.check, size: 16),
                              label: const Text('Accept'),
                              style: FilledButton.styleFrom(backgroundColor: Colors.green),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: OutlinedButton.icon(
                              onPressed: busy ? null : () => _action(b, 'deny'),
                              icon: const Icon(Icons.close, size: 16),
                              label: const Text('Deny'),
                              style: OutlinedButton.styleFrom(foregroundColor: Colors.red),
                            ),
                          ),
                        ] else if (active) ...[
                          Expanded(
                            child: FilledButton.icon(
                              onPressed: busy ? null : () => _action(b, 'complete'),
                              icon: const Icon(Icons.check_circle, size: 16),
                              label: const Text('Complete'),
                              style: FilledButton.styleFrom(backgroundColor: MediWyzColors.teal),
                            ),
                          ),
                        ],
                      ],
                    ),
                  ],
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  @override
  void dispose() {
    _tabs.dispose();
    super.dispose();
  }
}

class _StatusChip extends StatelessWidget {
  final String status;
  const _StatusChip({required this.status});
  @override
  Widget build(BuildContext context) {
    final (color, label) = switch (status) {
      'pending' => (Colors.orange, 'Pending'),
      'accepted' || 'confirmed' => (MediWyzColors.teal, 'Accepted'),
      'in_progress' || 'dispatched' || 'en_route' => (Colors.blue, 'In progress'),
      'completed' || 'resolved' => (Colors.green, 'Completed'),
      'cancelled' || 'denied' => (Colors.red, 'Cancelled'),
      _ => (Colors.grey, status),
    };
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(color: color.withValues(alpha: 0.15), borderRadius: BorderRadius.circular(10)),
      child: Text(label, style: TextStyle(color: color, fontSize: 10, fontWeight: FontWeight.w600)),
    );
  }
}
