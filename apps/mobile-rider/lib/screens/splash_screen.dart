import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';
import '../core/version_check.dart';
import '../providers/auth_provider.dart';
import '../providers/settings_provider.dart';
import 'force_update_screen.dart';

const String _kRiderBaseUrl = 'https://totalstoreug.com/api/v1';

class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen>
    with SingleTickerProviderStateMixin {
  late AnimationController _ctrl;
  late Animation<double> _logoScale;
  late Animation<double> _logoFade;
  late Animation<double> _textFade;
  late Animation<Offset> _textSlide;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(
        vsync: this, duration: const Duration(milliseconds: 1400));

    _logoFade = Tween<double>(begin: 0, end: 1).animate(CurvedAnimation(
        parent: _ctrl, curve: const Interval(0.0, 0.5, curve: Curves.easeOut)));
    _logoScale = Tween<double>(begin: 0.6, end: 1.0).animate(CurvedAnimation(
        parent: _ctrl,
        curve: const Interval(0.0, 0.6, curve: Curves.elasticOut)));
    _textFade = Tween<double>(begin: 0, end: 1).animate(CurvedAnimation(
        parent: _ctrl, curve: const Interval(0.45, 0.85, curve: Curves.easeOut)));
    _textSlide = Tween<Offset>(begin: const Offset(0, 0.4), end: Offset.zero)
        .animate(CurvedAnimation(
            parent: _ctrl,
            curve: const Interval(0.45, 0.85, curve: Curves.easeOut)));

    _ctrl.forward();
    _init();
  }

  Future<void> _init() async {
    // Kick off version check immediately — parallel with splash animation delay
    // and auth init so it never adds latency.
    final versionFuture = checkAppVersion(baseUrl: _kRiderBaseUrl, role: 'rider');

    await Future.delayed(const Duration(milliseconds: 2200));
    if (!mounted) return;
    final auth = context.read<AuthProvider>();
    final settings = context.read<SettingsProvider>();
    try {
      await Future.wait([
        auth.init().timeout(const Duration(seconds: 8), onTimeout: () {}),
        settings.load(),
      ]);
    } catch (e) {
      debugPrint('Splash init error: $e');
    }
    final version = await versionFuture;
    if (!mounted) return;

    if (version.needsForceUpdate) {
      Navigator.of(context).pushReplacement(MaterialPageRoute(
        builder: (_) => ForceUpdateScreen(
          latestVersion: version.latestVersion,
          installedVersion: version.installedVersion,
          downloadUrl: version.downloadUrl,
        ),
      ));
      return;
    }

    context.go(auth.isAuthenticated ? '/deliveries' : '/login');

    if (version.needsSoftPrompt && mounted) {
      WidgetsBinding.instance.addPostFrameCallback((_) => _showSoftUpdate(version));
    }
  }

  void _showSoftUpdate(VersionCheckResult v) {
    if (!mounted) return;
    showDialog<void>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Update available'),
        content: Text(
          'A new version (${v.latestVersion ?? 'latest'}) is available. '
          'Your current version is ${v.installedVersion ?? '—'}.',
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Later')),
          FilledButton(
            onPressed: () async {
              Navigator.pop(ctx);
              final url = v.downloadUrl;
              if (url == null || url.isEmpty) return;
              final uri = Uri.tryParse(url);
              if (uri == null) return;
              try {
                await launchUrl(uri, mode: LaunchMode.externalApplication);
              } catch (_) {/* best-effort */}
            },
            child: const Text('Update'),
          ),
        ],
      ),
    );
  }

  @override
  void dispose() { _ctrl.dispose(); super.dispose(); }

  @override
  Widget build(BuildContext context) {
    final size = MediaQuery.sizeOf(context);
    return Scaffold(
      body: Container(
        width: double.infinity,
        height: double.infinity,
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            colors: [Color(0xFF064e3b), Color(0xFF059669), Color(0xFF34d399)],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
        ),
        child: Stack(
          children: [
            Positioned(
              top: -size.height * 0.08,
              right: -size.width * 0.15,
              child: Container(
                width: size.width * 0.55,
                height: size.width * 0.55,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: Colors.white.withOpacity(0.07),
                ),
              ),
            ),
            Positioned(
              bottom: size.height * 0.08,
              left: -size.width * 0.2,
              child: Container(
                width: size.width * 0.6,
                height: size.width * 0.6,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: Colors.white.withOpacity(0.05),
                ),
              ),
            ),
            Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  // Logo
                  ScaleTransition(
                    scale: _logoScale,
                    child: FadeTransition(
                      opacity: _logoFade,
                      child: Container(
                        padding: const EdgeInsets.all(6),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(28),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withOpacity(0.18),
                              blurRadius: 32,
                              spreadRadius: 2,
                              offset: const Offset(0, 8),
                            ),
                            BoxShadow(
                              color: Colors.white.withOpacity(0.3),
                              blurRadius: 24,
                              spreadRadius: -4,
                            ),
                          ],
                        ),
                        child: ClipRRect(
                          borderRadius: BorderRadius.circular(22),
                          child: Consumer<SettingsProvider>(
                            builder: (_, sp, __) {
                              final url = sp.riderLogoUrl;
                              if (url.isNotEmpty) {
                                return Image.network(
                                  url,
                                  width: 120,
                                  height: 120,
                                  fit: BoxFit.contain,
                                  errorBuilder: (_, __, ___) => Image.asset(
                                    'assets/images/app_logo.png',
                                    width: 120,
                                    height: 120,
                                    fit: BoxFit.contain,
                                  ),
                                );
                              }
                              return Image.asset(
                                'assets/images/app_logo.png',
                                width: 120,
                                height: 120,
                                fit: BoxFit.contain,
                              );
                            },
                          ),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 32),
                  SlideTransition(
                    position: _textSlide,
                    child: FadeTransition(
                      opacity: _textFade,
                      child: Column(
                        children: [
                          const Text(
                            'TotalStore Rider',
                            style: TextStyle(
                              fontSize: 32,
                              fontWeight: FontWeight.w800,
                              color: Colors.white,
                              letterSpacing: 0.5,
                            ),
                          ),
                          const SizedBox(height: 6),
                          Text(
                            'Delivering happiness across Uganda',
                            style: TextStyle(
                              fontSize: 14,
                              color: Colors.white.withOpacity(0.85),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 64),
                  FadeTransition(opacity: _textFade, child: const _PulseDots()),
                ],
              ),
            ),
            Positioned(
              bottom: 24, left: 0, right: 0,
              child: FadeTransition(
                opacity: _textFade,
                child: Text(
                  'v1.0.0',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                      color: Colors.white.withOpacity(0.4), fontSize: 12),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _PulseDots extends StatefulWidget {
  const _PulseDots();
  @override
  State<_PulseDots> createState() => _PulseDotsState();
}

class _PulseDotsState extends State<_PulseDots>
    with SingleTickerProviderStateMixin {
  late AnimationController _c;
  @override
  void initState() {
    super.initState();
    _c = AnimationController(
        vsync: this, duration: const Duration(milliseconds: 900))
      ..repeat(reverse: true);
  }

  @override
  void dispose() { _c.dispose(); super.dispose(); }

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: List.generate(3, (i) {
        final delay = i * 0.25;
        return AnimatedBuilder(
          animation: _c,
          builder: (_, __) {
            final t = ((_c.value - delay).clamp(0.0, 1.0));
            final opacity = 0.3 + 0.7 * (t < 0.5 ? 2 * t : 2 * (1 - t));
            return Container(
              margin: const EdgeInsets.symmetric(horizontal: 4),
              width: 7, height: 7,
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(opacity),
                shape: BoxShape.circle,
              ),
            );
          },
        );
      }),
    );
  }
}
