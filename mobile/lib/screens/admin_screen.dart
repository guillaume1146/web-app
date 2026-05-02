import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../api/client.dart';
import '../theme/mediwyz_theme.dart';
import '../widgets/app_drawer.dart';

/// Combined admin console — tabbed view of roles, required documents,
/// document verification queue, and audit log.
class AdminScreen extends ConsumerStatefulWidget {
  const AdminScreen({super.key});
  @override
  ConsumerState<AdminScreen> createState() => _AdminScreenState();
}

class _AdminScreenState extends ConsumerState<AdminScreen> with SingleTickerProviderStateMixin {
  late final TabController _tabs;

  @override
  void initState() {
    super.initState();
    _tabs = TabController(length: 5, vsync: this);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      drawer: const AppDrawer(),
      appBar: AppBar(
        title: const Text('Admin console', style: TextStyle(fontWeight: FontWeight.bold)),
        bottom: TabBar(
          controller: _tabs,
          isScrollable: true,
          labelColor: MediWyzColors.teal,
          indicatorColor: MediWyzColors.teal,
          tabs: const [
            Tab(icon: Icon(Icons.people_outlined, size: 18), text: 'Accounts'),
            Tab(icon: Icon(Icons.badge_outlined, size: 18), text: 'Roles'),
            Tab(icon: Icon(Icons.folder_outlined, size: 18), text: 'Required docs'),
            Tab(icon: Icon(Icons.inbox_outlined, size: 18), text: 'Doc queue'),
            Tab(icon: Icon(Icons.shield_outlined, size: 18), text: 'Audit log'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabs,
        children: const [
          _AccountsTab(),
          _RolesTab(),
          _RequiredDocsTab(),
          _DocQueueTab(),
          _AuditLogTab(),
        ],
      ),
    );
  }

  @override
  void dispose() {
    _tabs.dispose();
    super.dispose();
  }
}

// ─── Accounts tab ─────────────────────────────────────────────────────────

class _AccountsTab extends StatefulWidget {
  const _AccountsTab();
  @override
  State<_AccountsTab> createState() => _AccountsTabState();
}

class _AccountsTabState extends State<_AccountsTab> with SingleTickerProviderStateMixin {
  late final TabController _subTabs;
  Map<String, List<Map<String, dynamic>>> _buckets = {'active': [], 'pending': [], 'suspended': []};
  bool _loading = true;
  String? _busyId;

  @override
  void initState() {
    super.initState();
    _subTabs = TabController(length: 3, vsync: this);
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final results = await Future.wait([
        ApiClient.instance.get('/admin/accounts', queryParameters: {'status': 'active', 'limit': 100}),
        ApiClient.instance.get('/admin/accounts', queryParameters: {'status': 'pending', 'limit': 100}),
        ApiClient.instance.get('/admin/accounts', queryParameters: {'status': 'suspended', 'limit': 100}),
      ]);
      List<Map<String, dynamic>> parse(dynamic body) {
        final data = body as Map?;
        final users = data?['data']?['users'] as List? ?? data?['data'] as List? ?? [];
        return users.map((e) => Map<String, dynamic>.from(e as Map)).toList();
      }
      setState(() {
        _buckets = {
          'active': parse(results[0].data),
          'pending': parse(results[1].data),
          'suspended': parse(results[2].data),
        };
        _loading = false;
      });
    } catch (_) { if (mounted) setState(() => _loading = false); }
  }

  Future<void> _act(String userId, String action) async {
    setState(() => _busyId = userId);
    try {
      await ApiClient.instance.patch('/admin/accounts', data: {'userId': userId, 'action': action});
      await _load();
    } catch (_) {}
    finally { if (mounted) setState(() => _busyId = null); }
  }

  Widget _userList(List<Map<String, dynamic>> users, {required bool allowApprove, required bool allowSuspend}) {
    if (users.isEmpty) return const Center(child: Text('Nothing here', style: TextStyle(color: Colors.black54)));
    return RefreshIndicator(
      onRefresh: _load,
      child: ListView.separated(
        padding: const EdgeInsets.all(12),
        itemCount: users.length,
        separatorBuilder: (_, __) => const SizedBox(height: 6),
        itemBuilder: (_, i) {
          final u = users[i];
          final name = '${u['firstName'] ?? ''} ${u['lastName'] ?? ''}'.trim();
          final busy = _busyId == u['id']?.toString();
          return Card(
            child: ListTile(
              leading: CircleAvatar(
                backgroundImage: u['profileImage'] != null ? NetworkImage(u['profileImage'].toString()) : null,
                child: u['profileImage'] == null ? const Icon(Icons.person_outline) : null,
              ),
              title: Text(name.isEmpty ? 'User' : name, style: const TextStyle(fontWeight: FontWeight.w600)),
              subtitle: Text('${u['email'] ?? ''} · ${u['userType']?.toString().replaceAll('_', ' ') ?? ''}'),
              trailing: busy
                  ? const SizedBox(width: 24, height: 24, child: CircularProgressIndicator(strokeWidth: 2))
                  : Wrap(spacing: 2, children: [
                      if (allowApprove)
                        IconButton(
                          icon: const Icon(Icons.check_circle, color: Colors.green, size: 22),
                          tooltip: 'Approve',
                          onPressed: () => _act(u['id']?.toString() ?? '', 'approve'),
                        ),
                      if (allowSuspend)
                        IconButton(
                          icon: const Icon(Icons.block, color: Colors.red, size: 22),
                          tooltip: 'Suspend',
                          onPressed: () => _confirmSuspend(u),
                        ),
                    ]),
            ),
          );
        },
      ),
    );
  }

  Future<void> _confirmSuspend(Map<String, dynamic> u) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        title: Text('Suspend ${u['firstName']} ${u['lastName']}?'),
        content: const Text('The user will not be able to sign in until reactivated.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
          FilledButton(style: FilledButton.styleFrom(backgroundColor: Colors.red), onPressed: () => Navigator.pop(context, true), child: const Text('Suspend')),
        ],
      ),
    );
    if (ok == true) _act(u['id']?.toString() ?? '', 'suspend');
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) return const Center(child: CircularProgressIndicator());
    return Column(
      children: [
        TabBar(
          controller: _subTabs,
          labelColor: MediWyzColors.teal,
          indicatorColor: MediWyzColors.teal,
          tabs: [
            Tab(text: 'Active (${_buckets['active']!.length})'),
            Tab(text: 'Pending (${_buckets['pending']!.length})'),
            Tab(text: 'Suspended (${_buckets['suspended']!.length})'),
          ],
        ),
        Expanded(
          child: TabBarView(
            controller: _subTabs,
            children: [
              _userList(_buckets['active']!, allowApprove: false, allowSuspend: true),
              _userList(_buckets['pending']!, allowApprove: true, allowSuspend: false),
              _userList(_buckets['suspended']!, allowApprove: true, allowSuspend: false),
            ],
          ),
        ),
      ],
    );
  }

  @override
  void dispose() {
    _subTabs.dispose();
    super.dispose();
  }
}

