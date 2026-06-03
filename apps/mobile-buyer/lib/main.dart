import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:firebase_core/firebase_core.dart';
import 'core/api/api_service.dart';
import 'core/theme.dart';
import 'core/services/notification_service.dart';
import 'core/services/app_config.dart';
import 'features/auth/auth_provider.dart';
import 'features/products/products_provider.dart';
import 'features/cart/cart_provider.dart';
import 'features/orders/orders_provider.dart';
import 'features/settings/settings_provider.dart';
import 'features/wishlist/wishlist_provider.dart';
import 'features/splash/splash_screen.dart';
import 'features/splash/onboarding_screen.dart';
import 'features/auth/login_screen.dart';
import 'features/auth/register_screen.dart';
import 'features/home/main_screen.dart';
import 'features/products/product_detail_screen.dart';
import 'features/products/product_list_screen.dart';
import 'features/products/search_screen.dart';
import 'features/cart/checkout_screen.dart';
import 'features/orders/order_detail_screen.dart';
import 'features/orders/order_tracking_screen.dart';
import 'features/notifications/notifications_screen.dart';
import 'features/wishlist/wishlist_screen.dart';
import 'features/settings/addresses_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  // Load remote config (Maps key, API URLs) — uses cached values instantly, refreshes in background.
  AppConfig.instance.init();
  // Firebase uses a placeholder google-services.json — guard against native init failures.
  try {
    await Firebase.initializeApp();
    await NotificationService().init();
  } catch (e) {
    debugPrint('Firebase init failed (non-fatal): $e');
  }
  // Initialize API service (loads tokens from secure storage, sets up interceptors)
  await ApiService().init();
  runApp(const TotalStoreApp());
}

class TotalStoreApp extends StatelessWidget {
  const TotalStoreApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthProvider()..init()),
        ChangeNotifierProvider(create: (_) => SettingsProvider()..fetchPublicSettings()),
        ChangeNotifierProvider(create: (_) => ProductsProvider()),
        ChangeNotifierProvider(create: (_) => CartProvider()),
        ChangeNotifierProvider(create: (_) => OrdersProvider()),
        ChangeNotifierProvider(create: (_) => WishlistProvider()),
      ],
      child: MaterialApp(
        title: 'TotalStore',
        debugShowCheckedModeBanner: false,
        theme: AppTheme.buildTheme(),
        home: const SplashScreen(),
        routes: {
          '/onboarding': (_) => const OnboardingScreen(),
          '/login': (_) => const LoginScreen(),
          '/register': (_) => const RegisterScreen(),
          '/main': (_) => const MainScreen(),
          '/search': (_) => const SearchScreen(),
          '/checkout': (_) => const CheckoutScreen(),
          '/notifications': (_) => const NotificationsScreen(),
          '/wishlist': (_) => const WishlistScreen(),
          '/addresses': (_) => const AddressesScreen(),
        },
        onGenerateRoute: (settings) {
          // /products (category listing)
          if (settings.name == '/products') {
            return MaterialPageRoute(
              settings: settings,
              builder: (_) => const ProductListScreen(),
            );
          }
          // /product (with slug as argument)
          if (settings.name == '/product') {
            return MaterialPageRoute(
              settings: settings,
              builder: (_) => const ProductDetailScreen(),
            );
          }
          // /product/:slug
          if (settings.name?.startsWith('/product/') == true) {
            final slug = settings.name!.replaceFirst('/product/', '');
            return MaterialPageRoute(
              settings: RouteSettings(name: settings.name, arguments: slug),
              builder: (_) => const ProductDetailScreen(),
            );
          }
          // /category/:slug
          if (settings.name?.startsWith('/category/') == true) {
            final slug = settings.name!.replaceFirst('/category/', '');
            return MaterialPageRoute(
              settings: RouteSettings(name: settings.name, arguments: {'categoryId': slug, 'title': 'Category'}),
              builder: (_) => const ProductListScreen(),
            );
          }
          // /order/:id/track
          if (settings.name != null && RegExp(r'^/order/[^/]+/track$').hasMatch(settings.name!)) {
            final id = settings.name!.replaceFirst('/order/', '').replaceFirst('/track', '');
            return MaterialPageRoute(
              builder: (_) => OrderTrackingScreen(orderId: id),
            );
          }
          // /order/:id
          if (settings.name?.startsWith('/order/') == true) {
            final id = settings.name!.replaceFirst('/order/', '');
            return MaterialPageRoute(
              builder: (_) => OrderDetailScreen(orderId: id),
            );
          }
          return null;
        },
      ),
    );
  }
}

