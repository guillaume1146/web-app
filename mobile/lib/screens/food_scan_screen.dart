import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:file_picker/file_picker.dart';
import '../api/client.dart';
import '../api/upload_api.dart';
import '../theme/mediwyz_theme.dart';

/// AI food scan — pick a food photo, backend recognises + returns macros.
class FoodScanScreen extends ConsumerStatefulWidget {
  const FoodScanScreen({super.key});
  @override
  ConsumerState<FoodScanScreen> createState() => _FoodScanScreenState();
}

class _FoodScanScreenState extends ConsumerState<FoodScanScreen> {
  String? _imageUrl;
  Map<String, dynamic>? _result;
  bool _busy = false;
  String? _error;

  Future<void> _pickAndScan() async {
    setState(() { _busy = true; _error = null; _result = null; });
    try {
      final picked = await FilePicker.platform.pickFiles(type: FileType.image, withData: true);
      if (picked == null || picked.files.isEmpty || picked.files.first.bytes == null) {
        setState(() => _busy = false);
        return;
      }
      final file = picked.files.first;
      final url = await UploadApi.uploadBytes(bytes: file.bytes!, filename: file.name);
      if (url == null) throw 'upload failed';
      _imageUrl = url;

      final res = await ApiClient.instance.post('/ai/health-tracker/food-scan', data: {'imageUrl': url});
      final body = res.data as Map?;
      setState(() => _result = body?['data'] is Map ? Map<String, dynamic>.from(body!['data'] as Map) : null);
    } catch (e) {
      setState(() => _error = 'Scan failed: $e');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _addToDiary() async {
    if (_result == null) return;
    try {
      await ApiClient.instance.post('/ai/health-tracker/food', data: {
        'name': _result!['name'],
        'calories': _result!['calories'],
        'protein': _result!['protein'],
        'carbs': _result!['carbs'],
        'fat': _result!['fat'],
        'mealType': 'lunch',
        'date': DateTime.now().toIso8601String().split('T').first,
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Added to food diary'), backgroundColor: Colors.green),
        );
        setState(() => _result = null);
      }
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('AI food scan', style: TextStyle(fontWeight: FontWeight.bold))),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  if (_imageUrl != null)
                    ClipRRect(
                      borderRadius: BorderRadius.circular(10),
                      child: Image.network(_imageUrl!, height: 200, fit: BoxFit.cover, errorBuilder: (_, __, ___) => Container(height: 200, color: Colors.grey.shade200, child: const Icon(Icons.image_not_supported))),
                    )
                  else
                    Container(
                      height: 200,
                      decoration: BoxDecoration(
                        color: MediWyzColors.sky.withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: const Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.camera_alt_outlined, size: 48, color: MediWyzColors.teal),
                            SizedBox(height: 8),
                            Text('Photo a meal to auto-estimate macros', style: TextStyle(color: Colors.black54)),
                          ],
                        ),
                      ),
                    ),
                  const SizedBox(height: 14),
                  ElevatedButton.icon(
                    onPressed: _busy ? null : _pickAndScan,
                    style: ElevatedButton.styleFrom(backgroundColor: MediWyzColors.teal),
                    icon: _busy
                        ? const SizedBox(height: 18, width: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                        : const Icon(Icons.photo_library_outlined),
                    label: Text(_busy ? 'Analysing…' : 'Pick photo'),
                  ),
                  if (_error != null) ...[
                    const SizedBox(height: 8),
                    Text(_error!, style: const TextStyle(color: Colors.red, fontSize: 13)),
                  ],
                ],
              ),
            ),
          ),
          if (_result != null) ...[
            const SizedBox(height: 14),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(_result!['name']?.toString() ?? 'Food', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: MediWyzColors.navy)),
                    if (_result!['description'] != null) ...[
                      const SizedBox(height: 4),
                      Text(_result!['description'].toString(), style: const TextStyle(color: Colors.black54, fontSize: 13)),
                    ],
                    const SizedBox(height: 14),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        _MacroChip(label: 'Calories', value: '${_result!['calories'] ?? 0}', color: Colors.orange),
                        _MacroChip(label: 'Protein', value: '${_result!['protein'] ?? 0}g', color: Colors.red),
                        _MacroChip(label: 'Carbs', value: '${_result!['carbs'] ?? 0}g', color: Colors.blue),
                        _MacroChip(label: 'Fat', value: '${_result!['fat'] ?? 0}g', color: Colors.purple),
                      ],
                    ),
                    const SizedBox(height: 14),
                    SizedBox(
                      width: double.infinity,
                      child: FilledButton.icon(
                        onPressed: _addToDiary,
                        style: FilledButton.styleFrom(backgroundColor: MediWyzColors.teal),
                        icon: const Icon(Icons.add),
                        label: const Text('Add to food diary'),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _MacroChip extends StatelessWidget {
  final String label; final String value; final Color color;
  const _MacroChip({required this.label, required this.value, required this.color});
  @override
  Widget build(BuildContext context) => Column(
    children: [
      Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
        decoration: BoxDecoration(color: color.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(8)),
        child: Text(value, style: TextStyle(fontWeight: FontWeight.bold, color: color)),
      ),
      const SizedBox(height: 2),
      Text(label, style: const TextStyle(fontSize: 10, color: Colors.black54)),
    ],
  );
}
