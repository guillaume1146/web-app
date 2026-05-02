import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../api/client.dart';
import '../theme/mediwyz_theme.dart';

/// Renders the "what can I do now?" actions for a booking's current workflow
/// step as a row of prominent buttons. Every transition flows through
/// `POST /api/workflow/transition`, matching the web `WorkflowActionButton`.
class WorkflowActionButtons extends StatefulWidget {
  final String workflowInstanceId;
  final List<Map<String, dynamic>> actions;
  final VoidCallback? onTransition;

  const WorkflowActionButtons({
    super.key,
    required this.workflowInstanceId,
    required this.actions,
    this.onTransition,
  });

  @override
  State<WorkflowActionButtons> createState() => _WorkflowActionButtonsState();
}

class _WorkflowActionButtonsState extends State<WorkflowActionButtons> {
  String? _busyAction;

  bool _isDestructive(String code) {
    final lower = code.toLowerCase();
    return lower.contains('cancel') || lower.contains('deny') || lower.contains('reject');
  }

  /// Show an AlertDialog for destructive actions (parity with the web
  /// confirmation modal). Consequence-aware copy: refund actions name the
  /// money movement, cancellations name the slot freeing. Returns true when
  /// the user confirms.
  Future<bool> _confirmDestructive(Map<String, dynamic> action) async {
    final label = action['label']?.toString() ?? action['action']?.toString() ?? 'this action';
    final code = action['action']?.toString() ?? '';
    final lower = code.toLowerCase();

    final lines = <String>[];
    if (lower.contains('cancel') || lower.contains('reject')) {
      lines.add('This booking will end and your slot will be freed.');
    }
    if (lower.contains('refund')) {
      lines.add('The patient will be refunded to their wallet.');
    }
    if (lines.isEmpty) {
      lines.add('This action cannot be undone.');
    }

    final result = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(label),
        content: Text(lines.join('\n\n')),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.red.shade600,
              foregroundColor: Colors.white,
            ),
            onPressed: () => Navigator.of(ctx).pop(true),
            child: const Text('Confirm'),
          ),
        ],
      ),
    );
    return result == true;
  }

  Future<void> _run(Map<String, dynamic> action) async {
    final actionCode = action['action']?.toString();
    if (actionCode == null || actionCode.isEmpty) return;

    if (_isDestructive(actionCode)) {
      final ok = await _confirmDestructive(action);
      if (!ok || !mounted) return;
    }

    HapticFeedback.selectionClick();
    setState(() => _busyAction = actionCode);

    try {
      final res = await ApiClient.instance.post('/workflow/transition', data: {
        'workflowInstanceId': widget.workflowInstanceId,
        'action': actionCode,
      });
      final ok = (res.data as Map?)?['success'] == true;
      if (!mounted) return;
      if (ok) {
        widget.onTransition?.call();
      } else {
        final msg = (res.data as Map?)?['message']?.toString() ?? 'Action failed';
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(msg), backgroundColor: Colors.red),
        );
      }
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Network error — try again'), backgroundColor: Colors.red),
      );
    } finally {
      if (mounted) setState(() => _busyAction = null);
    }
  }

  Color _colorFor(String actionCode, int index) {
    // Primary (first action) gets brand colour; destructive actions get red.
    final lower = actionCode.toLowerCase();
    if (lower.contains('cancel') || lower.contains('deny') || lower.contains('reject')) {
      return Colors.red.shade600;
    }
    return index == 0 ? MediWyzColors.teal : Colors.grey.shade700;
  }

  IconData _iconFor(String actionCode) {
    final lower = actionCode.toLowerCase();
    if (lower.contains('accept') || lower.contains('confirm') || lower.contains('approve')) return Icons.check_circle_outline;
    if (lower.contains('cancel') || lower.contains('deny') || lower.contains('reject')) return Icons.cancel_outlined;
    if (lower.contains('call') || lower.contains('join')) return Icons.videocam_outlined;
    if (lower.contains('complete') || lower.contains('finish')) return Icons.flag_outlined;
    if (lower.contains('start') || lower.contains('begin')) return Icons.play_arrow_outlined;
    if (lower.contains('pay')) return Icons.payment_outlined;
    return Icons.arrow_forward;
  }

  @override
  Widget build(BuildContext context) {
    if (widget.actions.isEmpty) return const SizedBox.shrink();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        for (int i = 0; i < widget.actions.length; i++) _buildButton(widget.actions[i], i),
      ],
    );
  }

  Widget _buildButton(Map<String, dynamic> action, int index) {
    final label = action['label']?.toString() ?? action['action']?.toString() ?? 'Action';
    final code = action['action']?.toString() ?? '';
    final color = _colorFor(code, index);
    final busy = _busyAction == code;
    final isPrimary = index == 0;
    final isDestructive = code.toLowerCase().contains('cancel') ||
        code.toLowerCase().contains('deny') ||
        code.toLowerCase().contains('reject');

    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: isPrimary && !isDestructive
          ? ElevatedButton.icon(
              onPressed: busy ? null : () => _run(action),
              style: ElevatedButton.styleFrom(
                backgroundColor: color,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              ),
              icon: busy
                  ? const SizedBox(height: 16, width: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                  : Icon(_iconFor(code), size: 18),
              label: Text(busy ? 'Working…' : label, style: const TextStyle(fontWeight: FontWeight.bold)),
            )
          : OutlinedButton.icon(
              onPressed: busy ? null : () => _run(action),
              style: OutlinedButton.styleFrom(
                foregroundColor: color,
                side: BorderSide(color: color.withValues(alpha: 0.5)),
                padding: const EdgeInsets.symmetric(vertical: 12),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              ),
              icon: busy
                  ? SizedBox(height: 14, width: 14, child: CircularProgressIndicator(strokeWidth: 2, color: color))
                  : Icon(_iconFor(code), size: 16),
              label: Text(busy ? 'Working…' : label),
            ),
    );
  }
}
