import 'dart:io';
import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:package_info_plus/package_info_plus.dart';
import 'package:url_launcher/url_launcher.dart';

/// In-app update checker.
/// Checks /apps/version.json on the web server and prompts the user
/// if a newer version is available.
class UpdateService {
  // Admin-controlled: Settings → app versions / download URLs feed
  // /config/public. The old /apps/version.json static file 404'd, so
  // update prompts never appeared.
  static const String _versionUrl = 'https://totalstoreug.com/api/v1/config/public';
  static const String _appKey = 'seller';

  /// [manual] = true when the seller taps "Check for updates" — then we also
  /// show feedback when already up to date or when the check fails. Auto
  /// (startup) checks stay silent unless an update is available.
  static Future<void> checkForUpdate(BuildContext context, {bool manual = false}) async {
    try {
      final packageInfo = await PackageInfo.fromPlatform();
      final currentVersion = packageInfo.version;

      final dio = Dio();
      dio.options.connectTimeout = const Duration(seconds: 5);
      dio.options.receiveTimeout = const Duration(seconds: 5);
      final response = await dio.get(_versionUrl);
      if (response.statusCode != 200) {
        if (manual) _snack(context, 'Could not check for updates. Try again.');
        return;
      }

      final data = response.data;
      final apps = data is Map ? (data['apps'] ?? data) : null;
      final appData = apps is Map ? apps[_appKey] : null;
      final latestVersion = appData?['version'] as String? ?? '';
      final downloadUrl =
          (appData?['downloadUrl'] ?? appData?['url'] ?? '') as String;
      if (latestVersion.isEmpty) {
        if (manual) _snack(context, "You're on the latest version ($currentVersion)");
        return;
      }
      final forceUpdate = appData?['forceUpdate'] == true;
      final minVersion = appData?['minVersion'] as String? ?? '0.0.0';
      final changelog = appData?['changelog'] as String? ?? '';

      if (_isNewerVersion(latestVersion, currentVersion) && downloadUrl.isNotEmpty) {
        final mustUpdate = forceUpdate || _isNewerVersion(minVersion, currentVersion);
        if (!context.mounted) return;
        _showUpdateDialog(
          context,
          latestVersion: latestVersion,
          downloadUrl: downloadUrl.startsWith('http')
              ? downloadUrl
              : 'https://totalstoreug.com$downloadUrl',
          changelog: changelog,
          forceUpdate: mustUpdate,
        );
      } else if (manual) {
        _snack(context, "You're on the latest version ($currentVersion)");
      }
    } catch (_) {
      if (manual) _snack(context, 'Update check failed. Try again.');
    }
  }

  static void _snack(BuildContext context, String msg) {
    if (!context.mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg)));
  }

  static bool _isNewerVersion(String a, String b) {
    final partsA = a.split('.').map(int.tryParse).toList();
    final partsB = b.split('.').map(int.tryParse).toList();
    for (var i = 0; i < 3; i++) {
      final va = i < partsA.length ? (partsA[i] ?? 0) : 0;
      final vb = i < partsB.length ? (partsB[i] ?? 0) : 0;
      if (va > vb) return true;
      if (va < vb) return false;
    }
    return false;
  }

  static void _showUpdateDialog(
    BuildContext context, {
    required String latestVersion,
    required String downloadUrl,
    required String changelog,
    required bool forceUpdate,
  }) {
    showDialog(
      context: context,
      barrierDismissible: !forceUpdate,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: Colors.blue.shade50,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(Icons.system_update, color: Colors.blue.shade700, size: 24),
            ),
            const SizedBox(width: 12),
            const Expanded(child: Text('Update Available', style: TextStyle(fontSize: 18))),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Version $latestVersion is available.',
              style: const TextStyle(fontWeight: FontWeight.w600),
            ),
            if (changelog.isNotEmpty) ...[
              const SizedBox(height: 8),
              Text(changelog, style: TextStyle(color: Colors.grey.shade600, fontSize: 13)),
            ],
            if (forceUpdate) ...[
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: Colors.orange.shade50,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  children: [
                    Icon(Icons.warning_amber_rounded, color: Colors.orange.shade700, size: 18),
                    const SizedBox(width: 8),
                    const Expanded(
                      child: Text(
                        'This update is required to continue using the app.',
                        style: TextStyle(fontSize: 12),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ],
        ),
        actions: [
          if (!forceUpdate)
            TextButton(
              onPressed: () => Navigator.of(ctx).pop(),
              child: const Text('Later'),
            ),
          FilledButton.icon(
            onPressed: () async {
              final uri = Uri.parse(downloadUrl);
              if (await canLaunchUrl(uri)) {
                await launchUrl(uri, mode: LaunchMode.externalApplication);
              }
            },
            icon: const Icon(Icons.download, size: 18),
            label: const Text('Update Now'),
          ),
        ],
      ),
    );
  }
}
