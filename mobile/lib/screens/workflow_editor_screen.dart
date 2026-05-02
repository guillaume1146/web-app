import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../api/client.dart';
import '../theme/mediwyz_theme.dart';

/// Create or edit a workflow template. Dynamic step rows with per-step flag toggles.
/// POSTs to /workflow/my-templates (provider) or /workflow/templates (regional admin).
class WorkflowEditorScreen extends ConsumerStatefulWidget {
  final String? templateId;
  const WorkflowEditorScreen({super.key, this.templateId});
  @override
  ConsumerState<WorkflowEditorScreen> createState() => _WorkflowEditorScreenState();
}

class _Step {
  final TextEditingController status = TextEditingController();
  final TextEditingController label = TextEditingController();
  bool requiresPrescription = false;
  bool requiresContent = false;
  bool triggersStockCheck = false;
  bool triggersStockSubtract = false;
  _Step({String? status, String? label}) {
    this.status.text = status ?? '';
    this.label.text = label ?? '';
  }
  Map<String, dynamic> toJson(int order) => {
    'status': status.text.trim(),
    'label': label.text.trim(),
    'order': order,
    'flags': {
      if (requiresPrescription) 'requires_prescription': true,
      if (requiresContent) 'requires_content': 'lab_result',
      if (triggersStockCheck) 'triggers_stock_check': true,
      if (triggersStockSubtract) 'triggers_stock_subtract': true,
    },
  };
  void dispose() { status.dispose(); label.dispose(); }
}

class _WorkflowEditorScreenState extends ConsumerState<WorkflowEditorScreen> {
  final _name = TextEditingController();
  final _description = TextEditingController();
  String _providerType = 'DOCTOR';
  String _serviceMode = 'in_person';
  List<_Step> _steps = [];
  List<Map<String, dynamic>> _roles = [];
  bool _loading = true;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    _boot();
  }

  Future<void> _boot() async {
    try {
      final rolesRes = await ApiClient.instance.get('/roles');
      final rolesData = (rolesRes.data as Map?)?['data'] as List?;
      _roles = rolesData?.map((e) => Map<String, dynamic>.from(e as Map)).toList() ?? [];

      if (widget.templateId != null) {
        final tplRes = await ApiClient.instance.get('/workflow/templates/${widget.templateId}');
        final tpl = (tplRes.data as Map?)?['data'] as Map?;
        if (tpl != null) {
          _name.text = tpl['name']?.toString() ?? '';
          _description.text = tpl['description']?.toString() ?? '';
          _providerType = tpl['providerType']?.toString() ?? 'DOCTOR';
          _serviceMode = tpl['serviceMode']?.toString() ?? 'in_person';
          final rawSteps = (tpl['steps'] as List?) ?? [];
          _steps = rawSteps.map((s) {
            final map = Map<String, dynamic>.from(s as Map);
            final flags = Map<String, dynamic>.from(map['flags'] as Map? ?? {});
            final step = _Step(status: map['status']?.toString(), label: map['label']?.toString());
            step.requiresPrescription = flags['requires_prescription'] == true;
            step.requiresContent = flags['requires_content'] != null;
            step.triggersStockCheck = flags['triggers_stock_check'] == true;
            step.triggersStockSubtract = flags['triggers_stock_subtract'] == true;
            return step;
          }).toList();
        }
      }

      if (_steps.isEmpty) {
        _steps = [
          _Step(status: 'pending', label: 'Pending'),
          _Step(status: 'accepted', label: 'Accepted'),
          _Step(status: 'completed', label: 'Completed'),
        ];
      }
    } catch (_) {}
    if (mounted) setState(() => _loading = false);
  }

  Future<void> _save() async {
    if (_name.text.trim().isEmpty || _steps.isEmpty) return;
    setState(() => _saving = true);
    try {
      final body = {
        'name': _name.text.trim(),
        'description': _description.text.trim(),
        'providerType': _providerType,
        'serviceMode': _serviceMode,
        'steps': [for (int i = 0; i < _steps.length; i++) _steps[i].toJson(i)],
        // Linear transitions: each step can advance to the next
        'transitions': [
          for (int i = 0; i < _steps.length - 1; i++)
            {'fromStatus': _steps[i].status.text.trim(), 'toStatus': _steps[i + 1].status.text.trim(), 'action': 'advance'},
        ],
      };
      if (widget.templateId != null) {
        await ApiClient.instance.patch('/workflow/templates/${widget.templateId}', data: body);
      } else {
        await ApiClient.instance.post('/workflow/my-templates', data: body);
      }
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Template saved'), backgroundColor: Colors.green),
        );
        context.pop();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Failed: $e'), backgroundColor: Colors.red));
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.templateId == null ? 'New template' : 'Edit template'),
        actions: [
          TextButton(
            onPressed: _saving ? null : _save,
            child: _saving
                ? const SizedBox(height: 18, width: 18, child: CircularProgressIndicator(strokeWidth: 2))
                : const Text('Save', style: TextStyle(color: MediWyzColors.teal, fontWeight: FontWeight.bold)),
          ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                TextField(
                  controller: _name,
                  decoration: const InputDecoration(labelText: 'Name *', border: OutlineInputBorder()),
                ),
                const SizedBox(height: 10),
                TextField(
                  controller: _description,
                  maxLines: 2,
                  decoration: const InputDecoration(labelText: 'Description', border: OutlineInputBorder()),
                ),
                const SizedBox(height: 10),
                DropdownButtonFormField<String>(
                  initialValue: _providerType,
                  decoration: const InputDecoration(labelText: 'Provider type', border: OutlineInputBorder()),
                  items: _roles.map((r) => DropdownMenuItem(
                    value: r['code']?.toString(),
                    child: Text(r['label']?.toString() ?? r['code']?.toString() ?? ''),
                  )).toList(),
                  onChanged: (v) => setState(() => _providerType = v ?? 'DOCTOR'),
                ),
                const SizedBox(height: 10),
                DropdownButtonFormField<String>(
                  initialValue: _serviceMode,
                  decoration: const InputDecoration(labelText: 'Service mode', border: OutlineInputBorder()),
                  items: const [
                    DropdownMenuItem(value: 'in_person', child: Text('In person')),
                    DropdownMenuItem(value: 'video', child: Text('Video call')),
                    DropdownMenuItem(value: 'home_visit', child: Text('Home visit')),
                    DropdownMenuItem(value: 'lab', child: Text('Lab visit')),
                  ],
                  onChanged: (v) => setState(() => _serviceMode = v ?? 'in_person'),
                ),
                const SizedBox(height: 16),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('Steps', style: TextStyle(fontWeight: FontWeight.w600, color: MediWyzColors.navy, fontSize: 16)),
                    TextButton.icon(
                      onPressed: () => setState(() => _steps.add(_Step())),
                      icon: const Icon(Icons.add),
                      label: const Text('Add step'),
                    ),
                  ],
                ),
                for (int i = 0; i < _steps.length; i++) _StepRow(
                  step: _steps[i],
                  index: i,
                  onDelete: _steps.length > 1
                      ? () => setState(() => _steps.removeAt(i).dispose())
                      : null,
                ),
                const SizedBox(height: 80),
              ],
            ),
    );
  }

  @override
  void dispose() {
    _name.dispose();
    _description.dispose();
    for (final s in _steps) {
      s.dispose();
    }
    super.dispose();
  }
}

