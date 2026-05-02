import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../api/client.dart';
import '../services/auth_service.dart';
import '../theme/mediwyz_theme.dart';
import '../widgets/prescription_pdf_button.dart';

class PrescriptionsScreen extends ConsumerStatefulWidget {
  const PrescriptionsScreen({super.key});
  @override
  ConsumerState<PrescriptionsScreen> createState() => _PrescriptionsScreenState();
}

class _PrescriptionsScreenState extends ConsumerState<PrescriptionsScreen> {
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
      final res = await ApiClient.instance.get('/users/${user['id']}/prescriptions');
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
      appBar: AppBar(title: const Text('Prescriptions', style: TextStyle(fontWeight: FontWeight.bold))),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _items.isEmpty
              ? const Center(child: Text('No prescriptions yet', style: TextStyle(color: Colors.black54)))
              : RefreshIndicator(
                  onRefresh: _load,
                  child: ListView.builder(
                    padding: const EdgeInsets.all(12),
                    itemCount: _items.length,
                    itemBuilder: (_, i) {
                      final p = _items[i];
                      final date = p['date']?.toString() ?? p['createdAt']?.toString() ?? '';
                      final medicines = (p['medicines'] as List?) ?? [];
                      final isActive = p['isActive'] == true;
                      return Card(
                        margin: const EdgeInsets.only(bottom: 10),
                        child: Padding(
                          padding: const EdgeInsets.all(14),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Expanded(
                                    child: Text(
                                      p['diagnosis']?.toString() ?? 'Prescription',
                                      style: const TextStyle(fontWeight: FontWeight.w600, color: MediWyzColors.navy, fontSize: 15),
                                    ),
                                  ),
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                    decoration: BoxDecoration(
                                      color: isActive ? Colors.green.shade50 : Colors.grey.shade200,
                                      borderRadius: BorderRadius.circular(10),
                                    ),
                                    child: Text(
                                      isActive ? 'Active' : 'Expired',
                                      style: TextStyle(
                                        fontSize: 10,
                                        fontWeight: FontWeight.w600,
                                        color: isActive ? Colors.green.shade700 : Colors.grey.shade700,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                              if (date.isNotEmpty) ...[
                                const SizedBox(height: 2),
                                Text(date.split('T').first, style: const TextStyle(color: Colors.black54, fontSize: 12)),
                              ],
                              if (medicines.isNotEmpty) ...[
                                const SizedBox(height: 10),
                                const Divider(height: 1),
                                const SizedBox(height: 8),
                                ...medicines.map((m) {
                                  final med = m is Map ? Map<String, dynamic>.from(m) : <String, dynamic>{};
                                  return Padding(
                                    padding: const EdgeInsets.symmetric(vertical: 2),
                                    child: Row(
                                      children: [
                                        const Icon(Icons.medication_outlined, size: 16, color: MediWyzColors.teal),
                                        const SizedBox(width: 6),
                                        Expanded(
                                          child: Text(
                                            '${med['medicine']?['name'] ?? med['name'] ?? 'Medicine'} — ${med['dosage'] ?? ''} ${med['frequency'] ?? ''}',
                                            style: const TextStyle(fontSize: 13),
                                          ),
                                        ),
                                      ],
                                    ),
                                  );
                                }),
                              ],
                              if (p['notes'] != null && p['notes'].toString().isNotEmpty) ...[
                                const SizedBox(height: 8),
                                Text(p['notes'].toString(), style: const TextStyle(fontSize: 12, color: Colors.black54)),
                              ],
                              const SizedBox(height: 10),
                              Align(
                                alignment: Alignment.centerRight,
                                child: PrescriptionPdfButton(
                                  userId: ref.read(authProvider).user?['id']?.toString() ?? '',
                                  prescriptionId: p['id']?.toString() ?? '',
                                ),
                              ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
                ),
    );
  }
}
