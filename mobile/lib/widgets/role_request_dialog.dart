import 'package:flutter/material.dart';
import '../api/roles_api.dart';
import '../theme/mediwyz_theme.dart';

/// Parity with the web signup `RoleRequestModal`. Shows a bottom sheet
/// (mobile-friendly) for proposing a new provider role. On success the
/// backend creates a pending `ProviderRole` that a regional admin
/// reviews via `/regional/workflows/role-requests`.
///
/// Usage:
///   showModalBottomSheet(
///     context: context,
///     isScrollControlled: true,
///     builder: (_) => const RoleRequestSheet(),
///   );
class RoleRequestSheet extends StatefulWidget {
  const RoleRequestSheet({super.key});

  @override
  State<RoleRequestSheet> createState() => _RoleRequestSheetState();
}

class _RoleRequestSheetState extends State<RoleRequestSheet> {
  final _label = TextEditingController();
  final _description = TextEditingController();
  bool _busy = false;
  String? _error;

  @override
  void dispose() {
    _label.dispose();
    _description.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_label.text.trim().length < 3) {
      setState(() => _error = 'Role name must be at least 3 characters.');
      return;
    }
    setState(() { _busy = true; _error = null; });
    try {
      await RolesApi.request(
        label: _label.text.trim(),
        description: _description.text.trim().isEmpty ? null : _description.text.trim(),
      );
      if (!mounted) return;
      Navigator.of(context).pop(true);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Request submitted — awaiting regional admin review'),
          backgroundColor: MediWyzColors.teal,
        ),
      );
    } catch (e) {
      if (!mounted) return;
      setState(() { _error = e.toString().replaceFirst('Exception: ', ''); _busy = false; });
    }
  }

  @override
  Widget build(BuildContext context) {
    final padding = MediaQuery.of(context).viewInsets.bottom;
    return Padding(
      padding: EdgeInsets.only(left: 20, right: 20, top: 16, bottom: 16 + padding),
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: Container(
                width: 40, height: 4, margin: const EdgeInsets.only(bottom: 12),
                decoration: BoxDecoration(
                  color: Colors.grey.shade300,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            const Text(
              'Propose a new provider role',
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18),
            ),
            const SizedBox(height: 4),
            Text(
              'Your request goes to a regional admin. You can sign up as a patient in the meantime.',
              style: TextStyle(color: Colors.black.withValues(alpha: 0.54), fontSize: 13),
            ),
            const SizedBox(height: 14),
            TextField(
              controller: _label,
              maxLength: 40,
              decoration: InputDecoration(
                labelText: 'Role name',
                hintText: 'e.g. Audiologist, Osteopath, Homeopath',
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
              ),
            ),
            const SizedBox(height: 10),
            TextField(
              controller: _description,
              maxLength: 200,
              maxLines: 3,
              decoration: InputDecoration(
                labelText: 'What does this role do?',
                hintText: 'Short description for the reviewer',
                alignLabelWithHint: true,
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
              ),
            ),
            if (_error != null) ...[
              const SizedBox(height: 8),
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: Colors.red.shade50,
                  border: Border.all(color: Colors.red.shade200),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(_error!, style: TextStyle(color: Colors.red.shade700, fontSize: 13)),
              ),
            ],
            const SizedBox(height: 14),
            Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                TextButton(
                  onPressed: _busy ? null : () => Navigator.of(context).pop(false),
                  child: const Text('Cancel'),
                ),
                const SizedBox(width: 8),
                ElevatedButton(
                  onPressed: _busy ? null : _submit,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: MediWyzColors.navy,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                  child: Text(_busy ? 'Submitting…' : 'Submit request'),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
