import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:firebase_core/firebase_core.dart';
import 'core/api_service.dart';
import 'core/theme.dart';
import 'core/router.dart';
import 'core/services/notification_service.dart';
import 'providers/auth_provider.dart';
import 'providers/products_provider.dart';
import 'providers/orders_provider.dart';
import 'providers/settings_provider.dart';
import 'providers/wallet_provider.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  try {
    await Firebase.initializeApp();
    await NotificationService().init();
  } catch (e) {
    debugPrint('Firebase init failed (non-fatal): $e');
  }
  await ApiService().init();
  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthProvider()),
        ChangeNotifierProvider(create: (_) => ProductsProvider()),
        ChangeNotifierProvider(create: (_) => OrdersProvider()),
        ChangeNotifierProvider(create: (_) => SettingsProvider()),
        ChangeNotifierProvider(create: (_) => WalletProvider()),
      ],
      child: const TotalStoreSellerApp(),
    ),
  );
}

class TotalStoreSellerApp extends StatefulWidget {
  const TotalStoreSellerApp({super.key});
  @override
  State<TotalStoreSellerApp> createState() => _TotalStoreSellerAppState();
}

class _TotalStoreSellerAppState extends State<TotalStoreSellerApp> {
  late final GoRouter _router;

  @override
  void initState() {
    super.initState();
    _router = AppRouter.router(context.read<AuthProvider>());
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp.router(
      title: 'TotalStore Seller',
      theme: AppTheme.theme,
      routerConfig: _router,
      debugShowCheckedModeBanner: false,
    );
  }
}
