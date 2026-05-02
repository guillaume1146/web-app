import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../api/client.dart';
import '../theme/mediwyz_theme.dart';

/// Flutter mirror of web `StreakTile`. Shown at the top of the health
/// tracker Dashboard tab. One-tap check-in — backend is idempotent per
/// day, extends streak if yesterday was logged.
class StreakTile extends StatefulWidget {
  const StreakTile({super.key});
  @override
  State<StreakTile> createState() => _StreakTileState();
}

class _StreakTileState extends State<StreakTile> {
  int _current = 0;
  int _longest = 0;
  bool _checkedInToday = false;
  bool _busy = false;
  bool _loaded = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final res = await ApiClient.instance.get('/health-streak');
      final data = (res.data as Map?)?['data'] as Map?;
      if (data != null && mounted) {
        setState(() {
          _current = (data['currentStreak'] as num?)?.toInt() ?? 0;
          _longest = (data['longestStreak'] as num?)?.toInt() ?? 0;
          _checkedInToday = data['checkedInToday'] == true;
          _loaded = true;
        });
      }
    } catch (_) { if (mounted) setState(() => _loaded = true); }
  }

  Future<void> _checkIn() async {
    if (_busy) return;
    HapticFeedback.selectionClick();
    setState(() => _busy = true);
    try {
      final res = await ApiClient.instance.post('/health-streak/check-in');
      final data = (res.data as Map?)?['data'] as Map?;
      if (data != null && mounted) {
        setState(() {
          _current = (data['currentStreak'] as num?)?.toInt() ?? _current;
          _longest = (data['longestStreak'] as num?)?.toInt() ?? _longest;
          _checkedInToday = true;
        });
      }
    } catch (_) { /* silent */ }
    if (mounted) setState(() => _busy = false);
  }

  @override
  Widget build(BuildContext context) {
    if (!_loaded) return const SizedBox.shrink();
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        gradient: LinearGradient(colors: [Colors.orange.shade50, Colors.amber.shade50]),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.amber.shade100),
      ),
      child: Row(children: [
        Container(
          padding: const EdgeInsets.all(10),
          decoration: BoxDecoration(color: Colors.white, shape: BoxShape.circle, boxShadow: [
            BoxShadow(color: Colors.amber.withValues(alpha: 0.3), blurRadius: 8),
          ]),
          child: const Icon(Icons.local_fire_department, color: Colors.orange, size: 28),
        ),
        const SizedBox(width: 14),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(crossAxisAlignment: CrossAxisAlignment.baseline, textBaseline: TextBaseline.alphabetic, children: [
                Text('$_current', style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: MediWyzColors.navy)),
                const SizedBox(width: 6),
                const Text('day streak', style: TextStyle(fontSize: 13, color: Colors.black54)),
              ]),
              Row(children: [
                const Icon(Icons.emoji_events, size: 12, color: Colors.amber),
                const SizedBox(width: 3),
                Text('Longest: $_longest days', style: const TextStyle(fontSize: 11, color: Colors.black54)),
              ]),
            ],
          ),
        ),
        if (_checkedInToday)
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
            decoration: BoxDecoration(color: Colors.green.shade100, borderRadius: BorderRadius.circular(14)),
            child: Text('✓ Today', style: TextStyle(fontSize: 11, color: Colors.green.shade700, fontWeight: FontWeight.bold)),
          )
        else
          FilledButton(
            onPressed: _busy ? null : _checkIn,
            style: FilledButton.styleFrom(backgroundColor: Colors.amber.shade600, padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8)),
            child: _busy
                ? const SizedBox(height: 14, width: 14, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                : const Text('Check in', style: TextStyle(fontWeight: FontWeight.bold)),
          ),
      ]),
    );
  }
}
