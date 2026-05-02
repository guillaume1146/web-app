import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

/// Mobile equivalent of the web DashboardSidebar — fixed bottom tab bar.
/// Five most-used destinations; everything else lives in /more.
class MediWyzBottomNav extends StatelessWidget {
  final int currentIndex;
  const MediWyzBottomNav({super.key, required this.currentIndex});

  static const _routes = ['/feed', '/chat', '/search', '/billing', '/more'];

  @override
  Widget build(BuildContext context) {
    return BottomNavigationBar(
      currentIndex: currentIndex,
      onTap: (i) => context.go(_routes[i]),
      type: BottomNavigationBarType.fixed,
      items: const [
        BottomNavigationBarItem(icon: Icon(Icons.dynamic_feed), label: 'Feed'),
        BottomNavigationBarItem(icon: Icon(Icons.chat_bubble_outline), label: 'Chat'),
        BottomNavigationBarItem(icon: Icon(Icons.search), label: 'Search'),
        BottomNavigationBarItem(icon: Icon(Icons.account_balance_wallet_outlined), label: 'Billing'),
        BottomNavigationBarItem(icon: Icon(Icons.apps), label: 'More'),
      ],
    );
  }
}