class _StepRow extends StatefulWidget {
  final _Step step;
  final int index;
  final VoidCallback? onDelete;
  const _StepRow({required this.step, required this.index, this.onDelete});
  @override
  State<_StepRow> createState() => _StepRowState();
}

class _StepRowState extends State<_StepRow> {
  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.symmetric(vertical: 6),
      child: Padding(
        padding: const EdgeInsets.all(10),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                CircleAvatar(radius: 14, backgroundColor: MediWyzColors.teal, child: Text('${widget.index + 1}', style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold))),
                const SizedBox(width: 8),
                Expanded(
                  child: TextField(
                    controller: widget.step.status,
                    decoration: const InputDecoration(labelText: 'Status code (e.g. pending)', isDense: true, border: OutlineInputBorder()),
                  ),
                ),
                if (widget.onDelete != null)
                  IconButton(icon: const Icon(Icons.close, color: Colors.red, size: 20), onPressed: widget.onDelete),
              ],
            ),
            const SizedBox(height: 6),
            TextField(
              controller: widget.step.label,
              decoration: const InputDecoration(labelText: 'Label', isDense: true, border: OutlineInputBorder()),
            ),
            const SizedBox(height: 6),
            Wrap(
              spacing: 6,
              children: [
                FilterChip(
                  label: const Text('Requires prescription', style: TextStyle(fontSize: 11)),
                  selected: widget.step.requiresPrescription,
                  onSelected: (v) => setState(() => widget.step.requiresPrescription = v),
                ),
                FilterChip(
                  label: const Text('Requires content', style: TextStyle(fontSize: 11)),
                  selected: widget.step.requiresContent,
                  onSelected: (v) => setState(() => widget.step.requiresContent = v),
                ),
                FilterChip(
                  label: const Text('Stock check', style: TextStyle(fontSize: 11)),
                  selected: widget.step.triggersStockCheck,
                  onSelected: (v) => setState(() => widget.step.triggersStockCheck = v),
                ),
                FilterChip(
                  label: const Text('Stock subtract', style: TextStyle(fontSize: 11)),
                  selected: widget.step.triggersStockSubtract,
                  onSelected: (v) => setState(() => widget.step.triggersStockSubtract = v),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
