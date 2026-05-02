import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../api/client.dart';
import '../services/auth_service.dart';
import '../theme/mediwyz_theme.dart';

/// DB-driven profile form. Reads `ProviderRole.profileFields` from
/// `/api/roles?all=true&includeLegacy=true`, finds the row matching the
/// current user's `userType`, then renders one input per field.
///
/// No hardcoded role names — when a regional admin adds a new role via
/// CRUD and specifies its `profileFields`, the form renders automatically.
class RoleProfileForm extends ConsumerStatefulWidget {
  const RoleProfileForm({super.key});
  @override
  ConsumerState<RoleProfileForm> createState() => _RoleProfileFormState();
}

class _FieldDef {
  final String key;
  final String label;
  final String type; // 'text' | 'number' | 'tags' | 'select' | 'readonly'
  final List<String>? options;
  final String? suffix;
  final bool profileField;
  const _FieldDef({
    required this.key, required this.label, required this.type,
    this.options, this.suffix, this.profileField = true,
  });

  factory _FieldDef.fromMap(Map m) => _FieldDef(
        key: m['key']?.toString() ?? '',
        label: m['label']?.toString() ?? m['key']?.toString() ?? '',
        type: m['type']?.toString() ?? 'text',
        options: (m['options'] as List?)?.map((e) => e.toString()).toList(),
        suffix: m['suffix']?.toString(),
        profileField: m['profileField'] != false,
      );
}

