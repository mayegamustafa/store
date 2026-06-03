import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:package_info_plus/package_info_plus.dart';

/// Result of comparing this build's installed version against the backend's
/// dispatch config (`/config/public` -> `apps.{role}.{version,minVersion,...}`).
class VersionCheckResult {
  final bool needsForceUpdate;
  final bool needsSoftPrompt;
  final String? installedVersion;
  final String? latestVersion;
  final String? minVersion;
  final String? downloadUrl;

  const VersionCheckResult({
    this.needsForceUpdate = false,
    this.needsSoftPrompt = false,
    this.installedVersion,
    this.latestVersion,
    this.minVersion,
    this.downloadUrl,
  });

  static const none = VersionCheckResult();
}

/// Fetches `/config/public` (public, no auth) and compares against the installed
/// version. Never throws — on any failure returns [VersionCheckResult.none] so
/// splash continues normally.
Future<VersionCheckResult> checkAppVersion({
  required String baseUrl,
  required String role, // 'buyer' | 'seller' | 'rider'
}) async {
  try {
    final dio = Dio(BaseOptions(
      baseUrl: baseUrl,
      connectTimeout: const Duration(seconds: 4),
      receiveTimeout: const Duration(seconds: 4),
    ));
    final info = await PackageInfo.fromPlatform();
    final installed = info.version;

    final res = await dio.get('/config/public');
    if (res.statusCode != 200 || res.data is! Map) return VersionCheckResult.none;
    final apps = (res.data as Map)['apps'];
    if (apps is! Map) return VersionCheckResult.none;
    final cfg = apps[role];
    if (cfg is! Map) return VersionCheckResult.none;

    final latest = cfg['version'] as String?;
    final minVer = cfg['minVersion'] as String?;
    final force = cfg['forceUpdate'] == true;
    final downloadUrl = cfg['downloadUrl'] as String?;

    final belowMin = minVer != null && minVer.isNotEmpty && _semverLt(installed, minVer);
    final belowLatest =
        latest != null && latest.isNotEmpty && _semverLt(installed, latest);

    return VersionCheckResult(
      needsForceUpdate: belowMin && force,
      needsSoftPrompt: !belowMin && belowLatest,
      installedVersion: installed,
      latestVersion: latest,
      minVersion: minVer,
      downloadUrl: downloadUrl,
    );
  } catch (e) {
    debugPrint('checkAppVersion: $e');
    return VersionCheckResult.none;
  }
}

bool _semverLt(String a, String b) {
  final pa = _parts(a);
  final pb = _parts(b);
  final len = pa.length > pb.length ? pa.length : pb.length;
  for (var i = 0; i < len; i++) {
    final av = i < pa.length ? pa[i] : 0;
    final bv = i < pb.length ? pb[i] : 0;
    if (av < bv) return true;
    if (av > bv) return false;
  }
  return false;
}

List<int> _parts(String v) {
  final stripped = v.split('+').first.split('-').first;
  return stripped
      .split('.')
      .map((p) => int.tryParse(p) ?? 0)
      .toList(growable: false);
}