// ─── Roles tab ────────────────────────────────────────────────────────────

class _RolesTab extends StatefulWidget {
  const _RolesTab();
  @override
  State<_RolesTab> createState() => _RolesTabState();
}

class _RolesTabState extends State<_RolesTab> {
  List<Map<String, dynamic>> _roles = [];
  bool _loading = true;

  @override
  void initState() { super.initState(); _load(); }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final res = await ApiClient.instance.get('/roles');
      final data = (res.data as Map?)?['data'] as List?;
      setState(() {
        _roles = data?.map((e) => Map<String, dynamic>.from(e as Map)).toList() ?? [];
        _loading = false;
      });
    } catch (_) { if (mounted) setState(() => _loading = false); }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) return const Center(child: CircularProgressIndicator());
    return RefreshIndicator(
      onRefresh: _load,
      child: ListView.separated(
        padding: const EdgeInsets.all(12),
        itemCount: _roles.length,
        separatorBuilder: (_, __) => const SizedBox(height: 6),
        itemBuilder: (_, i) {
          final r = _roles[i];
          final isActive = r['isActive'] == true;
          return Card(
            child: ListTile(
              leading: CircleAvatar(
                backgroundColor: Color(int.tryParse('0xFF${(r['color']?.toString() ?? '0C6780').replaceAll('#', '')}') ?? 0xFF0C6780).withValues(alpha: 0.15),
                child: Icon(Icons.badge_outlined, color: Color(int.tryParse('0xFF${(r['color']?.toString() ?? '0C6780').replaceAll('#', '')}') ?? 0xFF0C6780)),
              ),
              title: Text(r['label']?.toString() ?? r['code']?.toString() ?? 'Role', style: const TextStyle(fontWeight: FontWeight.w600)),
              subtitle: Text('code: ${r['code']} · ${r['providerCount'] ?? 0} providers'),
              trailing: Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(color: (isActive ? Colors.green : Colors.grey).withValues(alpha: 0.15), borderRadius: BorderRadius.circular(10)),
                child: Text(isActive ? 'Active' : 'Inactive', style: TextStyle(color: isActive ? Colors.green.shade700 : Colors.grey.shade700, fontSize: 10, fontWeight: FontWeight.w600)),
              ),
            ),
          );
        },
      ),
    );
  }
}

// ─── Required docs tab ────────────────────────────────────────────────────

class _RequiredDocsTab extends StatefulWidget {
  const _RequiredDocsTab();
  @override
  State<_RequiredDocsTab> createState() => _RequiredDocsTabState();
}

class _RequiredDocsTabState extends State<_RequiredDocsTab> {
  Map<String, List<Map<String, dynamic>>> _grouped = {};
  bool _loading = true;

  @override
  void initState() { super.initState(); _load(); }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final res = await ApiClient.instance.get('/required-documents');
      final data = (res.data as Map?)?['data'];
      if (data is Map) {
        _grouped = {};
        data.forEach((key, value) {
          if (value is List) {
            _grouped[key.toString()] = value.map((e) => Map<String, dynamic>.from(e as Map)).toList();
          }
        });
      }
      setState(() => _loading = false);
    } catch (_) { if (mounted) setState(() => _loading = false); }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) return const Center(child: CircularProgressIndicator());
    if (_grouped.isEmpty) return const Center(child: Text('No document requirements configured', style: TextStyle(color: Colors.black54)));
    final roles = _grouped.keys.toList()..sort();
    return ListView(
      padding: const EdgeInsets.all(12),
      children: roles.map((role) => Card(
        child: ExpansionTile(
          leading: const Icon(Icons.folder_outlined, color: MediWyzColors.teal),
          title: Text(role, style: const TextStyle(fontWeight: FontWeight.w600)),
          subtitle: Text('${_grouped[role]!.length} required'),
          children: _grouped[role]!.map((d) => ListTile(
            leading: Icon(d['required'] == true ? Icons.priority_high : Icons.info_outline, size: 16, color: d['required'] == true ? Colors.orange : Colors.blue),
            title: Text(d['documentName']?.toString() ?? '', style: const TextStyle(fontSize: 13)),
            dense: true,
          )).toList(),
        ),
      )).toList(),
    );
  }
}

