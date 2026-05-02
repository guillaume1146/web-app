import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../api/client.dart';
import '../services/auth_service.dart';
import '../theme/mediwyz_theme.dart';

class ConnectionsScreen extends ConsumerStatefulWidget {
  const ConnectionsScreen({super.key});
  @override
  ConsumerState<ConnectionsScreen> createState() => _ConnectionsScreenState();
}

class _ConnectionsScreenState extends ConsumerState<ConnectionsScreen> with SingleTickerProviderStateMixin {
  late TabController _tabs;
  List<Map<String, dynamic>> _accepted = [];
  List<Map<String, dynamic>> _pending = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _tabs = TabController(length: 2, vsync: this);
    _load();
  }

  Future<void> _load() async {
    final user = ref.read(authProvider).user;
    if (user == null) return;
    setState(() => _loading = true);
    try {
      final results = await Future.wait([
        ApiClient.instance.get('/connections', queryParameters: {'userId': user['id'], 'status': 'accepted'}),
        ApiClient.instance.get('/connections', queryParameters: {'userId': user['id'], 'type': 'received', 'status': 'pending'}),
      ]);
      final a = (results[0].data as Map?)?['data'] as List?;
      final p = (results[1].data as Map?)?['data'] as List?;
      setState(() {
        _accepted = a?.map((e) => Map<String, dynamic>.from(e as Map)).toList() ?? [];
        _pending = p?.map((e) => Map<String, dynamic>.from(e as Map)).toList() ?? [];
        _loading = false;
      });
    } catch (_) {
      setState(() => _loading = false);
    }
  }

  Future<void> _respond(String id, String action) async {
    try {
      await ApiClient.instance.patch('/connections/$id', data: {'action': action});
      await _load();
    } catch (_) {}
  }

  Widget _list(List<Map<String, dynamic>> items, {bool withActions = false}) {
    if (_loading) return const Center(child: CircularProgressIndicator());
    if (items.isEmpty) {
      return const Center(child: Padding(padding: EdgeInsets.all(30), child: Text('Nothing here', style: TextStyle(color: Colors.black54))));
    }
    return RefreshIndicator(
      onRefresh: _load,
      child: ListView.separated(
        padding: const EdgeInsets.all(12),
        itemCount: items.length,
        separatorBuilder: (_, __) => const SizedBox(height: 6),
        itemBuilder: (_, i) {
          final c = items[i];
          final sender = c['sender'] is Map ? c['sender'] as Map : {};
          final receiver = c['receiver'] is Map ? c['receiver'] as Map : {};
          final them = withActions ? sender : (c['peer'] is Map ? c['peer'] as Map : receiver);
          final name = '${them['firstName'] ?? ''} ${them['lastName'] ?? ''}'.trim();
          return Card(
            child: ListTile(
              leading: CircleAvatar(
                backgroundImage: them['profileImage'] != null ? NetworkImage(them['profileImage'].toString()) : null,
                child: them['profileImage'] == null ? const Icon(Icons.person_outline) : null,
              ),
              title: Text(name.isEmpty ? 'User' : name, style: const TextStyle(fontWeight: FontWeight.w600)),
              subtitle: Text(them['userType']?.toString().replaceAll('_', ' ') ?? ''),
              trailing: withActions
                  ? Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        IconButton(
                          icon: const Icon(Icons.check_circle, color: Colors.green),
                          tooltip: 'Accept',
                          onPressed: () => _respond(c['id']?.toString() ?? '', 'accept'),
                        ),
                        IconButton(
                          icon: const Icon(Icons.cancel_outlined, color: Colors.red),
                          tooltip: 'Decline',
                          onPressed: () => _respond(c['id']?.toString() ?? '', 'reject'),
                        ),
                      ],
                    )
                  : null,
            ),
          );
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Network', style: TextStyle(fontWeight: FontWeight.bold)),
        bottom: TabBar(
          controller: _tabs,
          labelColor: MediWyzColors.teal,
          indicatorColor: MediWyzColors.teal,
          tabs: [
            Tab(text: 'Connections (${_accepted.length})'),
            Tab(text: 'Requests (${_pending.length})'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabs,
        children: [
          _list(_accepted),
          _list(_pending, withActions: true),
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
