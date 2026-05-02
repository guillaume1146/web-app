import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../api/client.dart';
import '../theme/mediwyz_theme.dart';

/// AI-powered progress / history analysis. Pulls /ai/health-tracker/progress
/// which returns streaks, weekly calories, exercise trends, sleep averages.
class HealthInsightsScreen extends ConsumerStatefulWidget {
  const HealthInsightsScreen({super.key});
  @override
  ConsumerState<HealthInsightsScreen> createState() => _HealthInsightsScreenState();
}

class _HealthInsightsScreenState extends ConsumerState<HealthInsightsScreen> {
  Map<String, dynamic>? _progress;
  Map<String, dynamic>? _mealPlan;
  bool _loading = true;
  bool _generatingPlan = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final results = await Future.wait([
        ApiClient.instance.get('/ai/health-tracker/progress'),
        ApiClient.instance.get('/ai/health-tracker/meal-plan'),
      ]);
      setState(() {
        final p = (results[0].data as Map?)?['data'];
        _progress = p is Map ? Map<String, dynamic>.from(p) : null;
        final m = (results[1].data as Map?)?['data'];
        _mealPlan = m is Map ? Map<String, dynamic>.from(m) : null;
        _loading = false;
      });
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _generateMealPlan() async {
    setState(() => _generatingPlan = true);
    try {
      await ApiClient.instance.post('/ai/health-tracker/meal-plan/generate');
      await _load();
    } catch (_) {}
    finally { if (mounted) setState(() => _generatingPlan = false); }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Insights', style: TextStyle(fontWeight: FontWeight.bold))),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _load,
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  _SectionHeader(title: 'This week', icon: Icons.trending_up),
                  Row(
                    children: [
                      _Stat(label: 'Streak', value: '${_progress?['streakDays'] ?? 0}', unit: 'days', color: Colors.orange),
                      const SizedBox(width: 8),
                      _Stat(label: 'Calories avg', value: '${_progress?['avgCalories'] ?? 0}', unit: 'kcal', color: Colors.red),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      _Stat(label: 'Exercise', value: '${_progress?['exerciseMinutes'] ?? 0}', unit: 'min', color: Colors.green),
                      const SizedBox(width: 8),
                      _Stat(label: 'Sleep avg', value: '${(_progress?['avgSleepHours'] ?? 0).toStringAsFixed(1)}', unit: 'h', color: Colors.indigo),
                    ],
                  ),

                  if (_progress?['aiSummary'] != null) ...[
                    const SizedBox(height: 16),
                    _SectionHeader(title: 'AI analysis', icon: Icons.auto_awesome),
                    Card(
                      color: MediWyzColors.sky.withValues(alpha: 0.12),
                      child: Padding(
                        padding: const EdgeInsets.all(14),
                        child: Text(_progress!['aiSummary'].toString(), style: const TextStyle(fontSize: 14, height: 1.5, color: MediWyzColors.navy)),
                      ),
                    ),
                  ],

                  const SizedBox(height: 16),
                  _SectionHeader(title: 'Meal plan', icon: Icons.restaurant),
                  if (_mealPlan == null || (_mealPlan!['days'] as List?)?.isEmpty == true)
                    Card(
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          children: [
                            const Icon(Icons.restaurant_menu, size: 40, color: Colors.black45),
                            const SizedBox(height: 8),
                            const Text('No meal plan yet', style: TextStyle(color: Colors.black54)),
                            const SizedBox(height: 12),
                            ElevatedButton.icon(
                              onPressed: _generatingPlan ? null : _generateMealPlan,
                              style: ElevatedButton.styleFrom(backgroundColor: MediWyzColors.teal),
                              icon: _generatingPlan
                                  ? const SizedBox(height: 18, width: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                                  : const Icon(Icons.auto_awesome),
                              label: Text(_generatingPlan ? 'Generating…' : 'Generate with AI'),
                            ),
                          ],
                        ),
                      ),
                    )
                  else
                    ...((_mealPlan!['days'] as List).take(3).map((day) {
                      final d = Map<String, dynamic>.from(day as Map);
                      return Card(
                        margin: const EdgeInsets.only(bottom: 8),
                        child: Padding(
                          padding: const EdgeInsets.all(14),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(d['day']?.toString() ?? 'Day', style: const TextStyle(fontWeight: FontWeight.bold, color: MediWyzColors.navy)),
                              const SizedBox(height: 8),
                              for (final meal in ['breakfast', 'lunch', 'dinner'])
                                if (d[meal] != null) ...[
                                  Row(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Icon(_mealIcon(meal), size: 14, color: MediWyzColors.teal),
                                      const SizedBox(width: 6),
                                      Expanded(
                                        child: Text('${meal.substring(0, 1).toUpperCase()}${meal.substring(1)}: ${d[meal]}',
                                            style: const TextStyle(fontSize: 13)),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 4),
                                ],
                            ],
                          ),
                        ),
                      );
                    })),
                ],
              ),
            ),
    );
  }

  IconData _mealIcon(String meal) => switch (meal) {
    'breakfast' => Icons.free_breakfast_outlined,
    'lunch' => Icons.lunch_dining_outlined,
    _ => Icons.dinner_dining_outlined,
  };
}

class _SectionHeader extends StatelessWidget {
  final String title; final IconData icon;
  const _SectionHeader({required this.title, required this.icon});
  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 8),
    child: Row(children: [
      Icon(icon, size: 18, color: MediWyzColors.teal),
      const SizedBox(width: 6),
      Text(title, style: const TextStyle(fontWeight: FontWeight.w600, color: MediWyzColors.navy, fontSize: 16)),
    ]),
  );
}

class _Stat extends StatelessWidget {
  final String label; final String value; final String unit; final Color color;
  const _Stat({required this.label, required this.value, required this.unit, required this.color});
  @override
  Widget build(BuildContext context) => Expanded(
    child: Card(
      margin: EdgeInsets.zero,
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(crossAxisAlignment: CrossAxisAlignment.baseline, textBaseline: TextBaseline.alphabetic, children: [
              Text(value, style: TextStyle(fontWeight: FontWeight.bold, fontSize: 22, color: color)),
              const SizedBox(width: 2),
              Text(unit, style: const TextStyle(fontSize: 12, color: Colors.black54)),
            ]),
            Text(label, style: const TextStyle(fontSize: 11, color: Colors.black54)),
          ],
        ),
      ),
    ),
  );
}
