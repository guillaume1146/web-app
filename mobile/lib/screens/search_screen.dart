import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../api/client.dart';
import '../api/roles_api.dart';
import '../theme/mediwyz_theme.dart';
import '../widgets/app_drawer.dart';
import '../widgets/bottom_nav.dart';
import '../widgets/favorite_button.dart';

/// Generic search — works for any provider role (dynamic-roles principle).
/// User picks a role from the DB-driven list, results pull from /api/search/providers.
class SearchScreen extends ConsumerStatefulWidget {
  const SearchScreen({super.key});
  @override
  ConsumerState<SearchScreen> createState() => _SearchScreenState();
}

class _SearchScreenState extends ConsumerState<SearchScreen> {
  List<Map<String, dynamic>> _roles = [];
  List<Map<String, dynamic>> _results = [];
  String? _selectedCode;
  bool _loading = true;
  bool _searching = false;

  @override
  void initState() {
    super.initState();
    _loadRoles();
  }

  Future<void> _loadRoles() async {
    final roles = await RolesApi.list(searchEnabled: true);
    if (!mounted) return;
    setState(() {
      _roles = roles;
      _loading = false;
      if (roles.isNotEmpty) {
        _selectedCode = roles.first['code']?.toString();
        _search();
      }
    });
  }

  Future<void> _search() async {
    if (_selectedCode == null) return;
    setState(() => _searching = true);
    try {
      final res = await ApiClient.instance.get(
        '/search/providers',
        queryParameters: {'type': _selectedCode},
      );
      final data = (res.data as Map?)?['data'] as List?;
      setState(() {
        _results = data?.map((e) => Map<String, dynamic>.from(e as Map)).toList() ?? [];
      });
    } finally {
      if (mounted) setState(() => _searching = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Find a Provider', style: TextStyle(fontWeight: FontWeight.bold))),
      drawer: const AppDrawer(),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : Column(
              children: [
                // Role picker (horizontal scroll)
                SizedBox(
                  height: 56,
                  child: ListView.separated(
                    scrollDirection: Axis.horizontal,
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                    itemCount: _roles.length,
                    separatorBuilder: (_, __) => const SizedBox(width: 8),
                    itemBuilder: (_, i) {
                      final r = _roles[i];
                      final code = r['code']?.toString();
                      final selected = code == _selectedCode;
                      return ChoiceChip(
                        label: Text(r['label']?.toString() ?? ''),
                        selected: selected,
                        onSelected: (_) {
                          setState(() => _selectedCode = code);
                          _search();
                        },
                        selectedColor: MediWyzColors.teal,
                        labelStyle: TextStyle(color: selected ? Colors.white : MediWyzColors.navy),
                      );
                    },
                  ),
                ),
                if (_searching) const LinearProgressIndicator(),
                Expanded(
                  child: _results.isEmpty
                      ? const Center(child: Text('No providers found'))
                      : ListView.separated(
                          padding: const EdgeInsets.all(12),
                          itemCount: _results.length,
                          separatorBuilder: (_, __) => const SizedBox(height: 8),
                          itemBuilder: (_, i) {
                            final p = _results[i];
                            final name = p['name']?.toString()
                              ?? '${p['firstName'] ?? ''} ${p['lastName'] ?? ''}'.trim();
                            final specialties = (p['specializations'] as List?)?.cast<String>() ?? [];
                            final providerId = p['id']?.toString() ?? '';
                            return Card(
                              child: ListTile(
                                leading: CircleAvatar(
                                  backgroundImage: p['profileImage'] != null
                                      ? NetworkImage(p['profileImage'].toString())
                                      : null,
                                  child: p['profileImage'] == null ? const Icon(Icons.person) : null,
                                ),
                                title: Text(name.isEmpty ? 'Unknown' : name),
                                subtitle: Text(specialties.isNotEmpty ? specialties.take(2).join(', ') : (p['address']?.toString() ?? '')),
                                trailing: Row(mainAxisSize: MainAxisSize.min, children: [
                                  if (p['verified'] == true)
                                    const Icon(Icons.verified, color: MediWyzColors.teal, size: 18),
                                  if (providerId.isNotEmpty)
                                    FavoriteButton(providerId: providerId, size: 20),
                                ]),
                                onTap: providerId.isEmpty
                                    ? null
                                    : () => context.push('/providers/$providerId'),
                              ),
                            );
                          },
                        ),
                ),
              ],
            ),
      bottomNavigationBar: const MediWyzBottomNav(currentIndex: 2),
    );
  }
}
