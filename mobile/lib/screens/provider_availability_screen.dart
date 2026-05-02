import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../api/client.dart';
import '../services/auth_service.dart';
import '../theme/mediwyz_theme.dart';
import '../widgets/app_drawer.dart';

/// Provider schedule editor — 7 day-rows with add/remove slot ranges.
/// PUTs back to /users/:id/availability with the full slot list.
class ProviderAvailabilityScreen extends ConsumerStatefulWidget {
  const ProviderAvailabilityScreen({super.key});
  @override
  ConsumerState<ProviderAvailabilityScreen> createState() => _ProviderAvailabilityScreenState();
}

class _Slot {
  int dayOfWeek;
  TextEditingController startTime;
  TextEditingController endTime;
  bool isActive;
  _Slot({required this.dayOfWeek, required String start, required String end, this.isActive = true})
      : startTime = TextEditingController(text: start),
        endTime = TextEditingController(text: end);
  Map<String, dynamic> toJson() => {
    'dayOfWeek': dayOfWeek,
    'startTime': startTime.text,
    'endTime': endTime.text,
    'isActive': isActive,
  };
  void dispose() { startTime.dispose(); endTime.dispose(); }
}

class _ProviderAvailabilityScreenState extends ConsumerState<ProviderAvailabilityScreen> {
  List<_Slot> _slots = [];
  bool _loading = true;
  bool _saving = false;

  static const _dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final user = ref.read(authProvider).user;
    if (user == null) return;
    setState(() => _loading = true);
    try {
      final res = await ApiClient.instance.get('/users/${user['id']}/availability');
      final data = (res.data as Map?)?['data'] as List?;
      setState(() {
        _slots = (data ?? []).map((e) {
          final m = e as Map;
          return _Slot(
            dayOfWeek: (m['dayOfWeek'] as num?)?.toInt() ?? 1,
            start: m['startTime']?.toString() ?? '09:00',
            end: m['endTime']?.toString() ?? '17:00',
            isActive: m['isActive'] != false,
          );
        }).toList();
      });
    } catch (_) {}
    finally { if (mounted) setState(() => _loading = false); }
  }

  Future<void> _save() async {
    final user = ref.read(authProvider).user;
    if (user == null) return;
    setState(() => _saving = true);
    try {
      await ApiClient.instance.put('/users/${user['id']}/availability', data: {
        'slots': _slots.map((s) => s.toJson()).toList(),
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Schedule saved'), backgroundColor: Colors.green),
        );
      }
    } catch (_) {}
    finally { if (mounted) setState(() => _saving = false); }
  }

  void _addSlot(int day) {
    setState(() => _slots.add(_Slot(dayOfWeek: day, start: '09:00', end: '17:00')));
  }

  void _removeSlot(int index) {
    setState(() => _slots.removeAt(index).dispose());
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      drawer: const AppDrawer(),
      appBar: AppBar(
        title: const Text('My schedule', style: TextStyle(fontWeight: FontWeight.bold)),
        actions: [
          TextButton(
            onPressed: _saving ? null : _save,
            child: _saving
                ? const SizedBox(height: 16, width: 16, child: CircularProgressIndicator(strokeWidth: 2))
                : const Text('Save', style: TextStyle(color: MediWyzColors.teal, fontWeight: FontWeight.bold)),
          ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : ListView.builder(
              padding: const EdgeInsets.all(12),
              itemCount: 7,
              itemBuilder: (_, day) {
                final daySlots = _slots.asMap().entries.where((e) => e.value.dayOfWeek == day).toList();
                return Card(
                  margin: const EdgeInsets.only(bottom: 8),
                  child: Padding(
                    padding: const EdgeInsets.all(12),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Row(
                          children: [
                            Container(
                              width: 40, height: 40,
                              decoration: BoxDecoration(color: MediWyzColors.sky.withValues(alpha: 0.3), borderRadius: BorderRadius.circular(8)),
                              alignment: Alignment.center,
                              child: Text(_dayLabels[day], style: const TextStyle(fontWeight: FontWeight.bold, color: MediWyzColors.navy)),
                            ),
                            const SizedBox(width: 10),
                            const Expanded(child: Text('Available slots', style: TextStyle(color: Colors.black54, fontSize: 13))),
                            IconButton(
                              icon: const Icon(Icons.add_circle_outline, color: MediWyzColors.teal),
                              onPressed: () => _addSlot(day),
                            ),
                          ],
                        ),
                        if (daySlots.isEmpty)
                          const Padding(
                            padding: EdgeInsets.symmetric(vertical: 8),
                            child: Text('Not available this day', style: TextStyle(color: Colors.black45, fontSize: 12)),
                          )
                        else
                          ...daySlots.map((entry) {
                            final idx = entry.key;
                            final slot = entry.value;
                            return Padding(
                              padding: const EdgeInsets.symmetric(vertical: 4),
                              child: Row(children: [
                                Expanded(
                                  child: TextField(
                                    controller: slot.startTime,
                                    decoration: const InputDecoration(labelText: 'From (HH:MM)', isDense: true, border: OutlineInputBorder()),
                                  ),
                                ),
                                const Padding(padding: EdgeInsets.symmetric(horizontal: 6), child: Text('→')),
                                Expanded(
                                  child: TextField(
                                    controller: slot.endTime,
                                    decoration: const InputDecoration(labelText: 'To (HH:MM)', isDense: true, border: OutlineInputBorder()),
                                  ),
                                ),
                                IconButton(
                                  icon: const Icon(Icons.delete_outline, color: Colors.red, size: 20),
                                  onPressed: () => _removeSlot(idx),
                                ),
                              ]),
                            );
                          }),
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
    for (final s in _slots) { s.dispose(); }
    super.dispose();
  }
}
