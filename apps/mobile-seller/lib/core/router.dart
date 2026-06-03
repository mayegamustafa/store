import 'package:go_router/go_router.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../screens/splash_screen.dart';
import '../screens/login_screen.dart';
import '../screens/dashboard_screen.dart';
import '../screens/products_screen.dart';
import '../screens/product_form_screen.dart';
import '../screens/orders_screen.dart';
import '../screens/order_detail_screen.dart';
import '../screens/wallet_screen.dart';
import '../screens/profile_screen.dart';
import '../screens/subscription_screen.dart';
import '../screens/subscription_renew_prompt.dart';
import 'api_service.dart';

class AppRouter {
  static final _shellKey = GlobalKey<NavigatorState>();

  static GoRouter router(AuthProvider auth) => GoRouter(
        initialLocation: '/splash',
        redirect: (context, state) {
          final loggedIn = auth.isAuthenticated;
          final onSplash = state.matchedLocation == '/splash';
          final onLogin = state.matchedLocation == '/login';
          if (onSplash) return null;
          if (!loggedIn && !onLogin) return '/login';
          if (loggedIn && onLogin) return '/';
          return null;
        },
        refreshListenable: auth,
        routes: [
          GoRoute(path: '/splash', builder: (_, __) => const SplashScreen()),
          GoRoute(path: '/login', builder: (_, __) => const LoginScreen()),
          ShellRoute(
            navigatorKey: _shellKey,
            builder: (context, state, child) => _Shell(child: child),
            routes: [
              GoRoute(path: '/', redirect: (_, __) => '/dashboard'),
              GoRoute(
                  path: '/dashboard',
                  builder: (_, __) => const DashboardScreen()),
              GoRoute(
                  path: '/products',
                  builder: (_, __) => const ProductsScreen()),
              GoRoute(
                  path: '/products/new',
                  builder: (_, __) => const ProductFormScreen()),
              GoRoute(
                  path: '/products/:id/edit',
                  builder: (ctx, s) =>
                      ProductFormScreen(productId: s.pathParameters['id'])),
              GoRoute(
                  path: '/orders', builder: (_, __) => const OrdersScreen()),
              GoRoute(
                  path: '/orders/:id',
                  builder: (ctx, s) =>
                      OrderDetailScreen(orderId: s.pathParameters['id']!)),
              GoRoute(
                  path: '/wallet', builder: (_, __) => const WalletScreen()),
              GoRoute(
                  path: '/profile',
                  builder: (_, __) => const ProfileScreen()),
              GoRoute(
                  path: '/subscription',
                  builder: (_, __) => const SubscriptionScreen()),
            ],
          ),
        ],
      );
}

class _Shell extends StatefulWidget {
  final Widget child;
  const _Shell({required this.child});
  @override
  State<_Shell> createState() => _ShellState();
}

class _ShellState extends State<_Shell> {
  int _idx = 0;
  final _tabs = ['/dashboard', '/products', '/orders', '/wallet', '/profile'];
  // Session-scoped snooze: once "remind me later" is tapped, do not re-prompt
  // until the app is restarted. shared_preferences-backed persistence is a M4
  // follow-up.
  static bool _renewPromptShown = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _maybeShowRenewPrompt());
  }

  Future<void> _maybeShowRenewPrompt() async {
    if (_renewPromptShown || !mounted) return;
    try {
      final my = await ApiService().getMySubscription();
      final current = my['subscription'] as Map?;
      if (current == null) return;
      final inGrace = my['inGrace'] == true;
      final expiresAt = current['expiresAt'] as String?;
      final daysLeft = expiresAt != null
          ? ((DateTime.parse(expiresAt).difference(DateTime.now()).inHours) / 24).ceil()
          : null;
      final eligible = inGrace || (current['status'] == 'ACTIVE' && daysLeft != null && daysLeft <= 3);
      if (!eligible || !mounted) return;
      _renewPromptShown = true;
      final plan = current['plan'] as Map? ?? const {};
      await SubscriptionRenewPrompt.show(
        context,
        planName: plan['name']?.toString() ?? 'Plan',
        currency: plan['currency']?.toString() ?? 'UGX',
        amount: num.tryParse(plan['price']?.toString() ?? '0') ?? 0,
        billingCycle: plan['billingCycle']?.toString() ?? 'MONTHLY',
        inGrace: inGrace,
        daysLeft: daysLeft,
      );
    } catch (_) {
      // Silent — prompt is a nudge, never a blocker.
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: widget.child,
      bottomNavigationBar: NavigationBar(
        selectedIndex: _idx,
        onDestinationSelected: (i) {
          setState(() => _idx = i);
          context.go(_tabs[i]);
        },
        destinations: const [
          NavigationDestination(
              icon: Icon(Icons.dashboard_outlined),
              selectedIcon: Icon(Icons.dashboard_rounded),
              label: 'Dashboard'),
          NavigationDestination(
              icon: Icon(Icons.inventory_2_outlined),
              selectedIcon: Icon(Icons.inventory_2_rounded),
              label: 'Products'),
          NavigationDestination(
              icon: Icon(Icons.receipt_long_outlined),
              selectedIcon: Icon(Icons.receipt_long_rounded),
              label: 'Orders'),
          NavigationDestination(
              icon: Icon(Icons.account_balance_wallet_outlined),
              selectedIcon: Icon(Icons.account_balance_wallet_rounded),
              label: 'Wallet'),
          NavigationDestination(
              icon: Icon(Icons.person_outline_rounded),
              selectedIcon: Icon(Icons.person_rounded),
              label: 'Profile'),
        ],
      ),
    );
  }
}
