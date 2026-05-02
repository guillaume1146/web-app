import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:file_picker/file_picker.dart';
import '../api/client.dart';
import '../api/upload_api.dart';
import '../services/auth_service.dart';
import '../theme/mediwyz_theme.dart';
import '../widgets/app_drawer.dart';
import '../widgets/bottom_nav.dart';
import '../widgets/role_profile_form.dart';

class ProfileScreen extends ConsumerStatefulWidget {
  const ProfileScreen({super.key});
  @override
  ConsumerState<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends ConsumerState<ProfileScreen> {
  List<Map<String, dynamic>> _requiredDocs = [];
  List<Map<String, dynamic>> _myDocs = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final user = ref.read(authProvider).user;
    if (user == null) return;
    try {
      final reqRes = await ApiClient.instance.get(
        '/required-documents',
        queryParameters: {'userType': user['userType']},
      );
      final docsRes = await ApiClient.instance.get('/users/${user['id']}/documents');

      final req = ((reqRes.data as Map?)?['data'] as List?)
              ?.map((e) => Map<String, dynamic>.from(e as Map))
              .toList()
          ?? [];
      final docs = ((docsRes.data as Map?)?['data'] as List?)
              ?.map((e) => Map<String, dynamic>.from(e as Map))
              .toList()
          ?? [];

      setState(() {
        _requiredDocs = req;
        _myDocs = docs;
        _loading = false;
      });
    } catch (_) {
      setState(() => _loading = false);
    }
  }

