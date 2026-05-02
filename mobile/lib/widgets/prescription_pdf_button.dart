import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../api/client.dart';
import '../config.dart';
import '../theme/mediwyz_theme.dart';

/// Tap → opens the print-ready HTML of a prescription in the system browser.
/// Server returns HTML with `@media print` CSS; user prints/saves from there.
/// Mirror of `components/shared/PrescriptionPdfButton.tsx`.
class PrescriptionPdfButton extends StatelessWidget {
  final String userId;
  final String prescriptionId;
  final String label;

  const PrescriptionPdfButton({
    super.key,
    required this.userId,
    required this.prescriptionId,
    this.label = 'Download PDF',
  });

  Future<void> _open(BuildContext context) async {
    final url = Uri.parse('${AppConfig.apiBase}/users/$userId/prescriptions/$prescriptionId/pdf');
    try {
      final ok = await launchUrl(url, mode: LaunchMode.externalApplication);
      if (!ok && context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Could not open PDF — check browser')),
        );
      }
    } catch (_) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Could not open PDF — check browser'), backgroundColor: Colors.red),
        );
      }
    }
    // suppress warning: ApiClient not used in this call — URL is public-ish
    // because the backend enforces ownership. Imported for future cookie use.
    // ignore: unused_local_variable
    final _ = ApiClient.instance;
  }

  @override
  Widget build(BuildContext context) {
    return OutlinedButton.icon(
      onPressed: () => _open(context),
      icon: const Icon(Icons.picture_as_pdf_outlined, size: 16, color: MediWyzColors.teal),
      label: Text(label, style: const TextStyle(color: MediWyzColors.teal, fontWeight: FontWeight.w600)),
      style: OutlinedButton.styleFrom(
        side: const BorderSide(color: Color(0xFFE5E7EB)),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
      ),
    );
  }
}