class _RoleProfileFormState extends ConsumerState<RoleProfileForm> {
  List<_FieldDef> _fields = [];
  final Map<String, TextEditingController> _controllers = {};
  final Map<String, dynamic> _values = {};
  bool _loading = true;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final user = ref.read(authProvider).user;
    if (user == null) return;
    try {
      // Fetch all roles (legacy included) so PATIENT, CORPORATE_ADMIN, etc.
      // also resolve their profile fields.
      final rolesRes = await ApiClient.instance.get(
        '/roles',
        queryParameters: {'all': 'true', 'includeLegacy': 'true'},
      );
      final roles = (rolesRes.data as Map?)?['data'] as List? ?? [];

      final code = user['userType']?.toString() ?? '';
      final role = roles.cast<dynamic>().firstWhere(
        (r) => (r as Map?)?['code'] == code,
        orElse: () => null,
      );
      final rawFields = (role as Map?)?['profileFields'] as List? ?? [];
      _fields = rawFields
          .map((e) => _FieldDef.fromMap(e as Map))
          .where((f) => f.key.isNotEmpty)
          .toList();

      // Load current values — `profile` sub-object on /users/:id.
      final userRes = await ApiClient.instance.get('/users/${user['id']}');
      final profile = ((userRes.data as Map?)?['data']?['profile'] as Map?) ?? {};
      for (final f in _fields) {
        final raw = profile[f.key];
        if (f.type == 'tags') {
          _values[f.key] = raw is List ? raw.map((e) => e.toString()).toList() : <String>[];
        } else {
          final v = raw?.toString() ?? '';
          _values[f.key] = v;
          _controllers[f.key] = TextEditingController(text: v);
        }
      }
    } catch (_) { /* empty form */ }
    if (mounted) setState(() => _loading = false);
  }

  Future<void> _save() async {
    final user = ref.read(authProvider).user;
    if (user == null) return;
    setState(() => _saving = true);
    try {
      // Build PATCH body from editable (non-readonly) fields.
      final body = <String, dynamic>{};
      for (final f in _fields) {
        if (f.type == 'readonly') continue;
        if (f.type == 'tags') {
          body[f.key] = _values[f.key];
        } else {
          final v = _controllers[f.key]?.text ?? '';
          body[f.key] = f.type == 'number' ? num.tryParse(v) ?? 0 : v;
        }
      }
      await ApiClient.instance.patch('/users/${user['id']}', data: body);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Profile saved'), backgroundColor: Colors.green),
        );
      }
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Failed to save'), backgroundColor: Colors.red),
        );
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  void dispose() {
    for (final c in _controllers.values) { c.dispose(); }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Padding(
        padding: EdgeInsets.all(20),
        child: Center(child: CircularProgressIndicator()),
      );
    }
    if (_fields.isEmpty) {
      return const SizedBox.shrink();
    }

    return Card(
      margin: EdgeInsets.zero,
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text('Profile details', style: TextStyle(fontWeight: FontWeight.w600, color: MediWyzColors.navy, fontSize: 16)),
            const SizedBox(height: 4),
            const Text('These fields are defined by your role. New fields appear here automatically when an admin updates the role.', style: TextStyle(fontSize: 11, color: Colors.black54)),
            const SizedBox(height: 12),
            ..._fields.map(_buildField),
            const SizedBox(height: 10),
            ElevatedButton(
              onPressed: _saving ? null : _save,
              style: ElevatedButton.styleFrom(backgroundColor: MediWyzColors.teal),
              child: _saving
                  ? const SizedBox(height: 16, width: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                  : const Text('Save', style: TextStyle(color: Colors.white)),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildField(_FieldDef f) {
    switch (f.type) {
      case 'readonly':
        return Padding(
          padding: const EdgeInsets.only(bottom: 10),
          child: InputDecorator(
            decoration: InputDecoration(labelText: f.label, border: const OutlineInputBorder(), isDense: true, suffixText: f.suffix),
            child: Text(_controllers[f.key]?.text ?? '—', style: const TextStyle(color: Colors.black54)),
          ),
        );

      case 'number':
        return Padding(
          padding: const EdgeInsets.only(bottom: 10),
          child: TextField(
            controller: _controllers[f.key],
            keyboardType: TextInputType.number,
            decoration: InputDecoration(
              labelText: f.label,
              border: const OutlineInputBorder(),
              isDense: true,
              suffixText: f.suffix,
            ),
          ),
        );

      case 'select':
        final opts = f.options ?? <String>[];
        return Padding(
          padding: const EdgeInsets.only(bottom: 10),
          child: DropdownButtonFormField<String>(
            value: (_controllers[f.key]?.text.isEmpty ?? true) ? null : _controllers[f.key]?.text,
            items: opts.map((o) => DropdownMenuItem(value: o, child: Text(o))).toList(),
            decoration: InputDecoration(labelText: f.label, border: const OutlineInputBorder(), isDense: true),
            onChanged: (v) {
              if (v != null) _controllers[f.key]?.text = v;
            },
          ),
        );

      case 'tags':
        return _TagsEditor(
          label: f.label,
          values: List<String>.from(_values[f.key] as List? ?? []),
          onChanged: (list) => setState(() => _values[f.key] = list),
        );

      case 'text':
      default:
        return Padding(
          padding: const EdgeInsets.only(bottom: 10),
          child: TextField(
            controller: _controllers[f.key],
            decoration: InputDecoration(labelText: f.label, border: const OutlineInputBorder(), isDense: true, suffixText: f.suffix),
          ),
        );
    }
  }
}

class _TagsEditor extends StatefulWidget {
  final String label;
  final List<String> values;
  final ValueChanged<List<String>> onChanged;
  const _TagsEditor({required this.label, required this.values, required this.onChanged});

  @override
  State<_TagsEditor> createState() => _TagsEditorState();
}

class _TagsEditorState extends State<_TagsEditor> {
  final _input = TextEditingController();

  void _add() {
    final t = _input.text.trim();
    if (t.isEmpty) return;
    final next = [...widget.values, t];
    widget.onChanged(next);
    _input.clear();
  }

  void _remove(int i) {
    final next = [...widget.values]..removeAt(i);
    widget.onChanged(next);
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(widget.label, style: const TextStyle(fontSize: 12, color: Colors.black54)),
          const SizedBox(height: 4),
          Row(children: [
            Expanded(
              child: TextField(
                controller: _input,
                decoration: const InputDecoration(hintText: 'Add…', border: OutlineInputBorder(), isDense: true),
                onSubmitted: (_) => _add(),
              ),
            ),
            const SizedBox(width: 6),
            IconButton(icon: const Icon(Icons.add_circle_outline, color: MediWyzColors.teal), onPressed: _add),
          ]),
          const SizedBox(height: 6),
          Wrap(
            spacing: 6, runSpacing: 4,
            children: [
              for (int i = 0; i < widget.values.length; i++)
                InputChip(
                  label: Text(widget.values[i], style: const TextStyle(fontSize: 12)),
                  onDeleted: () => _remove(i),
                ),
            ],
          ),
        ],
      ),
    );
  }

  @override
  void dispose() {
    _input.dispose();
    super.dispose();
  }
}
