import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../api/client.dart';
import '../theme/mediwyz_theme.dart';
import '../widgets/streak_tile.dart';

class HealthTrackerScreen extends ConsumerStatefulWidget {
  const HealthTrackerScreen({super.key});
  @override
  ConsumerState<HealthTrackerScreen> createState() => _HealthTrackerScreenState();
}

class _HealthTrackerScreenState extends ConsumerState<HealthTrackerScreen> {
  Map<String, dynamic>? _dashboard;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final res = await ApiClient.instance.get('/ai/health-tracker/dashboard');
      final data = (res.data as Map?)?['data'];
      setState(() {
        _dashboard = data is Map ? Map<String, dynamic>.from(data) : null;
        _loading = false;
      });
    } catch (_) {
      setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final today = _dashboard?['today'] is Map ? Map<String, dynamic>.from(_dashboard!['today'] as Map) : {};
    final water = (today['water'] as num?)?.toDouble() ?? 0;
    final waterGoal = (today['waterGoal'] as num?)?.toDouble() ?? 8;
    final caloriesIn = (today['caloriesConsumed'] as num?)?.toDouble() ?? 0;
    final caloriesOut = (today['caloriesBurned'] as num?)?.toDouble() ?? 0;
    final sleepHrs = (today['sleepHours'] as num?)?.toDouble() ?? 0;

    return Scaffold(
      appBar: AppBar(title: const Text('Health Tracker', style: TextStyle(fontWeight: FontWeight.bold))),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _load,
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  const StreakTile(),
                  const SizedBox(height: 14),
                  const Padding(
                    padding: EdgeInsets.symmetric(horizontal: 4, vertical: 6),
                    child: Text('Today', style: TextStyle(fontWeight: FontWeight.w600, color: MediWyzColors.navy, fontSize: 16)),
                  ),
                  GridView.count(
                    crossAxisCount: 2,
                    crossAxisSpacing: 12,
                    mainAxisSpacing: 12,
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    childAspectRatio: 1.3,
                    children: [
                      _Tile(icon: Icons.water_drop, label: 'Water', value: '${water.toStringAsFixed(1)}/${waterGoal.toStringAsFixed(0)} cups', color: Colors.blue),
                      _Tile(icon: Icons.restaurant, label: 'Calories in', value: caloriesIn.toStringAsFixed(0), color: Colors.orange),
                      _Tile(icon: Icons.directions_run, label: 'Calories out', value: caloriesOut.toStringAsFixed(0), color: Colors.green),
                      _Tile(icon: Icons.bedtime, label: 'Sleep', value: '${sleepHrs.toStringAsFixed(1)} h', color: Colors.indigo),
                    ],
                  ),
                  const SizedBox(height: 16),
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(14),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('Log activity', style: TextStyle(fontWeight: FontWeight.w600, color: MediWyzColors.navy)),
                          const SizedBox(height: 10),
                          Wrap(
                            spacing: 8,
                            runSpacing: 8,
                            children: [
                              FilledButton.tonalIcon(
                                onPressed: () => _logWater(),
                                icon: const Icon(Icons.add),
                                label: const Text('+ Water'),
                              ),
                              FilledButton.tonalIcon(
                                onPressed: () => _logExercise(),
                                icon: const Icon(Icons.add),
                                label: const Text('+ Exercise'),
                              ),
                              FilledButton.tonalIcon(
                                onPressed: () => _logSleep(),
                                icon: const Icon(Icons.add),
                                label: const Text('+ Sleep'),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
    );
  }

  Future<void> _logWater() async {
    try {
      await ApiClient.instance.post('/ai/health-tracker/water', data: {'cups': 1, 'date': DateTime.now().toIso8601String().split('T').first});
    } catch (_) { /* swallow — UI will refresh regardless */ }
    _load();
  }

  Future<void> _logExercise() async {
    await showDialog(context: context, builder: (_) => _QuickExerciseDialog(onSubmit: (type, mins, cals) async {
      try {
        await ApiClient.instance.post('/ai/health-tracker/exercise', data: {
          'type': type, 'durationMinutes': mins, 'caloriesBurned': cals,
          'date': DateTime.now().toIso8601String().split('T').first,
        });
      } catch (_) {}
      _load();
    }));
  }

  Future<void> _logSleep() async {
    try {
      await ApiClient.instance.post('/ai/health-tracker/sleep', data: {
        'hours': 7.5,
        'quality': 'good',
        'date': DateTime.now().toIso8601String().split('T').first,
      });
    } catch (_) {}
    _load();
  }
}

class _Tile extends StatelessWidget {
  final IconData icon; final String label; final String value; final Color color;
  const _Tile({required this.icon, required this.label, required this.value, required this.color});
  @override
  Widget build(BuildContext context) => Card(
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(color: color.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(10)),
                child: Icon(icon, color: color),
              ),
              const Spacer(),
              Text(value, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18, color: MediWyzColors.navy)),
              Text(label, style: const TextStyle(color: Colors.black54, fontSize: 12)),
            ],
          ),
        ),
      );
}

class _QuickExerciseDialog extends StatefulWidget {
  final void Function(String type, int minutes, int calories) onSubmit;
  const _QuickExerciseDialog({required this.onSubmit});
  @override
  State<_QuickExerciseDialog> createState() => _QuickExerciseDialogState();
}

class _QuickExerciseDialogState extends State<_QuickExerciseDialog> {
  final _type = TextEditingController(text: 'Walking');
  final _minutes = TextEditingController(text: '30');
  final _calories = TextEditingController(text: '150');
  @override
  Widget build(BuildContext context) => AlertDialog(
        title: const Text('Log exercise'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(controller: _type, decoration: const InputDecoration(labelText: 'Activity')),
            TextField(controller: _minutes, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Minutes')),
            TextField(controller: _calories, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Calories')),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
          FilledButton(
            onPressed: () {
              widget.onSubmit(_type.text, int.tryParse(_minutes.text) ?? 30, int.tryParse(_calories.text) ?? 150);
              Navigator.pop(context);
            },
            child: const Text('Log'),
          ),
        ],
      );
}
