import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../api/client.dart';
import '../services/auth_service.dart';
import '../theme/mediwyz_theme.dart';

/// Inline AI assistant chat — same shell as ChatRoomScreen, but talks to
/// `/api/ai/chat` instead of a Socket.IO conversation. Reached from the
/// pinned "AI Health Assistant" row at the top of the chat list.
class AiChatScreen extends ConsumerStatefulWidget {
  const AiChatScreen({super.key});
  @override
  ConsumerState<AiChatScreen> createState() => _AiChatScreenState();
}

class _AiChatScreenState extends ConsumerState<AiChatScreen> {
  final _scrollController = ScrollController();
  final _input = TextEditingController();
  final List<_Msg> _messages = [];
  bool _sending = false;

  String? _sessionId;
  List<Map<String, dynamic>> _sessions = [];

  @override
  void initState() {
    super.initState();
    _addGreeting();
    _loadSessions();
  }

  void _addGreeting() {
    final user = ref.read(authProvider).user;
    final name = user?['firstName']?.toString();
    _messages.add(_Msg(
      role: 'ai',
      content: name != null && name.isNotEmpty
          ? "Hi $name! I'm your AI health assistant. Ask me about nutrition, symptoms, exercise, sleep, or general wellbeing."
          : "Hi! I'm your AI health assistant. Ask me anything — nutrition, symptoms, exercise, sleep, or general wellbeing.",
      at: DateTime.now(),
    ));
  }

  Future<void> _loadSessions() async {
    try {
      final res = await ApiClient.instance.get('/ai/chat');
      final data = (res.data as Map?)?['data'] as List?;
      if (mounted) {
        setState(() {
          _sessions = data?.map((e) => Map<String, dynamic>.from(e as Map)).toList() ?? [];
        });
      }
    } catch (_) { /* silent */ }
  }

  Future<void> _openSession(String sessionId) async {
    setState(() {
      _sessionId = sessionId;
      _messages.clear();
    });
    try {
      final res = await ApiClient.instance.get('/ai/chat/$sessionId');
      final data = (res.data as Map?)?['data'] as Map?;
      final msgs = (data?['messages'] as List?) ?? [];
      for (final m in msgs) {
        final mm = m as Map;
        _messages.add(_Msg(
          role: mm['role']?.toString() == 'user' ? 'user' : 'ai',
          content: mm['content']?.toString() ?? '',
          at: DateTime.tryParse(mm['createdAt']?.toString() ?? '') ?? DateTime.now(),
        ));
      }
      if (_messages.isEmpty) _addGreeting();
    } catch (_) {
      _addGreeting();
    }
    if (mounted) setState(() {});
    _scrollToBottom();
  }

  Future<void> _newSession() async {
    setState(() {
      _sessionId = null;
      _messages.clear();
      _addGreeting();
    });
  }

  Future<void> _deleteSession(String sessionId) async {
    try {
      await ApiClient.instance.delete('/ai/chat/$sessionId');
      if (_sessionId == sessionId) { await _newSession(); }
      await _loadSessions();
    } catch (_) {}
  }

