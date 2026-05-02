import 'package:flutter/material.dart';
import '../api/client.dart';
import '../theme/mediwyz_theme.dart';

/// Web-parity time slot picker — 7-day horizontal date strip + period-grouped
/// slots (Morning / Afternoon / Evening). Fetches `/bookings/available-slots`.
///
/// Emits a `DateTime` when the user picks a slot.
class TimeSlotPicker extends StatefulWidget {
  final String providerUserId;
  final DateTime? initialDate;
  final void Function(DateTime? scheduledAt) onSelected;

  const TimeSlotPicker({
    super.key,
    required this.providerUserId,
    required this.onSelected,
    this.initialDate,
  });

  @override
  State<TimeSlotPicker> createState() => _TimeSlotPickerState();
}

class _TimeSlotPickerState extends State<TimeSlotPicker> {
  late DateTime _selectedDate;
  String? _selectedSlotStart; // "HH:MM"
  List<Map<String, String>> _slots = [];
  bool _loading = false;

  @override
  void initState() {
    super.initState();
    final now = DateTime.now();
    _selectedDate = widget.initialDate ?? DateTime(now.year, now.month, now.day + 1);
    _loadSlots();
  }

  Future<void> _loadSlots() async {
    setState(() { _loading = true; _slots = []; _selectedSlotStart = null; });
    widget.onSelected(null);
    try {
      final res = await ApiClient.instance.get('/bookings/available-slots', queryParameters: {
        'providerUserId': widget.providerUserId,
        'date': _dateKey(_selectedDate),
      });
      final data = (res.data as Map?)?['data'] as List?;
      setState(() {
        _slots = data?.map((e) {
          final m = e as Map;
          return <String, String>{
            'startTime': m['startTime']?.toString() ?? '',
            'endTime': m['endTime']?.toString() ?? '',
          };
        }).toList() ?? [];
      });
    } catch (_) { /* fall through to empty list */ }
    finally { if (mounted) setState(() => _loading = false); }
  }

  String _dateKey(DateTime d) =>
      '${d.year.toString().padLeft(4, '0')}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';

  /// Group slots into Morning / Afternoon / Evening buckets by start-hour.
  Map<String, List<Map<String, String>>> _bucketSlots() {
    final morning = <Map<String, String>>[];
    final afternoon = <Map<String, String>>[];
    final evening = <Map<String, String>>[];
    for (final s in _slots) {
      final hour = int.tryParse(s['startTime']?.split(':').first ?? '0') ?? 0;
      if (hour < 12) {
        morning.add(s);
      } else if (hour < 17) {
        afternoon.add(s);
      } else {
        evening.add(s);
      }
    }
    return {'Morning': morning, 'Afternoon': afternoon, 'Evening': evening};
  }

  @override
  Widget build(BuildContext context) {
    final now = DateTime.now();
    final days = List.generate(14, (i) => DateTime(now.year, now.month, now.day + i));
    final buckets = _bucketSlots();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // 14-day date strip
        SizedBox(
          height: 74,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 4),
            itemCount: days.length,
            separatorBuilder: (_, __) => const SizedBox(width: 6),
            itemBuilder: (_, i) {
              final d = days[i];
              final selected = _dateKey(d) == _dateKey(_selectedDate);
              return GestureDetector(
                onTap: () {
                  setState(() => _selectedDate = d);
                  _loadSlots();
                },
                child: Container(
                  width: 56,
                  decoration: BoxDecoration(
                    color: selected ? MediWyzColors.teal : MediWyzColors.sky.withValues(alpha: 0.2),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(
                        _dayLabel(d),
                        style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.w600,
                          color: selected ? Colors.white70 : Colors.black54,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        '${d.day}',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                          color: selected ? Colors.white : MediWyzColors.navy,
                        ),
                      ),
                      Text(
                        _monthShort(d.month),
                        style: TextStyle(
                          fontSize: 10,
                          color: selected ? Colors.white70 : Colors.black54,
                        ),
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
        ),
        const SizedBox(height: 14),

        // Loading / empty
        if (_loading)
          const Padding(
            padding: EdgeInsets.all(20),
            child: Center(child: CircularProgressIndicator()),
          )
        else if (_slots.isEmpty)
          Padding(
            padding: const EdgeInsets.all(20),
            child: Center(
              child: Column(
                children: [
                  Icon(Icons.event_busy, size: 40, color: Colors.grey.shade400),
                  const SizedBox(height: 6),
                  const Text('No slots available on this day', style: TextStyle(color: Colors.black54)),
                ],
              ),
            ),
          )
        else
          // Three period sections
          for (final period in ['Morning', 'Afternoon', 'Evening'])
            if (buckets[period]!.isNotEmpty) ...[
              Padding(
                padding: const EdgeInsets.fromLTRB(4, 8, 4, 6),
                child: Row(
                  children: [
                    Icon(_periodIcon(period), size: 16, color: MediWyzColors.teal),
                    const SizedBox(width: 6),
                    Text(period.toUpperCase(),
                        style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: Colors.black54, letterSpacing: 0.5)),
                  ],
                ),
              ),
              Wrap(
                spacing: 6,
                runSpacing: 6,
                children: buckets[period]!.map((slot) {
                  final t = slot['startTime'] ?? '';
                  final selected = t == _selectedSlotStart;
                  return ChoiceChip(
                    label: Text(t, style: TextStyle(fontSize: 13, color: selected ? Colors.white : MediWyzColors.navy)),
                    selected: selected,
                    onSelected: (_) {
                      setState(() => _selectedSlotStart = t);
                      final parts = t.split(':');
                      final dt = DateTime(
                        _selectedDate.year, _selectedDate.month, _selectedDate.day,
                        int.tryParse(parts[0]) ?? 0, int.tryParse(parts.elementAtOrNull(1) ?? '0') ?? 0,
                      );
                      widget.onSelected(dt);
                    },
                    selectedColor: MediWyzColors.teal,
                    backgroundColor: MediWyzColors.sky.withValues(alpha: 0.2),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(8),
                      side: BorderSide(color: selected ? MediWyzColors.teal : Colors.transparent),
                    ),
                  );
                }).toList(),
              ),
            ],
      ],
    );
  }

  String _dayLabel(DateTime d) {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    return days[(d.weekday - 1) % 7];
  }

  String _monthShort(int m) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months[m - 1];
  }

  IconData _periodIcon(String period) => switch (period) {
    'Morning' => Icons.wb_sunny_outlined,
    'Afternoon' => Icons.wb_cloudy_outlined,
    _ => Icons.nightlight_outlined,
  };
}

extension<T> on List<T> {
  T? elementAtOrNull(int i) => i < 0 || i >= length ? null : this[i];
}
