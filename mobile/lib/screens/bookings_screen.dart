import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../api/client.dart';
import '../services/auth_service.dart';
import '../theme/mediwyz_theme.dart';
import '../widgets/review_dialog.dart';

/// Unified bookings list — works for patient (role=patient) or any provider (role=provider).
/// Role determined from current user automatically.
class BookingsScreen extends ConsumerStatefulWidget {
  const BookingsScreen({super.key});
  @override
  ConsumerState<BookingsScreen> createState() => _BookingsScreenState();
}

class _BookingsScreenState extends ConsumerState<BookingsScreen> {
  List<Map<String, dynamic>> _bookings = [];
  bool _loading = true;

  // Non-provider types act as patients; everyone else is a provider.
  static const _patientTypes = {'patient', 'corporate', 'insurance', 'referral-partner', 'regional-admin', 'admin'};

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final user = ref.read(authProvider).user;
    if (user == null) return;
    final role = _patientTypes.contains(user['userType']) ? 'patient' : 'provider';
    try {
      final res = await ApiClient.instance.get(
        '/bookings/unified',
        queryParameters: {'role': role},
      );
      final data = (res.data as Map?)?['data'] as List?;
      setState(() {
        _bookings = data?.map((e) => Map<String, dynamic>.from(e as Map)).toList() ?? [];
        _loading = false;
      });
    } catch (_) {
      setState(() => _loading = false);
    }
  }

  Color _statusColor(String status) {
    switch (status) {
      case 'completed':
      case 'resolved':
        return Colors.green;
      case 'pending':
        return Colors.orange;
      case 'cancelled':
      case 'denied':
        return Colors.red;
      default:
        return MediWyzColors.teal;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('My Bookings', style: TextStyle(fontWeight: FontWeight.bold))),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _load,
              child: _bookings.isEmpty
                  ? ListView(children: const [SizedBox(height: 200), Center(child: Text('No bookings yet'))])
                  : ListView.separated(
                      padding: const EdgeInsets.all(12),
                      itemCount: _bookings.length,
                      separatorBuilder: (_, __) => const SizedBox(height: 8),
                      itemBuilder: (_, i) {
                        final b = _bookings[i];
                        final scheduledAt = b['scheduledAt']?.toString();
                        final date = scheduledAt != null
                            ? DateTime.tryParse(scheduledAt)
                            : null;
                        final status = b['status']?.toString() ?? 'pending';
                        return Card(
                          child: ListTile(
                            leading: Container(
                              width: 46,
                              height: 46,
                              decoration: BoxDecoration(
                                color: _statusColor(status).withValues(alpha: 0.15),
                                borderRadius: BorderRadius.circular(10),
                              ),
                              child: Icon(
                                Icons.event_note,
                                color: _statusColor(status),
                              ),
                            ),
                            title: Text(
                              b['serviceName']?.toString() ?? b['providerName']?.toString() ?? 'Booking',
                              style: const TextStyle(fontWeight: FontWeight.w600),
                            ),
                            subtitle: Text(
                              date != null
                                  ? '${date.day.toString().padLeft(2, '0')}/${date.month.toString().padLeft(2, '0')}/${date.year} — ${date.hour.toString().padLeft(2, '0')}:${date.minute.toString().padLeft(2, '0')}'
                                  : 'No date set',
                            ),
                            trailing: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                  decoration: BoxDecoration(
                                    color: _statusColor(status).withValues(alpha: 0.15),
                                    borderRadius: BorderRadius.circular(10),
                                  ),
                                  child: Text(
                                    status,
                                    style: TextStyle(
                                      fontSize: 10,
                                      color: _statusColor(status),
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                ),
                                if (status == 'completed' || status == 'resolved') ...[
                                  const SizedBox(width: 4),
                                  IconButton(
                                    icon: const Icon(Icons.star_border, color: Colors.amber, size: 20),
                                    tooltip: 'Review',
                                    onPressed: () async {
                                      final providerId = b['providerUserId']?.toString() ?? b['providerId']?.toString() ?? '';
                                      if (providerId.isEmpty) return;
                                      final submitted = await showReviewDialog(
                                        context: context,
                                        providerId: providerId,
                                        providerName: b['providerName']?.toString(),
                                      );
                                      if (submitted == true && mounted) {
                                        ScaffoldMessenger.of(context).showSnackBar(
                                          const SnackBar(content: Text('Thanks for your review'), backgroundColor: Colors.green),
                                        );
                                      }
                                    },
                                  ),
                                ],
                              ],
                            ),
                          ),
                        );
                      },
                    ),
            ),
    );
  }
}
