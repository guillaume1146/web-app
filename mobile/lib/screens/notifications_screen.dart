import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../api/client.dart';
import '../services/auth_service.dart';
import '../services/socket_service.dart';
import '../theme/mediwyz_theme.dart';

class NotificationsScreen extends ConsumerStatefulWidget {
  const NotificationsScreen({super.key});
  @override
  ConsumerState<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends ConsumerState<NotificationsScreen> {
  List<Map<String, dynamic>> _items = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
    _wireSocket();
  }

  Future<void> _load() async {
    final user = ref.read(authProvider).user;
    if (user == null) return;
    try {
      final res = await ApiClient.instance.get('/users/${user['id']}/notifications');
      final data = (res.data as Map?)?['data'] as List?;
      setState(() {
        _items = data?.map((e) => Map<String, dynamic>.from(e as Map)).toList() ?? [];
        _loading = false;
      });
    } catch (_) {
      setState(() => _loading = false);
    }
  }

  void _wireSocket() {
    final user = ref.read(authProvider).user;
    if (user == null) return;
    final socket = SocketService.connect(userId: user['id'].toString());
    socket.on('notification:new', (raw) {
      if (raw is! Map) return;
      if (!mounted) return;
      setState(() => _items = [Map<String, dynamic>.from(raw), ..._items]);
    });
    socket.on('notification:read', (raw) {
      if (raw is! Map) return;
      final id = raw['id'];
      if (!mounted) return;
      setState(() => _items = _items.map((n) {
        if (n['id'] == id) return {...n, 'readAt': DateTime.now().toIso8601String()};
        return n;
      }).toList());
    });
    socket.on('notification:read-all', (_) {
      if (!mounted) return;
      final now = DateTime.now().toIso8601String();
      setState(() => _items = _items.map((n) => {...n, 'readAt': n['readAt'] ?? now}).toList());
    });
  }

  Future<void> _markRead(String id) async {
    try {
      final user = ref.read(authProvider).user;
      await ApiClient.instance.patch('/users/${user!['id']}/notifications/$id');
    } catch (_) { /* server broadcasts via socket, UI updates via listener */ }
  }

  Future<void> _markAllRead() async {
    try {
      final user = ref.read(authProvider).user;
      await ApiClient.instance.patch('/users/${user!['id']}/notifications');
    } catch (_) {}
  }

  IconData _iconFor(String? type) {
    switch (type) {
      case 'booking': return Icons.event_note;
      case 'payment': return Icons.payment;
      case 'message': return Icons.chat_bubble_outline;
      case 'workflow': return Icons.sync_alt;
      case 'review': return Icons.star_outline;
      case 'system': return Icons.info_outline;
      default: return Icons.notifications_none;
    }
  }

  @override
  Widget build(BuildContext context) {
    final unread = _items.where((n) => n['readAt'] == null).length;
    return Scaffold(
      appBar: AppBar(
        title: Text(unread > 0 ? 'Notifications ($unread)' : 'Notifications',
            style: const TextStyle(fontWeight: FontWeight.bold)),
        actions: [
          if (_items.any((n) => n['readAt'] == null))
            TextButton(onPressed: _markAllRead, child: const Text('Mark all read')),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _items.isEmpty
              ? const Center(child: Text('No notifications', style: TextStyle(color: Colors.black54)))
              : RefreshIndicator(
                  onRefresh: _load,
                  child: ListView.separated(
                    itemCount: _items.length,
                    separatorBuilder: (_, __) => const Divider(height: 1),
                    itemBuilder: (_, i) {
                      final n = _items[i];
                      final isUnread = n['readAt'] == null;
                      return ListTile(
                        tileColor: isUnread ? MediWyzColors.sky.withValues(alpha: 0.12) : null,
                        leading: CircleAvatar(
                          backgroundColor: MediWyzColors.teal.withValues(alpha: 0.12),
                          child: Icon(_iconFor(n['type']?.toString()), color: MediWyzColors.teal, size: 20),
                        ),
                        title: Text(
                          n['title']?.toString() ?? '',
                          style: TextStyle(fontWeight: isUnread ? FontWeight.w600 : FontWeight.w400),
                        ),
                        subtitle: Text(n['message']?.toString() ?? ''),
                        trailing: isUnread
                            ? const CircleAvatar(radius: 4, backgroundColor: MediWyzColors.teal)
                            : null,
                        onTap: () {
                          if (isUnread) _markRead(n['id']?.toString() ?? '');
                        },
                      );
                    },
                  ),
                ),
    );
  }
}
