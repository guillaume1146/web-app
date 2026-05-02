import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../api/auth_api.dart';
import '../theme/mediwyz_theme.dart';

class ForgotPasswordScreen extends StatefulWidget {
  const ForgotPasswordScreen({super.key});
  @override
  State<ForgotPasswordScreen> createState() => _ForgotPasswordScreenState();
}

enum _Stage { email, answer }

class _ForgotPasswordScreenState extends State<ForgotPasswordScreen> {
  _Stage _stage = _Stage.email;
  final _email = TextEditingController();
  final _answer = TextEditingController();
  String _question = '';
  bool _busy = false;
  String? _error;

  Future<void> _lookup() async {
    if (_email.text.trim().isEmpty) return;
    setState(() { _busy = true; _error = null; });
    try {
      final res = await AuthApi.forgotPasswordQuestion(_email.text.trim());
      if (!mounted) return;
      if (res['success'] == true) {
        setState(() {
          _question = res['question']?.toString() ?? '';
          _stage = _Stage.answer;
        });
      } else {
        setState(() => _error = res['message']?.toString() ?? 'Could not continue');
      }
    } catch (_) {
      if (mounted) setState(() => _error = 'Network error');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _verify() async {
    if (_answer.text.trim().isEmpty) return;
    setState(() { _busy = true; _error = null; });
    try {
      final res = await AuthApi.forgotPasswordVerify(_email.text.trim(), _answer.text.trim());
      if (!mounted) return;
      if (res['success'] == true && res['resetToken'] != null) {
        context.go('/reset-password?token=${res['resetToken']}');
      } else {
        setState(() => _error = res['message']?.toString() ?? 'Incorrect answer');
      }
    } catch (_) {
      if (mounted) setState(() => _error = 'Network error');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Forgot password')),
      body: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const SizedBox(height: 12),
            Text(
              _stage == _Stage.email
                  ? 'Enter your email to continue.'
                  : 'Answer your security question to reset your password.',
              style: const TextStyle(color: Colors.black54),
            ),
            const SizedBox(height: 20),
            if (_stage == _Stage.email) ...[
              TextField(
                controller: _email,
                keyboardType: TextInputType.emailAddress,
                decoration: const InputDecoration(
                  labelText: 'Email',
                  prefixIcon: Icon(Icons.email_outlined),
                ),
              ),
              const SizedBox(height: 20),
              ElevatedButton(
                onPressed: _busy ? null : _lookup,
                style: ElevatedButton.styleFrom(backgroundColor: MediWyzColors.teal),
                child: _busy
                    ? const SizedBox(height: 18, width: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                    : const Text('Continue'),
              ),
            ] else ...[
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: MediWyzColors.sky.withValues(alpha: 0.2),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: MediWyzColors.sky),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'SECURITY QUESTION',
                      style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: MediWyzColors.navy, letterSpacing: 0.5),
                    ),
                    const SizedBox(height: 4),
                    Text(_question, style: const TextStyle(color: MediWyzColors.navy)),
                  ],
                ),
              ),
              const SizedBox(height: 16),
              TextField(
                controller: _answer,
                autofocus: true,
                decoration: const InputDecoration(
                  labelText: 'Your answer',
                  prefixIcon: Icon(Icons.key_outlined),
                  helperText: 'Answer is case-insensitive.',
                ),
              ),
              const SizedBox(height: 20),
              ElevatedButton(
                onPressed: _busy ? null : _verify,
                style: ElevatedButton.styleFrom(backgroundColor: MediWyzColors.teal),
                child: _busy
                    ? const SizedBox(height: 18, width: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                    : const Text('Verify & continue'),
              ),
              TextButton(
                onPressed: () => setState(() { _stage = _Stage.email; _error = null; _answer.clear(); }),
                child: const Text('Use a different email'),
              ),
            ],
            if (_error != null) ...[
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: Colors.red.shade50,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: Colors.red.shade200),
                ),
                child: Text(_error!, style: TextStyle(color: Colors.red.shade700, fontSize: 13)),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
