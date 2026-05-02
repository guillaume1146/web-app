import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../api/auth_api.dart';
import '../api/roles_api.dart';
import '../services/auth_service.dart';
import '../theme/mediwyz_theme.dart';

class SignupScreen extends ConsumerStatefulWidget {
  const SignupScreen({super.key});
  @override
  ConsumerState<SignupScreen> createState() => _SignupScreenState();
}

class _SignupScreenState extends ConsumerState<SignupScreen> {
  final _formKey = GlobalKey<FormState>();
  final _fullName = TextEditingController();
  final _email = TextEditingController();
  final _password = TextEditingController();
  final _confirmPassword = TextEditingController();
  final _phone = TextEditingController();
  final _dob = TextEditingController();
  final _address = TextEditingController();
  String _gender = 'Male';
  String? _userType;
  List<Map<String, dynamic>> _roles = [];
  bool _loadingRoles = true;
  bool _submitting = false;

  @override
  void initState() {
    super.initState();
    _loadRoles();
  }

  Future<void> _loadRoles() async {
    // Dynamic roles — never hardcode. signupEnabled filter excludes admin/corporate.
    final list = await RolesApi.list();
    if (!mounted) return;
    setState(() {
      _roles = list.where((r) => r['code'] != 'CORPORATE_ADMIN' && r['code'] != 'REGIONAL_ADMIN').toList();
      _userType = _roles.isNotEmpty ? _roles.first['slug']?.toString() : null;
      _loadingRoles = false;
    });
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    if (_password.text != _confirmPassword.text) {
      _showError('Passwords do not match');
      return;
    }
    setState(() => _submitting = true);
    try {
      final res = await AuthApi.register({
        'fullName': _fullName.text.trim(),
        'email': _email.text.trim(),
        'password': _password.text,
        'confirmPassword': _confirmPassword.text,
        'phone': _phone.text.trim(),
        'dateOfBirth': _dob.text.trim(),
        'gender': _gender,
        'address': _address.text.trim(),
        'userType': _userType,
      });
      if (res['success'] == true) {
        // Auto-login after signup
        await ref.read(authProvider.notifier).login(_email.text.trim(), _password.text);
        if (!mounted) return;
        context.go('/feed');
      } else {
        _showError(res['message']?.toString() ?? 'Signup failed');
      }
    } catch (e) {
      _showError(e.toString());
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  void _showError(String msg) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg)));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Create account')),
      body: _loadingRoles
          ? const Center(child: CircularProgressIndicator())
          : SingleChildScrollView(
              padding: const EdgeInsets.all(20),
              child: Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    TextFormField(
                      controller: _fullName,
                      decoration: const InputDecoration(labelText: 'Full name', prefixIcon: Icon(Icons.person_outline)),
                      validator: (v) => (v == null || v.length < 2) ? 'Full name required' : null,
                    ),
                    const SizedBox(height: 10),
                    TextFormField(
                      controller: _email,
                      keyboardType: TextInputType.emailAddress,
                      decoration: const InputDecoration(labelText: 'Email', prefixIcon: Icon(Icons.email_outlined)),
                      validator: (v) => (v == null || !v.contains('@')) ? 'Valid email required' : null,
                    ),
                    const SizedBox(height: 10),
                    TextFormField(
                      controller: _password,
                      obscureText: true,
                      decoration: const InputDecoration(labelText: 'Password (min 6)', prefixIcon: Icon(Icons.lock_outline)),
                      validator: (v) => (v == null || v.length < 6) ? '6+ characters' : null,
                    ),
                    const SizedBox(height: 10),
                    TextFormField(
                      controller: _confirmPassword,
                      obscureText: true,
                      decoration: const InputDecoration(labelText: 'Confirm password', prefixIcon: Icon(Icons.lock_outline)),
                    ),
                    const SizedBox(height: 10),
                    TextFormField(
                      controller: _phone,
                      keyboardType: TextInputType.phone,
                      decoration: const InputDecoration(labelText: 'Phone', prefixIcon: Icon(Icons.phone)),
                      validator: (v) => (v == null || v.length < 5) ? 'Phone required' : null,
                    ),
                    const SizedBox(height: 10),
                    TextFormField(
                      controller: _dob,
                      decoration: const InputDecoration(labelText: 'Date of birth (YYYY-MM-DD)', prefixIcon: Icon(Icons.cake_outlined)),
                      validator: (v) => (v == null || v.isEmpty) ? 'Required' : null,
                    ),
                    const SizedBox(height: 10),
                    DropdownButtonFormField<String>(
                      initialValue: _gender,
                      decoration: const InputDecoration(labelText: 'Gender', prefixIcon: Icon(Icons.person)),
                      items: const [
                        DropdownMenuItem(value: 'Male', child: Text('Male')),
                        DropdownMenuItem(value: 'Female', child: Text('Female')),
                        DropdownMenuItem(value: 'Other', child: Text('Other')),
                      ],
                      onChanged: (v) => setState(() => _gender = v ?? 'Male'),
                    ),
                    const SizedBox(height: 10),
                    TextFormField(
                      controller: _address,
                      decoration: const InputDecoration(labelText: 'Address', prefixIcon: Icon(Icons.home_outlined)),
                      validator: (v) => (v == null || v.isEmpty) ? 'Required' : null,
                    ),
                    const SizedBox(height: 10),
                    DropdownButtonFormField<String>(
                      initialValue: _userType,
                      decoration: const InputDecoration(labelText: 'I am a…', prefixIcon: Icon(Icons.badge_outlined)),
                      items: _roles.map((r) => DropdownMenuItem(
                        value: r['slug']?.toString(),
                        child: Text(r['singularLabel']?.toString() ?? r['label']?.toString() ?? ''),
                      )).toList(),
                      onChanged: (v) => setState(() => _userType = v),
                    ),
                    const SizedBox(height: 24),
                    ElevatedButton(
                      onPressed: _submitting ? null : _submit,
                      style: ElevatedButton.styleFrom(backgroundColor: MediWyzColors.teal),
                      child: _submitting
                          ? const SizedBox(height: 18, width: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                          : const Text('Create account'),
                    ),
                    const SizedBox(height: 12),
                    TextButton(
                      onPressed: () => context.go('/login'),
                      child: const Text('Already have an account? Sign in'),
                    ),
                  ],
                ),
              ),
            ),
    );
  }
}
