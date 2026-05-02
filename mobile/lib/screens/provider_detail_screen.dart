import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../api/client.dart';
import '../theme/mediwyz_theme.dart';

/// Provider detail — works for ANY provider role (dynamic-roles principle).
/// Pulls profile, services, and reviews from the generic /providers/:id/* endpoints.
class ProviderDetailScreen extends ConsumerStatefulWidget {
  final String providerId;
  const ProviderDetailScreen({super.key, required this.providerId});

  @override
  ConsumerState<ProviderDetailScreen> createState() => _ProviderDetailScreenState();
}

class _ProviderDetailScreenState extends ConsumerState<ProviderDetailScreen> {
  Map<String, dynamic>? _provider;
  List<Map<String, dynamic>> _services = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final results = await Future.wait([
        ApiClient.instance.get('/providers/${widget.providerId}'),
        ApiClient.instance.get('/providers/${widget.providerId}/services'),
      ]);
      final profile = (results[0].data as Map?)?['data'] as Map?;
      final services = (results[1].data as Map?)?['data'] as List?;
      setState(() {
        _provider = profile == null ? null : Map<String, dynamic>.from(profile);
        _services = services?.map((e) => Map<String, dynamic>.from(e as Map)).toList() ?? [];
        _loading = false;
      });
    } catch (_) {
      setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(_provider?['name']?.toString() ?? 'Provider')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _provider == null
              ? const Center(child: Text('Provider not found'))
              : ListView(
                  padding: const EdgeInsets.all(16),
                  children: [
                    // Header card
                    Card(
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Row(
                          children: [
                            CircleAvatar(
                              radius: 32,
                              backgroundColor: MediWyzColors.sky,
                              backgroundImage: _provider!['profileImage'] != null
                                  ? NetworkImage(_provider!['profileImage'].toString())
                                  : null,
                              child: _provider!['profileImage'] == null
                                  ? const Icon(Icons.person, size: 36, color: MediWyzColors.navy)
                                  : null,
                            ),
                            const SizedBox(width: 14),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    _provider!['name']?.toString() ?? '',
                                    style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: MediWyzColors.navy),
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    _provider!['userType']?.toString().replaceAll('_', ' ') ?? '',
                                    style: const TextStyle(color: Colors.black54, fontSize: 13),
                                  ),
                                  const SizedBox(height: 6),
                                  Row(
                                    children: [
                                      const Icon(Icons.star, color: Colors.amber, size: 16),
                                      const SizedBox(width: 4),
                                      Text(
                                        (_provider!['rating'] as num?)?.toStringAsFixed(1) ?? '—',
                                        style: const TextStyle(fontWeight: FontWeight.w600),
                                      ),
                                      if (_provider!['verified'] == true) ...[
                                        const SizedBox(width: 10),
                                        const Icon(Icons.verified, color: MediWyzColors.teal, size: 16),
                                      ],
                                    ],
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),
                    if (_provider!['bio'] != null && _provider!['bio'].toString().isNotEmpty)
                      Card(
                        child: Padding(
                          padding: const EdgeInsets.all(16),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text('About', style: TextStyle(fontWeight: FontWeight.w600, color: MediWyzColors.navy)),
                              const SizedBox(height: 6),
                              Text(_provider!['bio'].toString()),
                            ],
                          ),
                        ),
                      ),
                    const SizedBox(height: 16),
                    const Padding(
                      padding: EdgeInsets.symmetric(horizontal: 4, vertical: 8),
                      child: Text('Services', style: TextStyle(fontWeight: FontWeight.w600, color: MediWyzColors.navy)),
                    ),
                    if (_services.isEmpty)
                      const Padding(
                        padding: EdgeInsets.all(20),
                        child: Center(child: Text('No services yet', style: TextStyle(color: Colors.black54))),
                      )
                    else
                      ..._services.map((s) {
                        final price = (s['priceOverride'] ?? s['defaultPrice'] ?? 0) as num;
                        return Card(
                          margin: const EdgeInsets.only(bottom: 8),
                          child: ListTile(
                            title: Text(s['name']?.toString() ?? s['serviceName']?.toString() ?? 'Service'),
                            subtitle: Text(s['mode']?.toString() ?? 'in-person'),
                            trailing: Text('${price.toString()} MUR', style: const TextStyle(fontWeight: FontWeight.w600, color: MediWyzColors.teal)),
                            onTap: () => context.go('/book/${widget.providerId}?service=${s['id']}'),
                          ),
                        );
                      }),
                  ],
                ),
    );
  }
}
