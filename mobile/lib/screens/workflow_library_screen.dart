import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../api/workflow_api.dart';
import '../theme/mediwyz_theme.dart';

/// Flutter parity with the web Workflow Library page.
///
/// Same endpoint, same filter semantics: providerType, serviceMode,
/// source (system / admin / provider), and free-text search. Tap a card
/// to clone the template into the current user's workspace.
class WorkflowLibraryScreen extends StatefulWidget {
  const WorkflowLibraryScreen({super.key});

  @override
  State<WorkflowLibraryScreen> createState() => _WorkflowLibraryScreenState();
}

class _WorkflowLibraryScreenState extends State<WorkflowLibraryScreen> {
  final _search = TextEditingController();
  String? _providerType;
  String? _serviceMode;
  String? _source;
  bool _loading = true;
  List<Map<String, dynamic>> _templates = [];

  @override
  void initState() {
    super.initState();
    _fetch();
  }

  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  Future<void> _fetch() async {
    setState(() => _loading = true);
    try {
      final data = await WorkflowApi.browseLibrary(
        providerType: _providerType,
        serviceMode: _serviceMode,
        search: _search.text.trim().isEmpty ? null : _search.text.trim(),
        source: _source,
      );
      if (!mounted) return;
      setState(() { _templates = data; _loading = false; });
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _clone(Map<String, dynamic> tpl) async {
    HapticFeedback.selectionClick();
    final name = '${tpl['name']} (my copy)';
    final result = await WorkflowApi.cloneTemplate(
      tpl['id'].toString(),
      name: name,
      providerType: tpl['providerType']?.toString(),
      serviceMode: tpl['serviceMode']?.toString(),
    );
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
      content: Text(result != null ? 'Cloned — edit in the builder' : 'Clone failed — try again'),
      backgroundColor: result != null ? MediWyzColors.teal : Colors.red,
    ));
    if (result != null) _fetch(); // refresh to show new entry
  }

  @override
  Widget build(BuildContext context) {
    // Extract distinct filter options from loaded data — fully DB-driven.
    final roles = _templates.map((t) => t['providerType']?.toString() ?? '').where((s) => s.isNotEmpty).toSet().toList()..sort();
    final modes = _templates.map((t) => t['serviceMode']?.toString() ?? '').where((s) => s.isNotEmpty).toSet().toList()..sort();

    return Scaffold(
      appBar: AppBar(title: const Text('Workflow Library')),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(12),
            child: Column(
              children: [
                TextField(
                  controller: _search,
                  onSubmitted: (_) => _fetch(),
                  decoration: InputDecoration(
                    hintText: 'Search name, slug, description',
                    prefixIcon: const Icon(Icons.search, size: 20),
                    isDense: true,
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                ),
                const SizedBox(height: 8),
                SizedBox(
                  height: 36,
                  child: ListView(
                    scrollDirection: Axis.horizontal,
                    children: [
                      _chipFilter('Role', _providerType, [null, ...roles], (v) {
                        setState(() => _providerType = v); _fetch();
                      }),
                      const SizedBox(width: 6),
                      _chipFilter('Mode', _serviceMode, [null, ...modes], (v) {
                        setState(() => _serviceMode = v); _fetch();
                      }),
                      const SizedBox(width: 6),
                      _chipFilter('Source', _source, [null, 'system', 'admin', 'provider'], (v) {
                        setState(() => _source = v); _fetch();
                      }),
                    ],
                  ),
                ),
              ],
            ),
          ),
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator())
                : _templates.isEmpty
                    ? const Center(child: Padding(
                        padding: EdgeInsets.all(24),
                        child: Text('No workflows match your filters', style: TextStyle(color: Colors.black54)),
                      ))
                    : RefreshIndicator(
                        onRefresh: _fetch,
                        child: ListView.separated(
                          padding: const EdgeInsets.all(12),
                          itemCount: _templates.length,
                          separatorBuilder: (_, __) => const SizedBox(height: 10),
                          itemBuilder: (_, i) => _card(_templates[i]),
                        ),
                      ),
          ),
        ],
      ),
    );
  }

  Widget _chipFilter(String label, String? current, List<String?> options, ValueChanged<String?> onPick) {
    final shown = current ?? label;
    return PopupMenuButton<String?>(
      itemBuilder: (_) => options.map((o) => PopupMenuItem<String?>(
        value: o,
        child: Text(o ?? 'All $label'),
      )).toList(),
      onSelected: onPick,
      child: Chip(
        label: Text(shown, style: const TextStyle(fontSize: 12)),
        backgroundColor: current != null ? MediWyzColors.teal.withValues(alpha: 0.1) : Colors.grey.shade100,
        avatar: const Icon(Icons.filter_list, size: 14),
      ),
    );
  }

  Widget _card(Map<String, dynamic> tpl) {
    final steps = (tpl['steps'] as List?) ?? const [];
    final creator = tpl['creator'] as Map?;
    final creatorKind = creator?['kind']?.toString() ?? 'unknown';
    final creatorName = creatorKind == 'system'
        ? 'System default'
        : creator?['user'] is Map
            ? '${creator!['user']['firstName']} ${creator['user']['lastName']}'
            : 'Unknown';
    final linked = tpl['linkedService'] as Map?;

    return Card(
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(color: Colors.grey.shade200),
      ),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    tpl['name']?.toString() ?? 'Untitled',
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                TextButton.icon(
                  onPressed: () => _clone(tpl),
                  icon: const Icon(Icons.copy, size: 16),
                  label: const Text('Clone'),
                ),
              ],
            ),
            const SizedBox(height: 2),
            Wrap(
              spacing: 8, runSpacing: 4,
              children: [
                _pill(tpl['providerType']?.toString().replaceAll('_', ' ') ?? '—'),
                _pill(tpl['serviceMode']?.toString() ?? '—'),
                _pill(creatorName, icon: _iconForCreator(creatorKind)),
                if (linked != null) _pill(linked['serviceName']?.toString() ?? '', icon: Icons.link),
                _pill('${steps.length} steps', icon: Icons.list),
              ],
            ),
            if (tpl['description'] != null && (tpl['description'] as String).isNotEmpty) ...[
              const SizedBox(height: 6),
              Text(
                tpl['description'].toString(),
                style: const TextStyle(color: Colors.black54, fontSize: 12),
                maxLines: 2, overflow: TextOverflow.ellipsis,
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _pill(String text, {IconData? icon}) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: Colors.grey.shade100,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (icon != null) ...[Icon(icon, size: 11, color: Colors.black54), const SizedBox(width: 4)],
          Text(text, style: const TextStyle(fontSize: 11, color: Colors.black87)),
        ],
      ),
    );
  }

  IconData _iconForCreator(String kind) {
    if (kind == 'system') return Icons.cloud;
    if (kind == 'admin') return Icons.verified_user;
    if (kind == 'provider') return Icons.person;
    return Icons.help_outline;
  }
}
