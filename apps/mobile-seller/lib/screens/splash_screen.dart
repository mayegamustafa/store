import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';
import '../core/theme.dart';
import '../core/constants.dart';
import '../core/version_check.dart';
import '../providers/auth_provider.dart';
import '../providers/settings_provider.dart';
import 'force_update_screen.dart';

class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});
  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen>
    with SingleTickerProviderStateMixin {
  late AnimationController _ctrl;
  late Animation<double> _fade;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(
        vsync: this, duration: const Duration(milliseconds: 800));
    _fade = CurvedAnimation(parent: _ctrl, curve: Curves.easeIn);
    _ctrl.forward();
    _init();
  }

  Future<void> _init() async {
    final auth = context.read<AuthProvider>();
    final settings = context.read<SettingsProvider>();

    // Kick off auth + settings load AND version check in parallel.
    final versionFuture = checkAppVersion(baseUrl: AppConstants.baseUrl, role: 'seller');
    await Future.wait([auth.init(), settings.load()]);
    final version = await versionFuture;

    if (!mounted) return;

    // Force-update intercepts navigation — pushReplacement so the seller can't
    // go back to splash and bypass it.
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
      context.go('/dashboard');
    } else {
      context.go('/login');
    }

    // Soft prompt runs after navigation so the dialog appears on the destination
    // screen (dashboard/login). Session-scoped — won't re-fire until app restart.
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
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [AppTheme.primary, AppTheme.primaryDark],
          ),
        ),
        child: Center(
          child: FadeTransition(
            opacity: _fade,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 100,
                  height: 100,
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(24),
                  ),
                  child: Consumer<SettingsProvider>(
                    builder: (_, sp, __) {
                      if (sp.hasRemoteLogo) {
                        return ClipRRect(
                          borderRadius: BorderRadius.circular(24),
                          child: Image.network(
                            sp.sellerLogoUrl,
                            width: 100,
                            height: 100,
                            fit: BoxFit.contain,
                            errorBuilder: (_, __, ___) => const Icon(
                              Icons.storefront_rounded,
                              size: 56,
                              color: AppTheme.primary,
                            ),
                          ),
                        );
                      }
                      return const Icon(Icons.storefront_rounded,
                          size: 56, color: AppTheme.primary);
                    },
                  ),
                ),
                const SizedBox(height: 24),
                const Text(
                  'TotalStore',
                  style: TextStyle(
                    fontSize: 28,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                    fontFamily: 'Poppins',
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  'Seller Dashboard',
                  style: TextStyle(
                    fontSize: 14,
                    color: Colors.white.withValues(alpha: 0.8),
                    fontFamily: 'Poppins',
                  ),
                ),
                const SizedBox(height: 40),
                const SizedBox(
                  width: 28,
                  height: 28,
                  child: CircularProgressIndicator(
                    strokeWidth: 3,
                    valueColor: AlwaysStoppedAnimation(Colors.white),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
