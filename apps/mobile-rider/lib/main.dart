import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:firebase_core/firebase_core.dart';
import 'core/router/app_router.dart';
import 'core/theme/app_theme.dart';
import 'core/services/app_config.dart';
import 'providers/auth_provider.dart';
import 'providers/chat_provider.dart';
import 'providers/delivery_provider.dart';
import 'providers/settings_provider.dart';
import 'services/notification_service.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  // Load remote config (Google Maps key, etc.) in background — cached values used instantly.
  AppConfig.instance.init();
  // Firebase and push notifications are only supported on Android/iOS.
  // On Linux desktop skip them to avoid platform channel errors.
  final isFirebaseSupported = defaultTargetPlatform == TargetPlatform.android ||
      defaultTargetPlatform == TargetPlatform.iOS;
  if (isFirebaseSupported) {
    try {
      await Firebase.initializeApp();
      await NotificationService.initialize();
    } catch (e) {
      debugPrint('Firebase init failed (non-fatal): $e');
    }
  }
  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthProvider()),
        // ProxyProvider wires AuthProvider → DeliveryProvider so that whenever the
        // authenticated user changes, the riderProfile.id is forwarded to the
        // DeliveryProvider for use in Socket.io rider:online / rider:location events.
        ChangeNotifierProxyProvider<AuthProvider, DeliveryProvider>(
          create: (_) => DeliveryProvider(),
          update: (_, auth, delivery) {
            final riderProfile = auth.user?['riderProfile'] as Map<String, dynamic>?;
            final profileId = riderProfile?['id'] as String?;
            delivery?.setRiderId(profileId);
            return delivery!;
          },
        ),
        ChangeNotifierProvider(create: (_) => ChatProvider()),
        ChangeNotifierProvider(create: (_) => SettingsProvider()),
      ],
      child: const TotalStoreRiderApp(),
    ),
  );
}

class TotalStoreRiderApp extends StatefulWidget {
  const TotalStoreRiderApp({super.key});
  @override
  State<TotalStoreRiderApp> createState() => _TotalStoreRiderAppState();
}

class _TotalStoreRiderAppState extends State<TotalStoreRiderApp> {
  late final GoRouter _router;

  @override
  void initState() {
    super.initState();
    // Create the router ONCE — refreshListenable:auth inside GoRouter handles
    // redirect re-evaluation without tearing down the whole router.
    _router = AppRouter.router(context.read<AuthProvider>());
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp.router(
      title: 'TotalStore Rider',
      theme: AppTheme.theme,
      routerConfig: _router,
      debugShowCheckedModeBanner: false,
    );
  }
}