// ─── Document verification queue ──────────────────────────────────────────

class _DocQueueTab extends StatefulWidget {
  const _DocQueueTab();
  @override
  State<_DocQueueTab> createState() => _DocQueueTabState();
}

class _DocQueueTabState extends State<_DocQueueTab> {
  List<Map<String, dynamic>> _docs = [];
  bool _loading = true;

  @override
  void initState() { super.initState(); _load(); }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final res = await ApiClient.instance.get('/admin/documents/pending');
      final data = (res.data as Map?)?['data'] as List?;
      setState(() {
        _docs = data?.map((e) => Map<String, dynamic>.from(e as Map)).toList() ?? [];
        _loading = false;
      });
    } catch (_) { if (mounted) setState(() => _loading = false); }
  }

  Future<void> _approve(String id) async {
    try { await ApiClient.instance.patch('/admin/documents/$id/approve'); _load(); } catch (_) {}
  }

  Future<void> _reject(String id) async {
    final ctrl = TextEditingController();
    final reason = await showDialog<String?>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Rejection reason'),
        content: TextField(controller: ctrl, maxLines: 3, decoration: const InputDecoration(border: OutlineInputBorder())),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
          FilledButton(style: FilledButton.styleFrom(backgroundColor: Colors.red), onPressed: () => Navigator.pop(context, ctrl.text.trim()), child: const Text('Reject')),
        ],
      ),
    );
    if (reason == null) return;
    try { await ApiClient.instance.patch('/admin/documents/$id/reject', data: {'reason': reason}); _load(); } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) return const Center(child: CircularProgressIndicator());
    if (_docs.isEmpty) return const Center(child: Text('No documents awaiting review', style: TextStyle(color: Colors.black54)));
    return RefreshIndicator(
      onRefresh: _load,
      child: ListView.separated(
        padding: const EdgeInsets.all(12),
        itemCount: _docs.length,
        separatorBuilder: (_, __) => const SizedBox(height: 6),
        itemBuilder: (_, i) {
          final d = _docs[i];
          final u = d['user'] is Map ? d['user'] as Map : {};
          final name = '${u['firstName'] ?? ''} ${u['lastName'] ?? ''}'.trim();
          return Card(
            child: ListTile(
              leading: const CircleAvatar(backgroundColor: MediWyzColors.sky, child: Icon(Icons.description_outlined, color: MediWyzColors.navy)),
              title: Text(d['name']?.toString() ?? 'Document', style: const TextStyle(fontWeight: FontWeight.w600)),
              subtitle: Text('${name.isEmpty ? 'User' : name} · ${d['type'] ?? ''}', style: const TextStyle(fontSize: 12)),
              trailing: Wrap(spacing: 4, children: [
                IconButton(icon: const Icon(Icons.check, color: Colors.green), onPressed: () => _approve(d['id']?.toString() ?? '')),
                IconButton(icon: const Icon(Icons.close, color: Colors.red), onPressed: () => _reject(d['id']?.toString() ?? '')),
              ]),
            ),
          );
        },
      ),
    );
  }
}

