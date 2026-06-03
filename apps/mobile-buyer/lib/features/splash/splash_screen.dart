import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../core/theme.dart';
import '../../core/constants.dart';
import '../../core/version_check.dart';
import '../auth/auth_provider.dart';
import '../settings/settings_provider.dart';
import 'force_update_screen.dart';

class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _fadeAnim;
  late Animation<double> _scaleAnim;

  @override
  void initState() {
    super.initState();

    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1500),
    );

    _fadeAnim = Tween<double>(begin: 0, end: 1).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeOut),
    );

    _scaleAnim = Tween<double>(begin: 0.6, end: 1.0).animate(
      CurvedAnimation(parent: _controller, curve: Curves.elasticOut),
    );

    _controller.forward();
    _initApp();
  }

  Future<void> _initApp() async {
    final settings = context.read<SettingsProvider>();
    final auth = context.read<AuthProvider>();

    // Run version check in parallel with other init so it never lengthens splash.
    final versionFuture = checkAppVersion(baseUrl: AppConstants.baseUrl, role: 'buyer');

    await Future.wait([
      settings.fetchPublicSettings(),
      auth.init(),
      Future.delayed(AppConstants.splashDuration),
    ]);

    final version = await versionFuture;

    if (!mounted) return;

    // Force-update intercepts navigation entirely.
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

    if (auth.isAuthenticated) {
      Navigator.of(context).pushReplacementNamed('/main');
    } else if (auth.biometricEnabled) {
      Navigator.of(context).pushReplacementNamed('/login');
    } else {
      Navigator.of(context).pushReplacementNamed('/onboarding');
    }

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
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        width: double.infinity,
        height: double.infinity,
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              AppTheme.primaryColor,
              AppTheme.primaryColor.withValues(alpha: 0.85),
              AppTheme.accentColor.withValues(alpha: 0.7),
            ],
          ),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            FadeTransition(
              opacity: _fadeAnim,
              child: ScaleTransition(
                scale: _scaleAnim,
                child: Container(
                  width: 120,
                  height: 120,
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(28),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.15),
                        blurRadius: 30,
                        offset: const Offset(0, 10),
                      ),
                    ],
                  ),
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(28),
                    child: Consumer<SettingsProvider>(
                      builder: (_, sp, __) {
                        final url = sp.buyerLogoUrl;
                        if (url.isNotEmpty) {
                          return Image.network(
                            url,
                            fit: BoxFit.contain,
                            errorBuilder: (_, __, ___) => Image.asset(
                              'assets/images/app_logo.png',
                              fit: BoxFit.contain,
                              errorBuilder: (_, __, ___) => Icon(
                                Icons.shopping_bag_rounded,
                                size: 56,
                                color: AppTheme.primaryColor,
                              ),
                            ),
                          );
                        }
                        return Image.asset(
                          'assets/images/app_logo.png',
                          fit: BoxFit.contain,
                          errorBuilder: (_, __, ___) => Icon(
                            Icons.shopping_bag_rounded,
                            size: 56,
                            color: AppTheme.primaryColor,
                          ),
                        );
                      },
                    ),
                  ),
                ),
              ),
            ),
            const SizedBox(height: 24),
            FadeTransition(
              opacity: _fadeAnim,
              child: Text(
                AppConstants.appName,
                style: const TextStyle(
                  fontSize: 32,
                  fontWeight: FontWeight.w800,
                  color: Colors.white,
                  letterSpacing: -0.5,
                ),
              ),
            ),
            const SizedBox(height: 8),
            FadeTransition(
              opacity: _fadeAnim,
              child: Text(
                'Shop. Track. Enjoy.',
                style: TextStyle(
                  fontSize: 16,
                  color: Colors.white.withValues(alpha: 0.85),
                  fontWeight: FontWeight.w400,
                ),
              ),
            ),
            const SizedBox(height: 48),
            FadeTransition(
              opacity: _fadeAnim,
              child: SizedBox(
                width: 24,
                height: 24,
                child: CircularProgressIndicator(
                  strokeWidth: 2.5,
                  color: Colors.white.withValues(alpha: 0.8),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
