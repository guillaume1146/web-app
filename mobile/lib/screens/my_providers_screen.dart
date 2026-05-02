import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../api/client.dart';
import '../theme/mediwyz_theme.dart';
import '../widgets/app_drawer.dart';
import '../widgets/skeleton.dart';

class MyProvidersScreen extends ConsumerStatefulWidget {
  const MyProvidersScreen({super.key});
  @override
  ConsumerState<MyProvidersScreen> createState() => _MyProvidersScreenState();
}

class _MyProvidersScreenState extends ConsumerState<MyProvidersScreen> {
  List<Map<String, dynamic>> _favorites = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final res = await ApiClient.instance.get('/favorites');
      final data = (res.data as Map?)?['data'] as List?;
      _favorites = data?.map((e) => Map<String, dynamic>.from(e as Map)).toList() ?? [];
    } catch (_) { _favorites = []; }
    if (mounted) setState(() => _loading = false);
  }

  Future<void> _remove(String providerId) async {
    setState(() => _favorites.removeWhere((f) => f['providerId'] == providerId));
    try {
      await ApiClient.instance.post('/favorites/$providerId/toggle');
    } catch (_) { _load(); }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      drawer: const AppDrawer(),
      appBar: AppBar(
        title: const Row(children: [
          Icon(Icons.star, color: Colors.amber),
          SizedBox(width: 8),
          Text('My Providers', style: TextStyle(fontWeight: FontWeight.bold)),
        ]),
      ),
      body: _loading
          ? const Padding(padding: EdgeInsets.all(12), child: SkeletonList(lineCount: 4))
          : _favorites.isEmpty
              ? EmptyState(
                  icon: Icons.star_border,
                  title: 'No saved providers yet',
                  description: 'Tap the star on any provider card to save them for one-tap rebooking.',
                  action: FilledButton(
                    style: FilledButton.styleFrom(backgroundColor: MediWyzColors.teal),
                    onPressed: () => context.go('/search'),
                    child: const Text('Browse providers'),
                  ),
                )
              : RefreshIndicator(
                  onRefresh: _load,
                  child: ListView.builder(
                    padding: const EdgeInsets.all(12),
                    itemCount: _favorites.length,
                    itemBuilder: (_, i) => _buildRow(_favorites[i]),
                  ),
                ),
    );
  }

  Widget _buildRow(Map<String, dynamic> f) {
    final p = f['provider'] as Map? ?? {};
    final name = '${p['firstName'] ?? ''} ${p['lastName'] ?? ''}'.trim();
    final role = p['userType']?.toString().replaceAll('_', ' ').toLowerCase() ?? '';

    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        leading: CircleAvatar(
          radius: 22,
          backgroundColor: MediWyzColors.sky,
          backgroundImage: p['profileImage'] != null ? NetworkImage(p['profileImage'].toString()) : null,
          child: p['profileImage'] == null
              ? Text(
                  ((p['firstName']?.toString() ?? '?')[0] + (p['lastName']?.toString() ?? '?')[0]).toUpperCase(),
                  style: const TextStyle(fontWeight: FontWeight.bold, color: MediWyzColors.navy),
                )
              : null,
        ),
        title: Text(name.isEmpty ? 'Provider' : name, style: const TextStyle(fontWeight: FontWeight.w600)),
        subtitle: Text(role, style: const TextStyle(fontSize: 12)),
        trailing: Row(mainAxisSize: MainAxisSize.min, children: [
          FilledButton.icon(
            style: FilledButton.styleFrom(backgroundColor: MediWyzColors.teal, padding: const EdgeInsets.symmetric(horizontal: 10)),
            icon: const Icon(Icons.event_available, size: 14),
            label: const Text('Book', style: TextStyle(fontSize: 12)),
            onPressed: () => context.push('/providers/${p['id']}'),
          ),
          IconButton(
            icon: const Icon(Icons.star, color: Colors.amber),
            tooltip: 'Unsave',
            onPressed: () => _remove(f['providerId']?.toString() ?? ''),
          ),
        ]),
      ),
    );
  }
}
