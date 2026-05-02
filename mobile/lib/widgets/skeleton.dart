import 'package:flutter/material.dart';

/// Animated shimmer skeleton. Drop-in replacement for CircularProgressIndicator
/// when loading list-style content — matches the web's gray-bar skeletons.
///
/// Usage:
///   ```
///   _loading ? const SkeletonList(lineCount: 6) : ListView(...)
///   ```
class Skeleton extends StatefulWidget {
  final double width;
  final double height;
  final double borderRadius;
  const Skeleton({super.key, this.width = double.infinity, this.height = 16, this.borderRadius = 6});
  @override
  State<Skeleton> createState() => _SkeletonState();
}

class _SkeletonState extends State<Skeleton> with SingleTickerProviderStateMixin {
  late final AnimationController _ctl;

  @override
  void initState() {
    super.initState();
    _ctl = AnimationController(vsync: this, duration: const Duration(milliseconds: 1100))..repeat();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _ctl,
      builder: (_, __) {
        // Moving gradient from dark→light→dark for shimmer effect.
        final t = _ctl.value;
        return Container(
          width: widget.width,
          height: widget.height,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(widget.borderRadius),
            gradient: LinearGradient(
              begin: Alignment(-1.0 + 2 * t, 0),
              end: Alignment(1.0 + 2 * t, 0),
              colors: [
                Colors.grey.shade300,
                Colors.grey.shade200,
                Colors.grey.shade300,
              ],
              stops: const [0.0, 0.5, 1.0],
            ),
          ),
        );
      },
    );
  }

  @override
  void dispose() {
    _ctl.dispose();
    super.dispose();
  }
}

/// Card-style skeleton for list items — avatar + two lines.
class SkeletonCard extends StatelessWidget {
  const SkeletonCard({super.key});
  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Row(
          children: [
            const Skeleton(width: 44, height: 44, borderRadius: 22),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Skeleton(width: 160, height: 14),
                  const SizedBox(height: 8),
                  Skeleton(width: MediaQuery.of(context).size.width * 0.6, height: 12),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Convenience: several SkeletonCards stacked.
class SkeletonList extends StatelessWidget {
  final int lineCount;
  final EdgeInsets padding;
  const SkeletonList({super.key, this.lineCount = 5, this.padding = const EdgeInsets.all(12)});
  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: padding,
      children: List.generate(lineCount, (_) => const SkeletonCard()),
    );
  }
}

/// Themed empty state — icon + title + optional description + optional CTA.
class EmptyState extends StatelessWidget {
  final IconData icon;
  final String title;
  final String? description;
  final Widget? action;
  const EmptyState({super.key, required this.icon, required this.title, this.description, this.action});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(40),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 56, color: Colors.grey.shade400),
            const SizedBox(height: 12),
            Text(title, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600, color: Colors.black87)),
            if (description != null) ...[
              const SizedBox(height: 4),
              Text(description!, textAlign: TextAlign.center, style: const TextStyle(color: Colors.black54, fontSize: 13)),
            ],
            if (action != null) ...[const SizedBox(height: 16), action!],
          ],
        ),
      ),
    );
  }
}
