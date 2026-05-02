import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../api/client.dart';
import '../services/auth_service.dart';
import '../theme/mediwyz_theme.dart';
import '../widgets/app_drawer.dart';
import '../widgets/bottom_nav.dart';
import '../widgets/skeleton.dart';

class ChatListScreen extends ConsumerStatefulWidget {
  const ChatListScreen({super.key});
  @override
  ConsumerState<ChatListScreen> createState() => _ChatListScreenState();
}

class _ChatListScreenState extends ConsumerState<ChatListScreen> {
  List<Map<String, dynamic>> _conversations = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final res = await ApiClient.instance.get('/conversations');
      final data = (res.data as Map?)?['data'] as List?;
      setState(() {
        _conversations = data?.map((e) => Map<String, dynamic>.from(e as Map)).toList() ?? [];
        _loading = false;
      });
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  /// Pick the other participant so the conversation line shows who you're chatting with.
  Map<String, dynamic>? _otherParticipant(Map<String, dynamic> c, String? myId) {
    final participants = (c['participants'] as List?) ?? [];
    for (final p in participants) {
      if (p is! Map) continue;
      if (p['userId']?.toString() != myId) {
        return Map<String, dynamic>.from(p);
      }
    }
    return participants.isNotEmpty ? Map<String, dynamic>.from(participants.first as Map) : null;
  }

  String _timeAgo(String iso) {
    final dt = DateTime.tryParse(iso);
    if (dt == null) return '';
    final diff = DateTime.now().difference(dt);
    if (diff.inMinutes < 1) return 'now';
    if (diff.inMinutes < 60) return '${diff.inMinutes}m';
    if (diff.inHours < 24) return '${diff.inHours}h';
    if (diff.inDays < 7) return '${diff.inDays}d';
    return '${dt.day}/${dt.month}';
  }

  @override
  Widget build(BuildContext context) {
    final myId = ref.watch(authProvider).user?['id']?.toString();

    return Scaffold(
      appBar: AppBar(title: const Text('Messages', style: TextStyle(fontWeight: FontWeight.bold))),
      drawer: const AppDrawer(),
      body: Column(
        children: [
          // Pinned AI Assistant — any user can chat with the bot inline.
          Material(
            color: Colors.white,
            child: ListTile(
              leading: const CircleAvatar(
                radius: 24,
                backgroundColor: MediWyzColors.sky,
                child: Icon(Icons.auto_awesome, color: MediWyzColors.navy),
              ),
              title: const Row(children: [
                Expanded(child: Text('AI Health Assistant',
                  style: TextStyle(fontWeight: FontWeight.bold, color: MediWyzColors.navy))),
                Icon(Icons.push_pin, size: 14, color: Colors.black26),
              ]),
              subtitle: const Text('Always online · ask anything about health',
                maxLines: 1, overflow: TextOverflow.ellipsis,
                style: TextStyle(fontSize: 13, color: Colors.black54)),
              onTap: () => context.go('/chat/ai-assistant'),
            ),
          ),
          const Divider(height: 1),
          Expanded(
            child: _loading
                ? const SkeletonList(lineCount: 8)
                : _conversations.isEmpty
                    ? const EmptyState(icon: Icons.chat_bubble_outline, title: 'No conversations yet', description: 'Messages from your providers will appear here.')
                    : RefreshIndicator(
                  onRefresh: _load,
                  child: ListView.separated(
                    itemCount: _conversations.length,
                    separatorBuilder: (_, __) => const Divider(height: 1, indent: 72),
                    itemBuilder: (_, i) {
                      final c = _conversations[i];
                      final peer = _otherParticipant(c, myId) ?? {};
                      final peerName = '${peer['firstName'] ?? ''} ${peer['lastName'] ?? ''}'.trim();
                      final role = peer['userType']?.toString().replaceAll('_', ' ').toLowerCase();

                      final lastMessage = c['lastMessage'] is Map
                          ? Map<String, dynamic>.from(c['lastMessage'] as Map)
                          : null;
                      final preview = lastMessage?['content']?.toString() ?? 'No messages yet';
                      final when = lastMessage?['createdAt']?.toString() ?? c['updatedAt']?.toString() ?? '';
                      final unread = (c['unreadCount'] as int?) ?? 0;

                      return ListTile(
                        leading: CircleAvatar(
                          radius: 24,
                          backgroundColor: MediWyzColors.sky,
                          backgroundImage: peer['avatarUrl'] != null ? NetworkImage(peer['avatarUrl'].toString()) : null,
                          child: peer['avatarUrl'] == null
                              ? const Icon(Icons.person, color: MediWyzColors.navy)
                              : null,
                        ),
                        title: Row(
                          children: [
                            Expanded(
                              child: Text(
                                peerName.isEmpty ? 'Conversation' : peerName,
                                style: TextStyle(
                                  fontWeight: unread > 0 ? FontWeight.bold : FontWeight.w600,
                                  color: MediWyzColors.navy,
                                ),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                            if (when.isNotEmpty)
                              Text(
                                _timeAgo(when),
                                style: const TextStyle(fontSize: 11, color: Colors.black45),
                              ),
                          ],
                        ),
                        subtitle: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            if (role != null && role.isNotEmpty)
                              Text(role, style: const TextStyle(fontSize: 11, color: Colors.black45)),
                            const SizedBox(height: 2),
                            Text(
                              preview,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: TextStyle(
                                fontSize: 13,
                                color: unread > 0 ? MediWyzColors.navy : Colors.black54,
                                fontWeight: unread > 0 ? FontWeight.w500 : FontWeight.normal,
                              ),
                            ),
                          ],
                        ),
                        trailing: unread > 0
                            ? Container(
                                padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                                decoration: BoxDecoration(
                                  color: MediWyzColors.teal,
                                  borderRadius: BorderRadius.circular(10),
                                ),
                                child: Text('$unread', style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold)),
                              )
                            : null,
                        onTap: () {
                          final id = c['id']?.toString() ?? '';
                          if (id.isNotEmpty) {
                            context.go('/chat/$id?title=${Uri.encodeComponent(peerName)}');
                          }
                        },
                      );
                    },
                  ),
                ),
          ),
        ],
      ),
      bottomNavigationBar: const MediWyzBottomNav(currentIndex: 1),
    );
  }
}