  Future<void> _pickProfilePhoto(String userId) async {
    if (userId.isEmpty) return;
    try {
      final result = await FilePicker.platform.pickFiles(type: FileType.image, withData: true);
      if (result == null || result.files.isEmpty || result.files.first.bytes == null) return;
      final file = result.files.first;
      final url = await UploadApi.uploadBytes(bytes: file.bytes!, filename: file.name);
      if (url == null) return;
      await ApiClient.instance.patch('/users/$userId', data: {'profileImage': url});
      await ref.read(authProvider.notifier).refresh();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Photo updated'), backgroundColor: Colors.green),
        );
      }
    } catch (_) {}
  }

  Future<void> _uploadDocument(String userId, String docName) async {
    try {
      final result = await FilePicker.platform.pickFiles(
        type: FileType.custom,
        allowedExtensions: ['pdf', 'jpg', 'jpeg', 'png'],
        withData: true,
      );
      if (result == null || result.files.isEmpty || result.files.first.bytes == null) return;
      final file = result.files.first;
      final url = await UploadApi.uploadBytes(bytes: file.bytes!, filename: file.name);
      if (url == null) return;
      await UploadApi.createDocument(
        userId: userId,
        name: docName,
        type: _docTypeFor(docName),
        url: url,
        size: file.size,
      );
      await _load();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('$docName uploaded'), backgroundColor: Colors.green),
        );
      }
    } catch (_) {}
  }

  String _docTypeFor(String name) {
    final lower = name.toLowerCase();
    if (lower.contains('id') || lower.contains('passport')) return 'id_proof';
    if (lower.contains('licen')) return 'license';
    if (lower.contains('insurance')) return 'insurance';
    if (lower.contains('lab') || lower.contains('result')) return 'lab_report';
    if (lower.contains('prescrip')) return 'prescription';
    return 'other';
  }

  @override
  Widget build(BuildContext context) {
    final user = ref.watch(authProvider).user;
    if (user == null) return const Scaffold(body: Center(child: CircularProgressIndicator()));

    final uploadedNames = _myDocs.map((d) => d['name']?.toString().toLowerCase().trim() ?? '').toSet();
    final missing = _requiredDocs.where((r) {
      final name = r['documentName']?.toString().toLowerCase().trim() ?? '';
      return r['required'] == true && !uploadedNames.contains(name);
    }).length;

    return Scaffold(
      drawer: const AppDrawer(),
      appBar: AppBar(
        title: const Text('Profile', style: TextStyle(fontWeight: FontWeight.bold)),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: () async {
              await ref.read(authProvider.notifier).logout();
              if (!context.mounted) return;
              context.go('/login');
            },
          ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _load,
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  // Header
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(20),
                      child: Row(
                        children: [
                          GestureDetector(
                            onTap: () => _pickProfilePhoto(user['id']?.toString() ?? ''),
                            child: Stack(children: [
                              CircleAvatar(
                                radius: 30,
                                backgroundColor: MediWyzColors.sky,
                                backgroundImage: user['profileImage'] != null
                                    ? NetworkImage(user['profileImage'].toString())
                                    : null,
                                child: user['profileImage'] == null
                                    ? const Icon(Icons.person, size: 36, color: MediWyzColors.navy)
                                    : null,
                              ),
                              const Positioned(
                                right: 0, bottom: 0,
                                child: CircleAvatar(
                                  radius: 10,
                                  backgroundColor: MediWyzColors.teal,
                                  child: Icon(Icons.camera_alt, size: 12, color: Colors.white),
                                ),
                              ),
                            ]),
                          ),
                          const SizedBox(width: 14),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  '${user['firstName']} ${user['lastName']}',
                                  style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: MediWyzColors.navy),
                                ),
                                const SizedBox(height: 2),
                                Text(user['email']?.toString() ?? '', style: const TextStyle(color: Colors.black54, fontSize: 13)),
                                const SizedBox(height: 4),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                  decoration: BoxDecoration(color: MediWyzColors.sky, borderRadius: BorderRadius.circular(10)),
                                  child: Text(
                                    user['userType']?.toString().toUpperCase() ?? '',
                                    style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w600, color: MediWyzColors.navy),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Role-specific profile fields — DB-driven via
                  // ProviderRole.profileFields; no hardcoded role branching.
                  const RoleProfileForm(),

                  const SizedBox(height: 20),

                  // Required documents checklist
                  if (_requiredDocs.isNotEmpty) ...[
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 8),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text('Required Documents', style: TextStyle(fontWeight: FontWeight.w600, color: MediWyzColors.navy)),
                          Text(
                            missing == 0 ? 'All uploaded ✓' : '$missing missing',
                            style: TextStyle(
                              fontSize: 12,
                              color: missing == 0 ? Colors.green : Colors.orange,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ],
                      ),
                    ),
                    Card(
                      child: Column(
                        children: _requiredDocs.map((d) {
                          final name = d['documentName']?.toString() ?? '';
                          final required = d['required'] == true;
                          final uploaded = uploadedNames.contains(name.toLowerCase().trim());
                          return ListTile(
                            leading: CircleAvatar(
                              radius: 12,
                              backgroundColor: uploaded
                                  ? Colors.green.withValues(alpha: 0.15)
                                  : (required ? Colors.orange.withValues(alpha: 0.15) : Colors.grey.shade200),
                              child: Icon(
                                uploaded ? Icons.check : (required ? Icons.priority_high : Icons.circle),
                                size: 14,
                                color: uploaded ? Colors.green : (required ? Colors.orange : Colors.grey),
                              ),
                            ),
                            title: Text(name, style: const TextStyle(fontSize: 14)),
                            trailing: uploaded
                                ? const Text('Uploaded', style: TextStyle(fontSize: 12, color: Colors.green, fontWeight: FontWeight.w500))
                                : TextButton.icon(
                                    onPressed: () => _uploadDocument(user['id']?.toString() ?? '', name),
                                    icon: const Icon(Icons.upload_file, size: 16),
                                    label: const Text('Upload'),
                                    style: TextButton.styleFrom(
                                      foregroundColor: required ? Colors.orange.shade800 : MediWyzColors.teal,
                                    ),
                                  ),
                          );
                        }).toList(),
                      ),
                    ),
                  ],
                ],
              ),
            ),
      bottomNavigationBar: const MediWyzBottomNav(currentIndex: 4),
    );
  }
}
