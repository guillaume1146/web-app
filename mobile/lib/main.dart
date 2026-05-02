import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'config.dart';
import 'router/app_router.dart';
import 'theme/mediwyz_theme.dart';

void main() {
  runApp(const ProviderScope(child: MediWyzApp()));
}

class MediWyzApp extends ConsumerWidget {
  const MediWyzApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = buildRouter(ref);
    return MaterialApp.router(
      title: AppConfig.appName,
      theme: buildMediWyzTheme(),
      routerConfig: router,
      debugShowCheckedModeBanner: false,
    );
  }
}
