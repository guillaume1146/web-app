import 'package:flutter/material.dart';
import '../theme/mediwyz_theme.dart';

/// Booking / workflow timeline — past → current → next.
/// Semantic parity with `components/workflow/WorkflowTimeline.tsx` on web.
/// Feeds off the `WorkflowStepLog` entries returned by the backend.
class BookingTimeline extends StatelessWidget {
  final List<Map<String, dynamic>> steps;
  final String currentStatus;

  const BookingTimeline({
    super.key,
    required this.steps,
    required this.currentStatus,
  });

  @override
  Widget build(BuildContext context) {
    if (steps.isEmpty) {
      return const Padding(
        padding: EdgeInsets.symmetric(vertical: 12),
        child: Text('No status history yet.', style: TextStyle(color: Colors.black54)),
      );
    }
    return Column(
      children: [
        for (int i = 0; i < steps.length; i++)
          _TimelineRow(
            step: steps[i],
            isLast: i == steps.length - 1,
            isCurrent: steps[i]['toStatus']?.toString() == currentStatus,
          ),
      ],
    );
  }
}

class _TimelineRow extends StatelessWidget {
  final Map<String, dynamic> step;
  final bool isLast;
  final bool isCurrent;
  const _TimelineRow({required this.step, required this.isLast, required this.isCurrent});

  Color _dotColor() {
    final toStatus = step['toStatus']?.toString() ?? '';
    if (!isCurrent && !isLast) return Colors.grey.shade400;
    if (toStatus == 'completed' || toStatus == 'resolved') return Colors.green;
    if (toStatus == 'cancelled') return Colors.red;
    if (toStatus == 'pending') return Colors.amber;
    if (toStatus.contains('progress') || toStatus.contains('consultation')) return MediWyzColors.teal;
    return MediWyzColors.teal;
  }

  IconData _icon() {
    final toStatus = step['toStatus']?.toString() ?? '';
    if (toStatus == 'completed' || toStatus == 'resolved') return Icons.check;
    if (toStatus == 'cancelled') return Icons.close;
    if (toStatus.contains('call') || toStatus.contains('video')) return Icons.videocam;
    if (toStatus.contains('stock') || toStatus.contains('preparing')) return Icons.inventory_2_outlined;
    if (step['contentType'] != null) return Icons.description_outlined;
    if (toStatus.contains('progress') || toStatus.contains('consultation')) return Icons.play_arrow;
    return Icons.schedule;
  }

  String _when() {
    final raw = step['createdAt']?.toString() ?? '';
    final dt = DateTime.tryParse(raw);
    if (dt == null) return '';
    final local = dt.toLocal();
    return '${local.day}/${local.month} · ${local.hour.toString().padLeft(2, '0')}:${local.minute.toString().padLeft(2, '0')}';
  }

  @override
  Widget build(BuildContext context) {
    final label = step['label']?.toString() ?? step['toStatus']?.toString() ?? 'Update';
    final message = step['message']?.toString();
    final color = _dotColor();

    return IntrinsicHeight(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Dot + vertical line
          Column(
            children: [
              Container(
                width: 32, height: 32,
                decoration: BoxDecoration(
                  color: color,
                  shape: BoxShape.circle,
                  boxShadow: [BoxShadow(color: color.withValues(alpha: 0.3), blurRadius: isCurrent ? 10 : 0)],
                ),
                alignment: Alignment.center,
                child: Icon(_icon(), color: Colors.white, size: 16),
              ),
              if (!isLast)
                Expanded(
                  child: Container(width: 2, color: Colors.grey.shade300),
                ),
            ],
          ),
          const SizedBox(width: 12),
          // Content
          Expanded(
            child: Padding(
              padding: const EdgeInsets.only(bottom: 14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    label,
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: isCurrent ? FontWeight.bold : FontWeight.w600,
                      color: isCurrent ? MediWyzColors.navy : Colors.black87,
                    ),
                  ),
                  if (message != null && message.isNotEmpty) ...[
                    const SizedBox(height: 2),
                    Text(message, style: const TextStyle(fontSize: 12, color: Colors.black54)),
                  ],
                  const SizedBox(height: 4),
                  Text(
                    _when(),
                    style: const TextStyle(fontSize: 11, color: Colors.black45, fontFeatures: [FontFeature.tabularFigures()]),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