  void _openSessionsDrawer() {
    showModalBottomSheet(
      context: context,
      showDragHandle: true,
      builder: (ctx) {
        return SafeArea(
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            const Padding(
              padding: EdgeInsets.fromLTRB(16, 0, 16, 4),
              child: Row(children: [
                Icon(Icons.history, size: 18, color: MediWyzColors.teal),
                SizedBox(width: 8),
                Text('Chat history', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
              ]),
            ),
            const Divider(height: 12),
            ListTile(
              leading: const Icon(Icons.add_circle_outline, color: MediWyzColors.teal),
              title: const Text('New chat'),
              onTap: () { Navigator.pop(ctx); _newSession(); },
            ),
            if (_sessions.isNotEmpty) const Divider(height: 0),
            Flexible(
              child: _sessions.isEmpty
                  ? const Padding(
                      padding: EdgeInsets.symmetric(vertical: 20),
                      child: Center(child: Text('No past sessions yet', style: TextStyle(color: Colors.black54))),
                    )
                  : ListView.separated(
                      shrinkWrap: true,
                      itemCount: _sessions.length,
                      separatorBuilder: (_, __) => const Divider(height: 0, indent: 56),
                      itemBuilder: (_, i) {
                        final s = _sessions[i];
                        final id = s['id']?.toString() ?? '';
                        final title = s['title']?.toString() ?? 'Chat';
                        final updated = s['updatedAt']?.toString() ?? '';
                        return ListTile(
                          dense: true,
                          leading: const Icon(Icons.chat_bubble_outline, size: 18),
                          title: Text(title, maxLines: 1, overflow: TextOverflow.ellipsis),
                          subtitle: Text(updated.split('T').first, style: const TextStyle(fontSize: 11)),
                          trailing: IconButton(
                            icon: const Icon(Icons.delete_outline, size: 18, color: Colors.red),
                            onPressed: () { Navigator.pop(ctx); _deleteSession(id); },
                          ),
                          onTap: () { Navigator.pop(ctx); _openSession(id); },
                        );
                      },
                    ),
            ),
          ]),
        );
      },
    );
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 200),
          curve: Curves.easeOut,
        );
      }
    });
  }

  Future<void> _send() async {
    final text = _input.text.trim();
    if (text.isEmpty || _sending) return;
    _input.clear();
    setState(() {
      _messages.add(_Msg(role: 'user', content: text, at: DateTime.now()));
      _messages.add(_Msg(role: 'ai', content: 'Typing…', at: DateTime.now(), isTyping: true));
      _sending = true;
    });
    _scrollToBottom();

    String reply;
    try {
      final res = await ApiClient.instance.post('/ai/chat', data: {
        'message': text,
        if (_sessionId != null) 'sessionId': _sessionId,
      });
      final data = (res.data as Map?)?['data'] as Map?;
      // Persist the new sessionId so subsequent messages stay in the same thread.
      final newSessionId = data?['sessionId']?.toString();
      if (newSessionId != null && newSessionId != _sessionId) {
        _sessionId = newSessionId;
        _loadSessions(); // refresh drawer list in background
      }
      reply = data?['response']?.toString()
          ?? data?['message']?.toString()
          ?? "Sorry, I couldn't respond right now.";
    } catch (_) {
      reply = 'AI is unavailable right now — please try again in a moment.';
    }

    if (!mounted) return;
    setState(() {
      _messages.removeWhere((m) => m.isTyping);
      _messages.add(_Msg(role: 'ai', content: reply, at: DateTime.now()));
      _sending = false;
    });
    _scrollToBottom();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Row(children: [
          const CircleAvatar(
            radius: 16,
            backgroundColor: MediWyzColors.sky,
            child: Icon(Icons.auto_awesome, size: 18, color: MediWyzColors.navy),
          ),
          const SizedBox(width: 10),
          Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: const [
              Text('AI Health Assistant', style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold)),
              Text('Always online', style: TextStyle(fontSize: 11, color: Colors.black54, fontWeight: FontWeight.normal)),
            ],
          ),
        ]),
        actions: [
          IconButton(
            icon: const Icon(Icons.history),
            tooltip: 'Chat history',
            onPressed: _openSessionsDrawer,
          ),
          IconButton(
            icon: const Icon(Icons.add_comment_outlined),
            tooltip: 'New chat',
            onPressed: _newSession,
          ),
        ],
      ),
      body: Column(
        children: [
          Expanded(
            child: ListView.builder(
              controller: _scrollController,
              padding: const EdgeInsets.all(12),
              itemCount: _messages.length,
              itemBuilder: (_, i) => _MsgBubble(msg: _messages[i]),
            ),
          ),
          SafeArea(
            top: false,
            child: Padding(
              padding: const EdgeInsets.fromLTRB(12, 8, 12, 10),
              child: Row(children: [
                Expanded(
                  child: TextField(
                    controller: _input,
                    minLines: 1, maxLines: 4,
                    textCapitalization: TextCapitalization.sentences,
                    decoration: InputDecoration(
                      hintText: 'Ask anything…',
                      filled: true,
                      fillColor: Colors.grey[100],
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(24),
                        borderSide: BorderSide.none,
                      ),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                    ),
                    onSubmitted: (_) => _send(),
                  ),
                ),
                const SizedBox(width: 8),
                Material(
                  color: MediWyzColors.teal,
                  shape: const CircleBorder(),
                  child: InkWell(
                    customBorder: const CircleBorder(),
                    onTap: _sending ? null : _send,
                    child: Padding(
                      padding: const EdgeInsets.all(10),
                      child: _sending
                          ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                          : const Icon(Icons.send, color: Colors.white, size: 20),
                    ),
                  ),
                ),
              ]),
            ),
          ),
        ],
      ),
    );
  }

  @override
  void dispose() {
    _input.dispose();
    _scrollController.dispose();
    super.dispose();
  }
}

class _Msg {
  final String role; // 'ai' | 'user'
  final String content;
  final DateTime at;
  final bool isTyping;
  _Msg({required this.role, required this.content, required this.at, this.isTyping = false});
}

class _MsgBubble extends StatelessWidget {
  final _Msg msg;
  const _MsgBubble({required this.msg});
  @override
  Widget build(BuildContext context) {
    final isUser = msg.role == 'user';
    return Align(
      alignment: isUser ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.78),
        margin: const EdgeInsets.symmetric(vertical: 4),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: isUser ? MediWyzColors.teal : Colors.grey[200],
          borderRadius: BorderRadius.only(
            topLeft: const Radius.circular(16),
            topRight: const Radius.circular(16),
            bottomLeft: Radius.circular(isUser ? 16 : 4),
            bottomRight: Radius.circular(isUser ? 4 : 16),
          ),
        ),
        child: Text(
          msg.content,
          style: TextStyle(
            color: isUser ? Colors.white : Colors.black87,
            fontStyle: msg.isTyping ? FontStyle.italic : FontStyle.normal,
          ),
        ),
      ),
    );
  }
}
