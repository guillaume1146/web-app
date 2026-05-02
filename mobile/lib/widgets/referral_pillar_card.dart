import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../api/referral_api.dart';
import '../theme/mediwyz_theme.dart';

/// Flutter parity with web `ReferralPillarCard`.
///
/// Renders the member's referral code with share + copy actions. Every
/// user (provider or member) has a referral profile auto-provisioned on
/// first `/referral-partners/me` hit, so this card is safe to show
/// unconditionally on any dashboard.
class ReferralPillarCard extends StatefulWidget {
  const ReferralPillarCard({super.key});

  @override
  State<ReferralPillarCard> createState() => _ReferralPillarCardState();
}

class _ReferralPillarCardState extends State<ReferralPillarCard> {
  Map<String, dynamic>? _stats;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final data = await ReferralApi.me();
    if (!mounted) return;
    setState(() { _stats = data; _loading = false; });
  }

  Future<void> _copyCode() async {
    final code = _stats?['referralCode']?.toString();
    if (code == null) return;
    HapticFeedback.selectionClick();
    await Clipboard.setData(ClipboardData(text: code));
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Code copied — share it anywhere')),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return Container(
        height: 140,
        decoration: BoxDecoration(
          color: Colors.grey.shade100,
          borderRadius: BorderRadius.circular(12),
        ),
      );
    }
    if (_stats == null || _stats!['referralCode'] == null) {
      return const SizedBox.shrink();
    }

    final code = _stats!['referralCode'].toString();
    final refCount = (_stats!['totalReferrals'] ?? 0) as num;
    final earned = (_stats!['totalEarnings'] ?? _stats!['totalCommissionEarned'] ?? _stats!['totalEarned'] ?? 0) as num;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [MediWyzColors.navy, MediWyzColors.teal],
          begin: Alignment.topLeft, end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 44, height: 44,
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.2),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Icon(Icons.card_giftcard, color: Colors.white),
              ),
              const SizedBox(width: 12),
              const Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Refer friends, earn credit',
                      style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16)),
                    SizedBox(height: 2),
                    Text('Every signup with your code = wallet credit',
                      style: TextStyle(color: Colors.white70, fontSize: 12)),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          Row(
            children: [
              Expanded(child: _stat('Referrals', refCount.toString())),
              const SizedBox(width: 8),
              Expanded(child: _stat('Earned', 'Rs ${earned.toStringAsFixed(0)}')),
            ],
          ),
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Row(
              children: [
                Expanded(
                  child: Text(
                    code,
                    style: const TextStyle(
                      color: Colors.white, fontFamily: 'monospace',
                      fontWeight: FontWeight.bold, fontSize: 18, letterSpacing: 2,
                    ),
                  ),
                ),
                IconButton(
                  onPressed: _copyCode,
                  icon: const Icon(Icons.copy, color: Colors.white, size: 20),
                  tooltip: 'Copy code',
                ),
              ],
            ),
          ),
          const SizedBox(height: 10),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              onPressed: _copyCode,
              icon: const Icon(Icons.share, size: 16),
              label: const Text('Share your link'),
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.white,
                foregroundColor: MediWyzColors.navy,
                padding: const EdgeInsets.symmetric(vertical: 10),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _stat(String label, String value) {
    return Container(
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(10),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label.toUpperCase(),
            style: TextStyle(color: Colors.white.withValues(alpha: 0.7), fontSize: 10, letterSpacing: 0.5)),
          const SizedBox(height: 2),
          Text(value,
            style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 18)),
        ],
      ),
    );
  }
}
