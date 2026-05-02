import 'package:flutter/material.dart';
import '../api/client.dart';
import '../theme/mediwyz_theme.dart';

/// Reusable rating + comment modal. POSTs to /providers/:id/reviews.
/// Call via `showReviewDialog(context: ..., providerId: ..., providerName: ...)`.
Future<bool?> showReviewDialog({
  required BuildContext context,
  required String providerId,
  String? providerName,
}) {
  return showDialog<bool>(
    context: context,
    builder: (_) => _ReviewDialog(providerId: providerId, providerName: providerName),
  );
}

class _ReviewDialog extends StatefulWidget {
  final String providerId;
  final String? providerName;
  const _ReviewDialog({required this.providerId, this.providerName});
  @override
  State<_ReviewDialog> createState() => _ReviewDialogState();
}

class _ReviewDialogState extends State<_ReviewDialog> {
  int _rating = 0;
  final _comment = TextEditingController();
  bool _saving = false;
  String? _error;

  Future<void> _submit() async {
    if (_rating == 0) {
      setState(() => _error = 'Please pick a star rating');
      return;
    }
    setState(() { _saving = true; _error = null; });
    try {
      final res = await ApiClient.instance.post(
        '/providers/${widget.providerId}/reviews',
        data: {
          'rating': _rating,
          if (_comment.text.trim().isNotEmpty) 'comment': _comment.text.trim(),
        },
      );
      if ((res.data as Map?)?['success'] == true) {
        if (mounted) Navigator.pop(context, true);
      } else {
        setState(() => _error = (res.data as Map?)?['message']?.toString() ?? 'Review failed');
      }
    } catch (e) {
      setState(() => _error = 'Network error');
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: Text(widget.providerName == null ? 'Leave a review' : 'Review ${widget.providerName}'),
      content: SizedBox(
        width: 320,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text('How was your experience?', style: TextStyle(color: Colors.black54, fontSize: 13)),
            const SizedBox(height: 10),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: List.generate(5, (i) {
                final star = i + 1;
                return IconButton(
                  icon: Icon(
                    _rating >= star ? Icons.star : Icons.star_border,
                    color: _rating >= star ? Colors.amber : Colors.grey,
                    size: 32,
                  ),
                  onPressed: () => setState(() => _rating = star),
                );
              }),
            ),
            const SizedBox(height: 10),
            TextField(
              controller: _comment,
              maxLines: 3,
              maxLength: 500,
              decoration: const InputDecoration(
                labelText: 'Comment (optional)',
                border: OutlineInputBorder(),
              ),
            ),
            if (_error != null) ...[
              const SizedBox(height: 6),
              Text(_error!, style: const TextStyle(color: Colors.red, fontSize: 12)),
            ],
          ],
        ),
      ),
      actions: [
        TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
        FilledButton(
          style: FilledButton.styleFrom(backgroundColor: MediWyzColors.teal),
          onPressed: _saving ? null : _submit,
          child: _saving
              ? const SizedBox(height: 16, width: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
              : const Text('Submit'),
        ),
      ],
    );
  }

  @override
  void dispose() {
    _comment.dispose();
    super.dispose();
  }
}