// ─── Audit log ────────────────────────────────────────────────────────────

class _AuditLogTab extends StatefulWidget {
  const _AuditLogTab();
  @override
  State<_AuditLogTab> createState() => _AuditLogTabState();
}

class _AuditLogTabState extends State<_AuditLogTab> {
  List<Map<String, dynamic>> _entries = [];
  bool _loading = true;

  @override
  void initState() { super.initState(); _load(); }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final res = await ApiClient.instance.get('/admin/audit-log', queryParameters: {'limit': 200});
      final data = (res.data as Map?)?['data'] as List?;
      setState(() {
        _entries = data?.map((e) => Map<String, dynamic>.from(e as Map)).toList() ?? [];
        _loading = false;
      });
    } catch (_) { if (mounted) setState(() => _loading = false); }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) return const Center(child: CircularProgressIndicator());
    if (_entries.isEmpty) return const Center(child: Text('No audit entries yet', style: TextStyle(color: Colors.black54)));
    return RefreshIndicator(
      onRefresh: _load,
      child: ListView.separated(
        padding: const EdgeInsets.all(12),
        itemCount: _entries.length,
        separatorBuilder: (_, __) => const Divider(height: 1),
        itemBuilder: (_, i) {
          final e = _entries[i];
          final at = DateTime.tryParse(e['createdAt']?.toString() ?? '');
          return ListTile(
            leading: CircleAvatar(
              backgroundColor: _actionColor(e['action']).withValues(alpha: 0.15),
              child: Icon(Icons.history, size: 18, color: _actionColor(e['action'])),
            ),
            title: Text(e['action']?.toString() ?? '—', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
            subtitle: Text('${e['targetType'] ?? ''} · ${e['adminId']?.toString().substring(0, 8) ?? ''}', style: const TextStyle(fontSize: 11)),
            trailing: Text(at == null ? '' : '${at.day}/${at.month} ${at.hour.toString().padLeft(2, '0')}:${at.minute.toString().padLeft(2, '0')}', style: const TextStyle(fontSize: 11, color: Colors.black45)),
          );
        },
      ),
    );
  }

  Color _actionColor(dynamic action) {
    final s = action?.toString() ?? '';
    if (s.contains('approve')) return Colors.green;
    if (s.contains('reject') || s.contains('suspend')) return Colors.red;
    return MediWyzColors.teal;
  }
}
