import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../api/client.dart';
import '../theme/mediwyz_theme.dart';
import '../widgets/booking_timeline.dart';
import '../widgets/workflow_action_buttons.dart';
import '../widgets/reschedule_dialog.dart';
import '../widgets/review_dialog.dart';
import '../widgets/skeleton.dart';

/// Booking detail — status + timeline + action buttons, all backed by
/// the workflow engine. Fetches `/workflow/instances/{id}` which returns
/// `{ instance, state, timeline }`.
class BookingDetailScreen extends ConsumerStatefulWidget {
  final String workflowInstanceId;
  const BookingDetailScreen({super.key, required this.workflowInstanceId});
  @override
  ConsumerState<BookingDetailScreen> createState() => _BookingDetailScreenState();
}

class _BookingDetailScreenState extends ConsumerState<BookingDetailScreen> {
  Map<String, dynamic>? _instance;
  Map<String, dynamic>? _state;
  List<Map<String, dynamic>> _timeline = [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() { _loading = true; _error = null; });
    try {
      final res = await ApiClient.instance.get('/workflow/instances/${widget.workflowInstanceId}');
      final data = (res.data as Map?)?['data'] as Map?;
      if (data == null) throw Exception('No data');
      _instance = data['instance'] is Map ? Map<String, dynamic>.from(data['instance'] as Map) : null;
      _state = data['state'] is Map ? Map<String, dynamic>.from(data['state'] as Map) : null;
      final tl = data['timeline'] as List?;
      _timeline = tl?.map((e) => Map<String, dynamic>.from(e as Map)).toList() ?? [];
    } catch (e) {
      _error = 'Unable to load booking — try again?';
    }
    if (mounted) setState(() => _loading = false);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Booking', style: TextStyle(fontWeight: FontWeight.bold)),
      ),
      body: RefreshIndicator(
        onRefresh: _load,
        child: _loading
            ? const Padding(padding: EdgeInsets.all(16), child: SkeletonList(lineCount: 6))
            : _error != null
                ? _buildError()
                : _buildBody(),
      ),
    );
  }

  Widget _buildError() {
    return ListView(
      padding: const EdgeInsets.all(20),
      children: [
        EmptyState(
          icon: Icons.error_outline,
          title: 'We couldn\'t load this booking',
          description: _error,
          action: ElevatedButton(
            onPressed: _load,
            style: ElevatedButton.styleFrom(backgroundColor: MediWyzColors.teal),
            child: const Text('Try again'),
          ),
        ),
      ],
    );
  }

  Widget _buildBody() {
    final currentStatus = _state?['currentStatus']?.toString() ?? '';
    final currentLabel = _state?['currentStepLabel']?.toString()
        ?? _state?['currentStep']?['label']?.toString()
        ?? currentStatus;
    final expectedMin = (_state?['currentStep']?['expectedDurationMinutes'] as num?)?.toInt();
    final actionsRaw = _state?['availableActions'] as List? ?? [];
    final actions = actionsRaw.map((e) => Map<String, dynamic>.from(e as Map)).toList();

    return ListView(
      padding: const EdgeInsets.all(16),
      physics: const AlwaysScrollableScrollPhysics(),
      children: [
        _buildStatusHeader(currentLabel, currentStatus, expectedMin),
        const SizedBox(height: 14),
        // Reschedule button — only visible while booking is editable.
        if (_canReschedule(currentStatus)) ...[
          OutlinedButton.icon(
            style: OutlinedButton.styleFrom(
              foregroundColor: MediWyzColors.teal,
              padding: const EdgeInsets.symmetric(vertical: 12),
            ),
            icon: const Icon(Icons.event_repeat, size: 16),
            label: const Text('Reschedule'),
            onPressed: _handleReschedule,
          ),
          const SizedBox(height: 14),
        ],
        if (actions.isNotEmpty) ...[
          const _SectionLabel('What you can do'),
          WorkflowActionButtons(
            workflowInstanceId: widget.workflowInstanceId,
            actions: actions,
            onTransition: _onWorkflowTransition,
          ),
          const SizedBox(height: 14),
        ],
        const _SectionLabel('Timeline'),
        Card(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(14, 16, 14, 6),
            child: BookingTimeline(steps: _timeline, currentStatus: currentStatus),
          ),
        ),
      ],
    );
  }

  Widget _buildStatusHeader(String label, String code, int? expectedMin) {
    final providerName = (_instance?['providerName']
            ?? _instance?['provider']?['firstName'])?.toString()
        ?? '';
    final service = _instance?['serviceName']?.toString() ?? '';

    return Card(
      color: MediWyzColors.sky.withValues(alpha: 0.28),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (providerName.isNotEmpty)
              Text(providerName, style: const TextStyle(fontWeight: FontWeight.w500, color: Colors.black87)),
            if (service.isNotEmpty)
              Padding(
                padding: const EdgeInsets.only(top: 2),
                child: Text(service, style: const TextStyle(fontSize: 12, color: Colors.black54)),
              ),
            const SizedBox(height: 12),
            Row(children: [
              const Icon(Icons.circle, size: 10, color: MediWyzColors.teal),
              const SizedBox(width: 8),
              Expanded(
                child: Text(label,
                  style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: MediWyzColors.navy)),
              ),
            ]),
            if (expectedMin != null) ...[
              const SizedBox(height: 6),
              Text(
                'Usually ready within ${_humanizeDuration(expectedMin)}',
                style: const TextStyle(fontSize: 12, color: Colors.black54),
              ),
            ],
          ],
        ),
      ),
    );
  }

  String _humanizeDuration(int minutes) {
    if (minutes < 60) return '$minutes min';
    final hours = (minutes / 60).floor();
    if (hours < 24) return '$hours h';
    final days = (hours / 24).floor();
    return '$days day${days > 1 ? 's' : ''}';
  }

  // Reschedule is allowed while the booking is still editable.
  bool _canReschedule(String status) =>
      const {'pending', 'accepted', 'confirmed'}.contains(status);

  Future<void> _handleReschedule() async {
    final bookingId = _instance?['id']?.toString();
    final bookingType = _instance?['type']?.toString() ?? 'ServiceBooking';
    if (bookingId == null) return;
    final ok = await showDialog<bool>(
      context: context,
      builder: (_) => RescheduleDialog(bookingId: bookingId, bookingType: bookingType),
    );
    if (ok == true && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Booking rescheduled'), backgroundColor: Colors.green),
      );
      _load();
    }
  }

  // After workflow transition, refresh — and if the booking just completed,
  // prompt the patient to leave a review.
  Future<void> _onWorkflowTransition() async {
    final previousStatus = _state?['currentStatus']?.toString() ?? '';
    await _load();
    final newStatus = _state?['currentStatus']?.toString() ?? '';
    final providerId = _instance?['providerId']?.toString() ?? _instance?['provider']?['id']?.toString();
    if (newStatus == 'completed' && previousStatus != 'completed' && providerId != null && mounted) {
      final providerName = (_instance?['providerName']
              ?? '${_instance?['provider']?['firstName'] ?? ''}')
          .toString();
      await showReviewDialog(
        context: context,
        providerId: providerId,
        providerName: providerName.isEmpty ? null : providerName,
      );
    }
  }
}

class _SectionLabel extends StatelessWidget {
  final String text;
  const _SectionLabel(this.text);
  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 6),
        child: Text(
          text.toUpperCase(),
          style: const TextStyle(
            fontSize: 11, fontWeight: FontWeight.w600,
            color: Colors.black54, letterSpacing: 0.5,
          ),
        ),
      );
}
