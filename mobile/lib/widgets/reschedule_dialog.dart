import 'package:flutter/material.dart';
import '../api/client.dart';
import '../theme/mediwyz_theme.dart';

/// Mirror of web `RescheduleModal`. Show with:
///   final ok = await showDialog<bool>(
///     context: context,
///     builder: (_) => RescheduleDialog(bookingId: ..., bookingType: ...),
///   );
class RescheduleDialog extends StatefulWidget {
  final String bookingId;
  final String bookingType;
  const RescheduleDialog({
    super.key,
    required this.bookingId,
    required this.bookingType,
  });

  @override
  State<RescheduleDialog> createState() => _RescheduleDialogState();
}

class _RescheduleDialogState extends State<RescheduleDialog> {
  DateTime? _date;
  TimeOfDay _time = const TimeOfDay(hour: 9, minute: 0);
  bool _busy = false;
  String? _error;

  Future<void> _pickDate() async {
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: _date ?? now.add(const Duration(days: 1)),
      firstDate: now,
      lastDate: now.add(const Duration(days: 365)),
    );
    if (picked != null) setState(() => _date = picked);
  }

  Future<void> _pickTime() async {
    final picked = await showTimePicker(context: context, initialTime: _time);
    if (picked != null) setState(() => _time = picked);
  }

  String get _dateLabel => _date == null
      ? 'Choose date'
      : '${_date!.year}-${_date!.month.toString().padLeft(2, '0')}-${_date!.day.toString().padLeft(2, '0')}';
  String get _timeLabel => '${_time.hour.toString().padLeft(2, '0')}:${_time.minute.toString().padLeft(2, '0')}';

  Future<void> _submit() async {
    if (_date == null) {
      setState(() => _error = 'Please pick a date');
      return;
    }
    setState(() { _busy = true; _error = null; });
    try {
      final res = await ApiClient.instance.post('/bookings/reschedule', data: {
        'bookingId': widget.bookingId,
        'bookingType': widget.bookingType,
        'newDate': _dateLabel,
        'newTime': _timeLabel,
      });
      final ok = (res.data as Map?)?['success'] == true;
      if (!ok) throw Exception((res.data as Map?)?['message']?.toString() ?? 'Failed');
      if (mounted) Navigator.of(context).pop(true);
    } catch (e) {
      if (mounted) setState(() => _error = 'Network error — try again');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      titlePadding: const EdgeInsets.fromLTRB(24, 20, 24, 0),
      title: const Text('Reschedule booking', style: TextStyle(fontWeight: FontWeight.bold)),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Text(
            'Your provider will be notified of the change.',
            style: TextStyle(fontSize: 12, color: Colors.black54),
          ),
          const SizedBox(height: 16),
          OutlinedButton.icon(
            onPressed: _pickDate,
            icon: const Icon(Icons.calendar_today_outlined, size: 16),
            label: Text(_dateLabel),
            style: OutlinedButton.styleFrom(
              padding: const EdgeInsets.symmetric(vertical: 12),
              alignment: Alignment.centerLeft,
            ),
          ),
          const SizedBox(height: 8),
          OutlinedButton.icon(
            onPressed: _pickTime,
            icon: const Icon(Icons.access_time, size: 16),
            label: Text(_timeLabel),
            style: OutlinedButton.styleFrom(
              padding: const EdgeInsets.symmetric(vertical: 12),
              alignment: Alignment.centerLeft,
            ),
          ),
          if (_error != null) ...[
            const SizedBox(height: 10),
            Text(_error!, style: const TextStyle(color: Colors.red, fontSize: 12)),
          ],
        ],
      ),
      actions: [
        TextButton(
          onPressed: _busy ? null : () => Navigator.of(context).pop(false),
          child: const Text('Cancel'),
        ),
        FilledButton(
          style: FilledButton.styleFrom(backgroundColor: MediWyzColors.teal),
          onPressed: _busy ? null : _submit,
          child: _busy
              ? const SizedBox(height: 16, width: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
              : const Text('Reschedule'),
        ),
      ],
    );
  }
}
