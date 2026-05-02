import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../api/client.dart';
import '../theme/mediwyz_theme.dart';
import '../widgets/app_drawer.dart';

/// Provider workflows — view templates + their status steps. Read-only on
/// mobile for now (template authoring stays on web for the form complexity).
class ProviderWorkflowsScreen extends ConsumerStatefulWidget {
  const ProviderWorkflowsScreen({super.key});
  @override
  ConsumerState<ProviderWorkflowsScreen> createState() => _ProviderWorkflowsScreenState();
}

class _ProviderWorkflowsScreenState extends ConsumerState<ProviderWorkflowsScreen> {
  List<Map<String, dynamic>> _templates = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final res = await ApiClient.instance.get('/workflow/my-templates');
      final data = (res.data as Map?)?['data'] as List?;
      setState(() {
        _templates = data?.map((e) => Map<String, dynamic>.from(e as Map)).toList() ?? [];
        _loading = false;
      });
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _viewSteps(Map<String, dynamic> tpl) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (_) => _StepsView(template: tpl),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      drawer: const AppDrawer(),
      appBar: AppBar(title: const Text('Workflows', style: TextStyle(fontWeight: FontWeight.bold))),
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: MediWyzColors.teal,
        onPressed: () async {
          await context.push('/workflow-editor');
          _load();
        },
        icon: const Icon(Icons.add, color: Colors.white),
        label: const Text('New', style: TextStyle(color: Colors.white)),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _templates.isEmpty
              ? const Center(child: Text('No workflow templates yet', style: TextStyle(color: Colors.black54)))
              : RefreshIndicator(
                  onRefresh: _load,
                  child: ListView.separated(
                    padding: const EdgeInsets.all(12),
                    itemCount: _templates.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 8),
                    itemBuilder: (_, i) {
                      final t = _templates[i];
                      final steps = (t['steps'] as List?) ?? [];
                      return Card(
                        child: ListTile(
                          leading: const CircleAvatar(
                            backgroundColor: MediWyzColors.sky,
                            child: Icon(Icons.account_tree_outlined, color: MediWyzColors.navy),
                          ),
                          title: Text(t['name']?.toString() ?? 'Template', style: const TextStyle(fontWeight: FontWeight.w600)),
                          subtitle: Text('${steps.length} steps · ${t['serviceMode'] ?? 'any mode'}'),
                          trailing: const Icon(Icons.chevron_right),
                          onTap: () => _viewSteps(t),
                        ),
                      );
                    },
                  ),
                ),
    );
  }
}

class _StepsView extends StatelessWidget {
  final Map<String, dynamic> template;
  const _StepsView({required this.template});

  @override
  Widget build(BuildContext context) {
    final steps = ((template['steps'] as List?) ?? []).map((e) => Map<String, dynamic>.from(e as Map)).toList();
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(template['name']?.toString() ?? 'Template',
                style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: MediWyzColors.navy)),
            const SizedBox(height: 10),
            Flexible(
              child: ListView.separated(
                shrinkWrap: true,
                itemCount: steps.length,
                separatorBuilder: (_, __) => const SizedBox(height: 6),
                itemBuilder: (_, i) {
                  final s = steps[i];
                  final flags = s['flags'] is Map ? Map<String, dynamic>.from(s['flags'] as Map) : {};
                  final active = flags.entries.where((e) => e.value == true).map((e) => e.key).toList();
                  return Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: MediWyzColors.sky.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: MediWyzColors.sky),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(children: [
                          CircleAvatar(radius: 12, backgroundColor: MediWyzColors.teal, child: Text('${i + 1}', style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold))),
                          const SizedBox(width: 8),
                          Text(s['label']?.toString() ?? s['status']?.toString() ?? 'Step', style: const TextStyle(fontWeight: FontWeight.w600)),
                        ]),
                        if (active.isNotEmpty) ...[
                          const SizedBox(height: 6),
                          Wrap(
                            spacing: 4,
                            runSpacing: 4,
                            children: active.map((flag) => Container(
                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                              decoration: BoxDecoration(color: MediWyzColors.teal, borderRadius: BorderRadius.circular(8)),
                              child: Text(flag, style: const TextStyle(color: Colors.white, fontSize: 9, fontWeight: FontWeight.w600)),
                            )).toList(),
                          ),
                        ],
                      ],
                    ),
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}
