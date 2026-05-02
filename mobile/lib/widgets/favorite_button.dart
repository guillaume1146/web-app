import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../api/client.dart';

/// Star toggle on provider cards. Optimistic update — reverts on API failure.
class FavoriteButton extends StatefulWidget {
  final String providerId;
  final bool? initialFavorited;
  final double size;
  const FavoriteButton({
    super.key,
    required this.providerId,
    this.initialFavorited,
    this.size = 22,
  });

  @override
  State<FavoriteButton> createState() => _FavoriteButtonState();
}

class _FavoriteButtonState extends State<FavoriteButton> {
  late bool _favorited;
  bool _busy = false;

  @override
  void initState() {
    super.initState();
    _favorited = widget.initialFavorited ?? false;
    if (widget.initialFavorited == null) _load();
  }

  Future<void> _load() async {
    try {
      final res = await ApiClient.instance.get('/favorites');
      final list = ((res.data as Map?)?['data'] as List?) ?? [];
      final has = list.any((f) => (f as Map)['providerId']?.toString() == widget.providerId);
      if (mounted) setState(() => _favorited = has);
    } catch (_) { /* silent */ }
  }

  Future<void> _toggle() async {
    if (_busy) return;
    HapticFeedback.selectionClick();
    final prev = _favorited;
    setState(() { _favorited = !_favorited; _busy = true; });
    try {
      final res = await ApiClient.instance.post('/favorites/${widget.providerId}/toggle');
      final ok = (res.data as Map?)?['success'] == true;
      if (!ok) throw Exception('fail');
      final next = (res.data as Map?)?['data']?['favorited'] == true;
      if (mounted) setState(() => _favorited = next);
    } catch (_) {
      if (mounted) setState(() => _favorited = prev);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return IconButton(
      onPressed: _busy ? null : _toggle,
      tooltip: _favorited ? 'Remove from favourites' : 'Save provider',
      icon: Icon(
        _favorited ? Icons.star : Icons.star_border,
        color: _favorited ? Colors.amber : Colors.grey.shade500,
        size: widget.size,
      ),
    );
  }
}
