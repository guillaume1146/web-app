import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../api/chat_api.dart';
import '../services/auth_service.dart';
import '../services/socket_service.dart';
import '../theme/mediwyz_theme.dart';

class ChatRoomScreen extends ConsumerStatefulWidget {
  final String conversationId;
  final String? title;
  const ChatRoomScreen({super.key, required this.conversationId, this.title});

  @override
  ConsumerState<ChatRoomScreen> createState() => _ChatRoomScreenState();
}

class _ChatRoomScreenState extends ConsumerState<ChatRoomScreen> {
  final _input = TextEditingController();
  final _scroll = ScrollController();
  List<Map<String, dynamic>> _messages = [];
  bool _loading = true;
  bool _peerTyping = false;

  @override
  void initState() {
    super.initState();
    _load();
    _wireSocket();
  }

  Future<void> _load() async {
    final msgs = await ChatApi.messages(widget.conversationId);
    if (!mounted) return;
    setState(() {
      _messages = msgs;
      _loading = false;
    });
    _scrollToBottom();
  }

  void _wireSocket() {
    final user = ref.read(authProvider).user;
    if (user == null) return;
    final socket = SocketService.connect(userId: user['id'].toString());

    // Join the conversation room (matches ChatGateway contract).
    socket.emit('chat:join-conversation', {'conversationId': widget.conversationId});

    socket.on('chat:message:new', (raw) {
      if (raw is! Map) return;
      final m = Map<String, dynamic>.from(raw);
      if (m['conversationId'] != widget.conversationId) return;
      if (!mounted) return;
      setState(() => _messages = [..._messages, m]);
      _scrollToBottom();
    });

    socket.on('chat:typing', (raw) {
      if (raw is! Map) return;
      if (raw['conversationId'] != widget.conversationId) return;
      if (raw['userId'] == user['id']) return;
      if (!mounted) return;
      setState(() => _peerTyping = true);
      Future.delayed(const Duration(seconds: 3), () {
        if (mounted) setState(() => _peerTyping = false);
      });
    });
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scroll.hasClients) {
        _scroll.animateTo(
          _scroll.position.maxScrollExtent,
          duration: const Duration(milliseconds: 200),
          curve: Curves.easeOut,
        );
      }
    });
  }

  Future<void> _send() async {
    final text = _input.text.trim();
    if (text.isEmpty) return;
    _input.clear();
    final user = ref.read(authProvider).user;
    final socket = SocketService.current;

    // Optimistic append
    if (mounted) {
      setState(() => _messages = [
            ..._messages,
            {
              'id': 'tmp-${DateTime.now().millisecondsSinceEpoch}',
              'content': text,
              'senderId': user?['id'],
              'createdAt': DateTime.now().toIso8601String(),
            },
          ]);
      _scrollToBottom();
    }

    if (socket?.connected == true) {
      // Backend listens for 'chat:send' (NestJS ChatGateway).
      socket!.emit('chat:send', {
        'conversationId': widget.conversationId,
        'content': text,
      });
    } else {
      // HTTP fallback — keeps UI working when socket is offline
      await ChatApi.sendMessage(widget.conversationId, text);
    }
  }

  @override
  void dispose() {
    _input.dispose();
    _scroll.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final currentUserId = ref.watch(authProvider).user?['id'];
    return Scaffold(
      appBar: AppBar(title: Text(widget.title ?? 'Chat')),
      body: Column(
        children: [
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator())
                : ListView.builder(
                    controller: _scroll,
                    padding: const EdgeInsets.all(12),
                    itemCount: _messages.length,
                    itemBuilder: (_, i) {
                      final m = _messages[i];
                      final mine = m['senderId'] == currentUserId;
                      return Align(
                        alignment: mine ? Alignment.centerRight : Alignment.centerLeft,
                        child: Container(
                          constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.75),
                          margin: const EdgeInsets.symmetric(vertical: 4),
                          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                          decoration: BoxDecoration(
                            color: mine ? MediWyzColors.teal : Colors.white,
                            borderRadius: BorderRadius.circular(14),
                            boxShadow: const [
                              BoxShadow(color: Color(0x11000000), blurRadius: 4, offset: Offset(0, 1)),
                            ],
                          ),
                          child: Text(
                            m['content']?.toString() ?? '',
                            style: TextStyle(color: mine ? Colors.white : MediWyzColors.navy),
                          ),
                        ),
                      );
                    },
                  ),
          ),
          if (_peerTyping)
            const Padding(
              padding: EdgeInsets.symmetric(horizontal: 16, vertical: 4),
              child: Row(children: [
                SizedBox(width: 12, height: 12, child: CircularProgressIndicator(strokeWidth: 1.5)),
                SizedBox(width: 8),
                Text('Typing…', style: TextStyle(color: Colors.black54, fontSize: 12)),
              ]),
            ),
          SafeArea(
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
              color: Colors.white,
              child: Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _input,
                      decoration: const InputDecoration(
                        hintText: 'Type a message',
                        border: InputBorder.none,
                      ),
                      onSubmitted: (_) => _send(),
                      onChanged: (_) {
                        SocketService.current?.emit('chat:typing', {
                          'conversationId': widget.conversationId,
                          'userId': currentUserId,
                        });
                      },
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.send, color: MediWyzColors.teal),
                    onPressed: _send,
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
