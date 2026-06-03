import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

/// Non-dismissible screen shown when the installed app version is below the
/// `apps.rider.minVersion` returned by `/config/public` AND
/// `apps.rider.forceUpdate == true`. Critical for rider — keeps tracking/GPS
/// behavior synchronized with backend contract expectations.
class ForceUpdateScreen extends StatelessWidget {
  final String? latestVersion;
  final String? installedVersion;
  final String? downloadUrl;

  const ForceUpdateScreen({
    super.key,
    this.latestVersion,
    this.installedVersion,
    this.downloadUrl,
  });

  Future<void> _open() async {
    final url = downloadUrl;
    if (url == null || url.isEmpty) return;
    final uri = Uri.tryParse(url);
    if (uri == null) return;
    try {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    } catch (_) {/* best-effort */}
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return PopScope(
      canPop: false,
      child: Scaffold(
        body: SafeArea(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const Spacer(),
                Container(
                  width: 96,
                  height: 96,
                  alignment: Alignment.center,
                  decoration: BoxDecoration(color: Colors.green.shade50, shape: BoxShape.circle),
                  child: Icon(Icons.system_update_alt_rounded, size: 48, color: Colors.green.shade700),
                ),
                const SizedBox(height: 24),
                Text('Update required',
                    style: theme.textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w800),
                    textAlign: TextAlign.center),
                const SizedBox(height: 12),
                Text(
                  'A new version of TotalStore Rider is required to continue accepting deliveries.',
                  textAlign: TextAlign.center,
                  style: theme.textTheme.bodyMedium?.copyWith(color: Colors.black54),
                ),
                if (installedVersion != null || latestVersion != null) ...[
                  const SizedBox(height: 24),
                  Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(color: Colors.grey.shade100, borderRadius: BorderRadius.circular(12)),
                    child: Column(
                      children: [
                        if (installedVersion != null) _row('Your version', installedVersion!),
                        if (installedVersion != null && latestVersion != null) const SizedBox(height: 4),
                        if (latestVersion != null) _row('Latest version', latestVersion!),
                      ],
                    ),
                  ),
                ],
                const Spacer(),
                FilledButton.icon(
                  onPressed: (downloadUrl == null || downloadUrl!.isEmpty) ? null : _open,
                  icon: const Icon(Icons.download_rounded),
                  label: const Text('Update now'),
                  style: FilledButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _row(String label, String value) => Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(color: Colors.black54, fontSize: 13)),
          Text(value, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
        ],
      );
}
