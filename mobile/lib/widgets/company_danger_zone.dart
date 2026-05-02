import 'package:flutter/material.dart';
import '../api/client.dart';

/// Transfer + delete danger zone on the My Company screen. Both actions
/// require typing the company name to confirm. Fires `onChanged` on success.
class CompanyDangerZone extends StatefulWidget {
  final String companyId;
  final String companyName;
  final VoidCallback? onChanged;
  const CompanyDangerZone({
    super.key,
    required this.companyId,
    required this.companyName,
    this.onChanged,
  });
  @override
  State<CompanyDangerZone> createState() => _CompanyDangerZoneState();
}

class _CompanyDangerZoneState extends State<CompanyDangerZone> {
  Future<void> _openTransfer() async {
    final emailCtrl = TextEditingController();
    final confirmCtrl = TextEditingController();
    bool busy = false;
    String? error;

    await showDialog<void>(
      context: context,
      builder: (ctx) => StatefulBuilder(builder: (ctx, setDlg) {
        final disabled = busy || confirmCtrl.text.trim() != widget.companyName.trim() || emailCtrl.text.trim().isEmpty;
        return AlertDialog(
          title: const Row(children: [
            Icon(Icons.swap_horiz, color: Colors.red),
            SizedBox(width: 8),
            Text('Transfer ownership'),
          ]),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Text('The new owner will receive a notification and take full control.',
                  style: TextStyle(color: Colors.black54, fontSize: 12)),
              const SizedBox(height: 12),
              TextField(
                controller: emailCtrl,
                keyboardType: TextInputType.emailAddress,
                decoration: const InputDecoration(labelText: "New owner's email", border: OutlineInputBorder()),
                onChanged: (_) => setDlg(() {}),
              ),
              const SizedBox(height: 10),
              TextField(
                controller: confirmCtrl,
                decoration: InputDecoration(
                  labelText: 'Type "${widget.companyName}" to confirm',
                  border: const OutlineInputBorder(),
                ),
                onChanged: (_) => setDlg(() {}),
              ),
              if (error != null) ...[
                const SizedBox(height: 10),
                Text(error!, style: const TextStyle(color: Colors.red, fontSize: 12)),
              ],
            ],
          ),
          actions: [
            TextButton(onPressed: busy ? null : () => Navigator.pop(ctx), child: const Text('Cancel')),
            FilledButton(
              onPressed: disabled ? null : () async {
                setDlg(() { busy = true; error = null; });
                try {
                  final res = await ApiClient.instance.post(
                    '/corporate/companies/${widget.companyId}/transfer',
                    data: {'newOwnerEmail': emailCtrl.text.trim()},
                  );
                  final ok = (res.data as Map?)?['success'] == true;
                  if (!ok) throw Exception((res.data as Map?)?['message']?.toString() ?? 'Transfer failed');
                  if (ctx.mounted) Navigator.pop(ctx);
                  widget.onChanged?.call();
                } catch (e) {
                  setDlg(() { busy = false; error = e.toString(); });
                }
              },
              style: FilledButton.styleFrom(backgroundColor: Colors.red.shade700),
              child: busy
                  ? const SizedBox(height: 16, width: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                  : const Text('Transfer'),
            ),
          ],
        );
      }),
    );
    emailCtrl.dispose();
    confirmCtrl.dispose();
  }

  Future<void> _openDelete() async {
    final confirmCtrl = TextEditingController();
    bool busy = false;
    String? error;

    await showDialog<void>(
      context: context,
      builder: (ctx) => StatefulBuilder(builder: (ctx, setDlg) {
        final disabled = busy || confirmCtrl.text.trim() != widget.companyName.trim();
        return AlertDialog(
          title: const Row(children: [
            Icon(Icons.delete_forever, color: Colors.red),
            SizedBox(width: 8),
            Text('Delete company'),
          ]),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Text('All memberships will be removed. This cannot be undone.',
                  style: TextStyle(color: Colors.black54, fontSize: 12)),
              const SizedBox(height: 12),
              TextField(
                controller: confirmCtrl,
                decoration: InputDecoration(
                  labelText: 'Type "${widget.companyName}" to confirm',
                  border: const OutlineInputBorder(),
                ),
                onChanged: (_) => setDlg(() {}),
              ),
              if (error != null) ...[
                const SizedBox(height: 10),
                Text(error!, style: const TextStyle(color: Colors.red, fontSize: 12)),
              ],
            ],
          ),
          actions: [
            TextButton(onPressed: busy ? null : () => Navigator.pop(ctx), child: const Text('Cancel')),
            FilledButton(
              onPressed: disabled ? null : () async {
                setDlg(() { busy = true; error = null; });
                try {
                  final res = await ApiClient.instance.delete('/corporate/companies/${widget.companyId}');
                  final ok = (res.data as Map?)?['success'] == true;
                  if (!ok) throw Exception((res.data as Map?)?['message']?.toString() ?? 'Delete failed');
                  if (ctx.mounted) Navigator.pop(ctx);
                  widget.onChanged?.call();
                } catch (e) {
                  setDlg(() { busy = false; error = e.toString(); });
                }
              },
              style: FilledButton.styleFrom(backgroundColor: Colors.red.shade700),
              child: busy
                  ? const SizedBox(height: 16, width: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                  : const Text('Delete'),
            ),
          ],
        );
      }),
    );
    confirmCtrl.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Card(
      color: Colors.red.shade50,
      margin: const EdgeInsets.only(top: 16),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(children: [
              Icon(Icons.warning_amber_outlined, color: Colors.red.shade700),
              const SizedBox(width: 8),
              Text('Danger zone', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.red.shade900)),
            ]),
            const SizedBox(height: 4),
            Text('Ownership transfer and deletion are irreversible.',
                style: TextStyle(fontSize: 12, color: Colors.red.shade700)),
            const SizedBox(height: 10),
            Row(children: [
              OutlinedButton.icon(
                onPressed: _openTransfer,
                icon: const Icon(Icons.swap_horiz, size: 16),
                label: const Text('Transfer'),
                style: OutlinedButton.styleFrom(
                  foregroundColor: Colors.red.shade700,
                  side: BorderSide(color: Colors.red.shade300),
                ),
              ),
              const SizedBox(width: 8),
              FilledButton.icon(
                onPressed: _openDelete,
                icon: const Icon(Icons.delete_outline, size: 16),
                label: const Text('Delete'),
                style: FilledButton.styleFrom(backgroundColor: Colors.red.shade700),
              ),
            ]),
          ],
        ),
      ),
    );
  }
}
