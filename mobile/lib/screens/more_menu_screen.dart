import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../services/auth_service.dart';
import '../theme/mediwyz_theme.dart';
import '../widgets/app_drawer.dart';
import '../widgets/bottom_nav.dart';

/// Central launcher — complements the 5-tab bottom nav for features that
/// don't fit in the primary bar. Every MediWyz capability is reachable here.
class MoreMenuScreen extends ConsumerWidget {
  const MoreMenuScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(authProvider).user;
    final displayName = user == null ? '' : '${user['firstName'] ?? ''} ${user['lastName'] ?? ''}'.trim();

    final sections = <_Section>[
      _Section('My health', [
        _Item('Consultations', Icons.event_available, '/consultations'),
        _Item('Notifications', Icons.notifications_outlined, '/notifications'),
        _Item('Prescriptions', Icons.medication_outlined, '/prescriptions'),
        _Item('Lab results', Icons.science_outlined, '/lab-results'),
        _Item('Medical records', Icons.description_outlined, '/medical-records'),
        _Item('Health tracker', Icons.favorite_outline, '/health-tracker'),
        _Item('AI food scan', Icons.camera_alt_outlined, '/food-scan'),
        _Item('Insights', Icons.insights_outlined, '/insights'),
      ]),
      _Section('Services', [
        _Item('Find provider', Icons.search, '/search'),
        _Item('Bookings', Icons.event_note_outlined, '/bookings'),
        _Item('Health Shop', Icons.storefront_outlined, '/health-shop'),
        _Item('Emergency', Icons.emergency_outlined, '/emergency'),
        _Item('AI Assistant', Icons.auto_awesome, '/ai-assistant'),
      ]),
      _Section('Provider tools', [
        _Item('Booking requests', Icons.inbox_outlined, '/provider/booking-requests'),
        _Item('My services', Icons.medical_services_outlined, '/provider/services'),
        _Item('Inventory', Icons.inventory_2_outlined, '/provider/inventory'),
        _Item('Workflows', Icons.account_tree_outlined, '/provider/workflows'),
        _Item('My schedule', Icons.schedule_outlined, '/provider/schedule'),
      ]),
      _Section('Insurance', [
        _Item('Browse plans', Icons.shield_outlined, '/insurance/plans'),
        _Item('Portfolio', Icons.people_alt_outlined, '/insurance/portfolio'),
        _Item('Claims', Icons.assignment_outlined, '/insurance/claims'),
      ]),
      _Section('Referral partner', [
        _Item('Referral dashboard', Icons.share_outlined, '/referral/dashboard'),
      ]),
      _Section('Admin', [
        _Item('Admin console', Icons.admin_panel_settings_outlined, '/admin'),
        _Item('Commission config', Icons.payments_outlined, '/admin/commission'),
        _Item('Content (CMS)', Icons.web_asset, '/admin/content'),
      ]),
      _Section('Account', [
        _Item('Plans & subscriptions', Icons.card_membership_outlined, '/subscriptions'),
        _Item('Network', Icons.people_outline, '/connections'),
        _Item('My company', Icons.business_outlined, '/my-company'),
        _Item('Settings', Icons.settings_outlined, '/settings'),
        _Item('Help', Icons.help_outline, '/help'),
      ]),
    ];

    return Scaffold(
      drawer: const AppDrawer(),
      appBar: AppBar(title: const Text('More', style: TextStyle(fontWeight: FontWeight.bold))),
      bottomNavigationBar: const MediWyzBottomNav(currentIndex: 4),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          if (user != null)
            Card(
              child: ListTile(
                leading: CircleAvatar(
                  radius: 24,
                  backgroundImage: user['profileImage'] != null ? NetworkImage(user['profileImage'].toString()) : null,
                  backgroundColor: MediWyzColors.sky,
                  child: user['profileImage'] == null ? const Icon(Icons.person, size: 28, color: MediWyzColors.navy) : null,
                ),
                title: Text(displayName.isEmpty ? 'User' : displayName, style: const TextStyle(fontWeight: FontWeight.w600, color: MediWyzColors.navy)),
                subtitle: Text(user['userType']?.toString().replaceAll('_', ' ') ?? ''),
                trailing: const Icon(Icons.chevron_right),
                onTap: () => context.go('/profile'),
              ),
            ),
          const SizedBox(height: 8),
          ...sections.map((s) => _SectionWidget(section: s)),
        ],
      ),
    );
  }
}

class _Section {
  final String title; final List<_Item> items;
  _Section(this.title, this.items);
}

class _Item {
  final String label; final IconData icon; final String path;
  _Item(this.label, this.icon, this.path);
}

class _SectionWidget extends StatelessWidget {
  final _Section section;
  const _SectionWidget({required this.section});
  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 12),
          child: Text(
            section.title.toUpperCase(),
            style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: Colors.black54, letterSpacing: 0.5),
          ),
        ),
        Card(
          child: Column(
            children: [
              for (int i = 0; i < section.items.length; i++) ...[
                ListTile(
                  leading: Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(color: MediWyzColors.sky.withValues(alpha: 0.2), borderRadius: BorderRadius.circular(8)),
                    child: Icon(section.items[i].icon, color: MediWyzColors.teal, size: 20),
                  ),
                  title: Text(section.items[i].label),
                  trailing: const Icon(Icons.chevron_right, color: Colors.black26),
                  onTap: () => context.go(section.items[i].path),
                ),
                if (i < section.items.length - 1) const Divider(height: 1, indent: 58),
              ],
            ],
          ),
        ),
      ],
    );
  }
}
