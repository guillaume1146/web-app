import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../api/client.dart';
import '../theme/mediwyz_theme.dart';

/// AI health assistant — chat with the GROQ-backed backend.
/// Session-scoped so follow-ups stay in context.
class AiAssistantScreen extends ConsumerStatefulWidget {
  const AiAssistantScreen({super.key});
  @override
  ConsumerState<AiAssistantScreen> createState() => _AiAssistantScreenState();
}

class _ChatTurn {
  final String role; // 'user' | 'assistant'
  final String text;
  _ChatTurn(this.role, this.text);
}

class _AiAssistantScreenState extends ConsumerState<AiAssistantScreen> {
  final _input = TextEditingController();
  final _scroll = ScrollController();
  final List<_ChatTurn> _turns = [
    _ChatTurn('assistant', 'Hi! I\'m your MediWyz AI health assistant. Ask me about symptoms, medications, or healthy habits. I can\'t diagnose, but I can help you understand what to do next.'),
  ];
  String? _sessionId;
  bool _busy = false;

  Future<void> _send() async {
    final msg = _input.text.trim();
    if (msg.isEmpty || _busy) return;
    _input.clear();
    setState(() {
      _turns.add(_ChatTurn('user', msg));
      _busy = true;
    });
    _scrollToBottom();
    try {
      final res = await ApiClient.instance.post('/ai/chat', data: {
        'message': msg,
        if (_sessionId != null) 'sessionId': _sessionId,
      });
      final data = (res.data as Map?)?['data'] as Map?;
      final reply = data?['response']?.toString()
        ?? data?['message']?.toString()
        ?? 'Sorry, I didn\'t catch that.';
      _sessionId = data?['sessionId']?.toString() ?? _sessionId;
      if (!mounted) return;
      setState(() => _turns.add(_ChatTurn('assistant', reply)));
    } catch (_) {
      if (!mounted) return;
      setState(() => _turns.add(_ChatTurn('assistant', 'Network error. Please try again.')));
    } finally {
      if (mounted) setState(() => _busy = false);
      _scrollToBottom();
    }
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scroll.hasClients) {
        _scroll.animateTo(_scroll.position.maxScrollExtent, duration: const Duration(milliseconds: 200), curve: Curves.easeOut);
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('AI Health Assistant', style: TextStyle(fontWeight: FontWeight.bold)),
      ),
      body: Column(
        children: [
          Expanded(
            child: ListView.builder(
              controller: _scroll,
              padding: const EdgeInsets.all(12),
              itemCount: _turns.length,
              itemBuilder: (_, i) {
                final t = _turns[i];
                final mine = t.role == 'user';
                return Align(
                  alignment: mine ? Alignment.centerRight : Alignment.centerLeft,
                  child: Container(
                    constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.8),
                    margin: const EdgeInsets.symmetric(vertical: 4),
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                    decoration: BoxDecoration(
                      color: mine ? MediWyzColors.teal : Colors.white,
                      borderRadius: BorderRadius.circular(14),
                      border: mine ? null : Border.all(color: Colors.grey.shade200),
                    ),
                    child: Text(t.text, style: TextStyle(color: mine ? Colors.white : MediWyzColors.navy)),
                  ),
                );
              },
            ),
          ),
          if (_busy)
            const Padding(
              padding: EdgeInsets.symmetric(horizontal: 16, vertical: 4),
              child: Row(
                children: [
                  SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2)),
                  SizedBox(width: 8),
                  Text('Thinking...', style: TextStyle(color: Colors.black54, fontSize: 12)),
                ],
              ),
            ),
          SafeArea(
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
              decoration: BoxDecoration(color: Colors.white, border: Border(top: BorderSide(color: Colors.grey.shade200))),
              child: Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _input,
                      decoration: const InputDecoration(
                        hintText: 'Ask about a symptom, a medicine...',
                        border: InputBorder.none,
                      ),
                      minLines: 1,
                      maxLines: 4,
                      onSubmitted: (_) => _send(),
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.send, color: MediWyzColors.teal),
                    onPressed: _busy ? null : _send,
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  @override
  void dispose() {
    _input.dispose();
    _scroll.dispose();
    super.dispose();
  }
}
