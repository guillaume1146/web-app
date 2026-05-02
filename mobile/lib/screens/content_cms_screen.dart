import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../api/client.dart';
import '../theme/mediwyz_theme.dart';
import '../widgets/app_drawer.dart';

/// CMS — hero slides + testimonials read + toggle active.
class ContentCmsScreen extends ConsumerStatefulWidget {
  const ContentCmsScreen({super.key});
  @override
  ConsumerState<ContentCmsScreen> createState() => _ContentCmsScreenState();
}

class _ContentCmsScreenState extends ConsumerState<ContentCmsScreen> with SingleTickerProviderStateMixin {
  late final TabController _tabs;
  List<Map<String, dynamic>> _heroSlides = [];
  List<Map<String, dynamic>> _testimonials = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _tabs = TabController(length: 2, vsync: this);
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final results = await Future.wait([
        ApiClient.instance.get('/cms/hero-slides'),
        ApiClient.instance.get('/cms/testimonials'),
      ]);
      List<Map<String, dynamic>> parse(dynamic body) {
        final d = (body as Map?)?['data'] as List?;
        return d?.map((e) => Map<String, dynamic>.from(e as Map)).toList() ?? [];
      }
      setState(() {
        _heroSlides = parse(results[0].data);
        _testimonials = parse(results[1].data);
        _loading = false;
      });
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _toggleActive(String type, Map<String, dynamic> item) async {
    final isActive = item['isActive'] == true;
    try {
      await ApiClient.instance.patch('/cms/$type/${item['id']}', data: {'isActive': !isActive});
      await _load();
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      drawer: const AppDrawer(),
      appBar: AppBar(
        title: const Text('Content', style: TextStyle(fontWeight: FontWeight.bold)),
        bottom: TabBar(
          controller: _tabs,
          labelColor: MediWyzColors.teal,
          indicatorColor: MediWyzColors.teal,
          tabs: [
            Tab(text: 'Hero slides (${_heroSlides.length})'),
            Tab(text: 'Testimonials (${_testimonials.length})'),
          ],
        ),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : TabBarView(
              controller: _tabs,
              children: [
                _list(_heroSlides, 'hero-slides', isHero: true),
                _list(_testimonials, 'testimonials'),
              ],
            ),
    );
  }

  Widget _list(List<Map<String, dynamic>> items, String type, {bool isHero = false}) {
    if (items.isEmpty) return const Center(child: Text('Nothing here', style: TextStyle(color: Colors.black54)));
    return RefreshIndicator(
      onRefresh: _load,
      child: ListView.separated(
        padding: const EdgeInsets.all(12),
        itemCount: items.length,
        separatorBuilder: (_, __) => const SizedBox(height: 8),
        itemBuilder: (_, i) {
          final it = items[i];
          final active = it['isActive'] == true;
          return Card(
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (isHero && it['imageUrl'] != null) ...[
                    ClipRRect(
                      borderRadius: BorderRadius.circular(8),
                      child: Image.network(it['imageUrl'].toString(), height: 120, width: double.infinity, fit: BoxFit.cover, errorBuilder: (_, __, ___) => Container(height: 120, color: Colors.grey.shade200, child: const Icon(Icons.image_not_supported))),
                    ),
                    const SizedBox(height: 8),
                  ],
                  Row(
                    children: [
                      if (!isHero && it['avatarUrl'] != null)
                        Padding(
                          padding: const EdgeInsets.only(right: 10),
                          child: CircleAvatar(backgroundImage: NetworkImage(it['avatarUrl'].toString())),
                        ),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              isHero ? (it['title']?.toString() ?? 'Hero slide') : (it['authorName']?.toString() ?? 'Testimonial'),
                              style: const TextStyle(fontWeight: FontWeight.w600, color: MediWyzColors.navy),
                            ),
                            if (!isHero && it['authorRole'] != null)
                              Text(it['authorRole'].toString(), style: const TextStyle(fontSize: 12, color: Colors.black54)),
                          ],
                        ),
                      ),
                      Switch(
                        value: active,
                        activeColor: MediWyzColors.teal,
                        onChanged: (_) => _toggleActive(type, it),
                      ),
                    ],
                  ),
                  if (it['subtitle'] != null || it['content'] != null) ...[
                    const SizedBox(height: 6),
                    Text(
                      (it['subtitle'] ?? it['content']).toString(),
                      style: const TextStyle(fontSize: 13, color: Colors.black87),
                    ),
                  ],
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  @override
  void dispose() {
    _tabs.dispose();
    super.dispose();
  }
}
