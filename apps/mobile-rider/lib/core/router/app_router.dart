import 'package:go_router/go_router.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../providers/chat_provider.dart';
import '../../core/navigation/navigator_key.dart';
import '../../core/theme/app_theme.dart';
import '../../screens/splash_screen.dart';
import '../../screens/auth/login_screen.dart';
import '../../screens/home/home_screen.dart';
import '../../screens/delivery/delivery_detail_screen.dart';
import '../../screens/earnings/earnings_screen.dart';
import '../../screens/profile/profile_screen.dart';
import '../../screens/chat/chat_list_screen.dart';

class AppRouter {
  static GoRouter router(AuthProvider auth) => GoRouter(
    navigatorKey: rootNavigatorKey,
    initialLocation: '/splash',
    redirect: (context, state) {
      final loggedIn = auth.isAuthenticated;
      final onSplash = state.matchedLocation == '/splash';
      final onAuth = state.matchedLocation == '/login';
      if (onSplash) return null;
      if (!loggedIn && !onAuth) return '/login';
      if (loggedIn && onAuth) return '/';
      return null;
    },
    refreshListenable: auth,
    routes: [
      GoRoute(path: '/splash', builder: (_, __) => const SplashScreen()),
      GoRoute(path: '/login', builder: (_, __) => const LoginScreen()),
      ShellRoute(
        builder: (context, state, child) =>
            _Shell(child: child, location: state.matchedLocation),
        routes: [
          GoRoute(path: '/', redirect: (_, __) => '/deliveries'),
          GoRoute(path: '/deliveries', builder: (_, __) => const HomeScreen()),
          GoRoute(
            path: '/deliveries/:id',
            builder: (ctx, s) =>
                DeliveryDetailScreen(deliveryId: s.pathParameters['id']!),
          ),
          GoRoute(path: '/earnings', builder: (_, __) => const EarningsScreen()),
          GoRoute(path: '/messages', builder: (_, __) => const ChatListScreen()),
          GoRoute(path: '/profile', builder: (_, __) => const ProfileScreen()),
        ],
      ),
    ],
  );
}

class _Shell extends StatefulWidget {
  final Widget child;
  final String location;
  const _Shell({required this.child, required this.location});

  @override
  State<_Shell> createState() => _ShellState();
}

class _ShellState extends State<_Shell> {
  static const _tabs = [
    '/deliveries',
    '/earnings',
    '/messages',
    '/profile',
  ];

  int get _currentIndex {
    final loc = widget.location;
    if (loc.startsWith('/deliveries')) return 0;
    if (loc.startsWith('/earnings')) return 1;
    if (loc.startsWith('/messages')) return 2;
    if (loc.startsWith('/profile')) return 3;
    return 0;
  }

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<ChatProvider>().init();
    });
  }

  @override
  Widget build(BuildContext context) {
    final hideNav = widget.location.startsWith('/deliveries/');
    return Scaffold(
      extendBody: true,
      body: widget.child,
      bottomNavigationBar: hideNav ? null : _buildFloatingNav(),
    );
  }

  Widget _buildFloatingNav() {
    final idx = _currentIndex;
    return Consumer<ChatProvider>(
      builder: (context, chat, _) {
        final unread = chat.conversations.fold<int>(
          0,
          (sum, c) => sum + ((c['unreadCount'] as int?) ?? 0),
        );
        return Container(
          color: Colors.transparent,
          child: SafeArea(
            top: false,
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
              child: Container(
                height: 64,
                decoration: BoxDecoration(
                  color: const Color(0xFF0F172A),
                  borderRadius: BorderRadius.circular(32),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.30),
                      blurRadius: 24,
                      offset: const Offset(0, 8),
                    ),
                  ],
                ),
                child: Row(
                  children: [
                    _NavItem(
                      icon: Icons.local_shipping_outlined,
                      activeIcon: Icons.local_shipping_rounded,
                      label: 'Deliveries',
                      active: idx == 0,
                      onTap: () => context.go(_tabs[0]),
                    ),
                    _NavItem(
                      icon: Icons.account_balance_wallet_outlined,
                      activeIcon: Icons.account_balance_wallet_rounded,
                      label: 'Earnings',
                      active: idx == 1,
                      onTap: () => context.go(_tabs[1]),
                    ),
                    _NavItem(
                      icon: Icons.chat_bubble_outline_rounded,
                      activeIcon: Icons.chat_bubble_rounded,
                      label: 'Messages',
                      active: idx == 2,
                      badge: unread > 0 ? unread : null,
                      onTap: () => context.go(_tabs[2]),
                    ),
                    _NavItem(
                      icon: Icons.person_outline_rounded,
                      activeIcon: Icons.person_rounded,
                      label: 'Profile',
                      active: idx == 3,
                      onTap: () => context.go(_tabs[3]),
                    ),
                  ],
                ),
              ),
            ),
          ),
        );
      },
    );
  }
}

class _NavItem extends StatelessWidget {
  final IconData icon;
  final IconData activeIcon;
  final String label;
  final bool active;
  final int? badge;
  final VoidCallback onTap;

  const _NavItem({
    required this.icon,
    required this.activeIcon,
    required this.label,
    required this.active,
    required this.onTap,
    this.badge,
  });

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: GestureDetector(
        onTap: onTap,
        behavior: HitTestBehavior.opaque,
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            AnimatedContainer(
              duration: const Duration(milliseconds: 250),
              curve: Curves.easeOutBack,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 5),
              decoration: BoxDecoration(
                color: active
                    ? AppTheme.primaryGreen.withOpacity(0.20)
                    : Colors.transparent,
                borderRadius: BorderRadius.circular(20),
              ),
              child: Stack(
                clipBehavior: Clip.none,
                children: [
                  Icon(
                    active ? activeIcon : icon,
                    size: 22,
                    color: active
                        ? AppTheme.primaryGreen
                        : Colors.white.withOpacity(0.50),
                  ),
                  if (badge != null && badge! > 0)
                    Positioned(
                      top: -5,
                      right: -7,
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 4, vertical: 1),
                        decoration: BoxDecoration(
                          color: AppTheme.dangerRed,
                          borderRadius: BorderRadius.circular(8),
                        ),
                        constraints: const BoxConstraints(
                            minWidth: 14, minHeight: 14),
                        child: Text(
                          badge! > 99 ? '99+' : '$badge',
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 9,
                            fontWeight: FontWeight.w700,
                          ),
                          textAlign: TextAlign.center,
                        ),
                      ),
                    ),
                ],
              ),
            ),
            const SizedBox(height: 2),
            AnimatedDefaultTextStyle(
              duration: const Duration(milliseconds: 200),
              style: TextStyle(
                fontSize: 10,
                fontWeight: active ? FontWeight.w700 : FontWeight.w400,
                color: active
                    ? AppTheme.primaryGreen
                    : Colors.white.withOpacity(0.45),
                letterSpacing: 0.3,
              ),
              child: Text(label),
            ),
          ],
        ),
      ),
    );
  }
}


