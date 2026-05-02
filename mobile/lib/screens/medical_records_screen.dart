import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../api/client.dart';
import '../services/auth_service.dart';
import '../theme/mediwyz_theme.dart';

class MedicalRecordsScreen extends ConsumerStatefulWidget {
  const MedicalRecordsScreen({super.key});
  @override
  ConsumerState<MedicalRecordsScreen> createState() => _MedicalRecordsScreenState();
}

class _MedicalRecordsScreenState extends ConsumerState<MedicalRecordsScreen> {
  List<Map<String, dynamic>> _items = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final user = ref.read(authProvider).user;
    if (user == null) return;
    try {
      final res = await ApiClient.instance.get('/users/${user['id']}/medical-records');
      final data = (res.data as Map?)?['data'] as List?;
      setState(() {
        _items = data?.map((e) => Map<String, dynamic>.from(e as Map)).toList() ?? [];
        _loading = false;
      });
    } catch (_) {
      setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Medical records', style: TextStyle(fontWeight: FontWeight.bold))),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _items.isEmpty
              ? const Center(child: Text('No records yet', style: TextStyle(color: Colors.black54)))
              : RefreshIndicator(
                  onRefresh: _load,
                  child: ListView.separated(
                    padding: const EdgeInsets.all(12),
                    itemCount: _items.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 8),
                    itemBuilder: (_, i) {
                      final r = _items[i];
                      final type = r['type']?.toString() ?? 'Record';
                      return Card(
                        child: ListTile(
                          leading: CircleAvatar(
                            backgroundColor: MediWyzColors.teal.withValues(alpha: 0.12),
                            child: const Icon(Icons.description_outlined, color: MediWyzColors.teal),
                          ),
                          title: Text(r['title']?.toString() ?? type, style: const TextStyle(fontWeight: FontWeight.w600)),
                          subtitle: Text(r['description']?.toString() ?? type),
                          trailing: Text(
                            (r['date'] ?? r['createdAt'])?.toString().split('T').first ?? '',
                            style: const TextStyle(color: Colors.black54, fontSize: 12),
                          ),
                        ),
                      );
                    },
                  ),
                ),
    );
  }
}
