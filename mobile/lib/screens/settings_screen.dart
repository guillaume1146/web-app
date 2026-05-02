import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../api/auth_api.dart';
import '../services/locale_service.dart';
import '../theme/mediwyz_theme.dart';

class SettingsScreen extends ConsumerStatefulWidget {
  const SettingsScreen({super.key});
  @override
  ConsumerState<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends ConsumerState<SettingsScreen> {
  final _question = TextEditingController();
  final _answer = TextEditingController();
  bool _savingSecurity = false;
  String? _securityMessage;

  Future<void> _saveSecurity() async {
    if (_question.text.trim().length < 5) {
      setState(() => _securityMessage = 'Question must be at least 5 characters');
      return;
    }
    if (_answer.text.trim().length < 3) {
      setState(() => _securityMessage = 'Answer must be at least 3 characters');
      return;
    }
    setState(() { _savingSecurity = true; _securityMessage = null; });
    try {
      final res = await AuthApi.setSecurityQuestion(_question.text.trim(), _answer.text.trim());
      if (!mounted) return;
      if (res['success'] == true) {
        setState(() {
          _securityMessage = '✓ Security question saved';
          _question.clear();
          _answer.clear();
        });
      } else {
        setState(() => _securityMessage = res['message']?.toString() ?? 'Save failed');
      }
    } catch (_) {
      if (mounted) setState(() => _securityMessage = 'Network error');
    } finally {
      if (mounted) setState(() => _savingSecurity = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Settings', style: TextStyle(fontWeight: FontWeight.bold))),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          const _SectionHeader('Language'),
          _buildLanguageCard(),
          const SizedBox(height: 16),

          const _SectionHeader('Security question'),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const Text(
                    'Used to reset your password in-app without email. Pick something only you know.',
                    style: TextStyle(color: Colors.black54, fontSize: 12),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: _question,
                    decoration: const InputDecoration(
                      labelText: 'Question',
                      hintText: 'What is the name of your first pet?',
                      border: OutlineInputBorder(),
                    ),
                  ),
                  const SizedBox(height: 10),
                  TextField(
                    controller: _answer,
                    decoration: const InputDecoration(
                      labelText: 'Answer',
                      border: OutlineInputBorder(),
                      helperText: 'Case-insensitive. Trimmed.',
                    ),
                  ),
                  const SizedBox(height: 12),
                  ElevatedButton(
                    onPressed: _savingSecurity ? null : _saveSecurity,
                    style: ElevatedButton.styleFrom(backgroundColor: MediWyzColors.teal),
                    child: _savingSecurity
                        ? const SizedBox(height: 18, width: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                        : const Text('Save security question'),
                  ),
                  if (_securityMessage != null) ...[
                    const SizedBox(height: 8),
                    Text(
                      _securityMessage!,
                      style: TextStyle(
                        fontSize: 13,
                        color: _securityMessage!.startsWith('✓') ? Colors.green.shade700 : Colors.red.shade700,
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ),

          const SizedBox(height: 20),
          const _SectionHeader('About'),
          const Card(
            child: Padding(
              padding: EdgeInsets.all(14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('MediWyz Mobile', style: TextStyle(fontWeight: FontWeight.w600, color: MediWyzColors.navy)),
                  SizedBox(height: 4),
                  Text('Version 0.1.0', style: TextStyle(color: Colors.black54, fontSize: 12)),
                  SizedBox(height: 12),
                  Text(
                    'MediWyz is a digital health platform operating across Mauritius, Madagascar, Kenya, Togo, Benin, and Rwanda.',
                    style: TextStyle(fontSize: 13, color: Colors.black87),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildLanguageCard() {
    final current = ref.watch(localeProvider).code;
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text(
              'Choose the language for step labels, notifications, and AI replies.',
              style: TextStyle(fontSize: 12, color: Colors.black54),
            ),
            const SizedBox(height: 8),
            for (final code in const ['en', 'fr', 'mfe'])
              RadioListTile<String>(
                contentPadding: EdgeInsets.zero,
                dense: true,
                title: Row(children: [
                  Text(localeFlag(code), style: const TextStyle(fontSize: 18)),
                  const SizedBox(width: 10),
                  Text(localeDisplayName(code)),
                ]),
                value: code,
                groupValue: current,
                onChanged: (v) {
                  if (v != null) ref.read(localeProvider.notifier).set(v);
                },
                activeColor: MediWyzColors.teal,
              ),
          ],
        ),
      ),
    );
  }

  @override
  void dispose() {
    _question.dispose();
    _answer.dispose();
    super.dispose();
  }
}

class _SectionHeader extends StatelessWidget {
  final String title;
  const _SectionHeader(this.title);
  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 8),
        child: Text(
          title.toUpperCase(),
          style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: Colors.black54, letterSpacing: 0.5),
        ),
      );
}
