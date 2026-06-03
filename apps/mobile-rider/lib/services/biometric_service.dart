import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:local_auth/local_auth.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Wraps [LocalAuthentication] to provide fingerprint / face-ID login
/// and persists the user's preference in secure storage.
/// All methods return safe defaults on platforms where local_auth has no
/// implementation (Linux desktop, web).
class BiometricService {
  static final _auth = LocalAuthentication();
  static const _storage = FlutterSecureStorage();
  static const _enabledKey = 'biometric_enabled';

  // Biometrics are only available on Android and iOS.
  static bool get _supported =>
      defaultTargetPlatform == TargetPlatform.android ||
      defaultTargetPlatform == TargetPlatform.iOS;

  static Future<bool> isAvailable() async {
    if (!_supported) return false;
    try {
      final canCheck = await _auth.canCheckBiometrics;
      final isSupported = await _auth.isDeviceSupported();
      return canCheck && isSupported;
    } on PlatformException {
      return false;
    } catch (_) {
      return false;
    }
  }

  static Future<bool> isEnrolled() async {
    if (!_supported) return false;
    if (!await isAvailable()) return false;
    try {
      final biometrics = await _auth.getAvailableBiometrics();
      return biometrics.isNotEmpty;
    } on PlatformException {
      return false;
    } catch (_) {
      return false;
    }
  }

  static Future<List<BiometricType>> enrolledTypes() async {
    if (!_supported) return [];
    try {
      return await _auth.getAvailableBiometrics();
    } catch (_) {
      return [];
    }
  }

  static Future<bool> authenticate({
    String reason = 'Authenticate to sign in to TotalStore Rider',
  }) async {
    if (!_supported) return false;
    try {
      return await _auth.authenticate(
        localizedReason: reason,
        options: const AuthenticationOptions(
          biometricOnly: false,
          stickyAuth: true,
          sensitiveTransaction: false,
        ),
      );
    } on PlatformException catch (e) {
      debugBiometricError(e.code, e.message);
      return false;
    } catch (_) {
      return false;
    }
  }

  static Future<void> setEnabled(bool enabled) async {
    try {
      await _storage.write(key: _enabledKey, value: enabled.toString());
    } catch (_) {}
  }

  static Future<bool> isEnabled() async {
    if (!_supported) return false;
    try {
      final val = await _storage.read(key: _enabledKey);
      return val == 'true';
    } catch (_) {
      return false;
    }
  }

  // ignore: avoid_print
  static void debugBiometricError(String code, String? message) =>
      print('[BiometricService] $code – $message');
}
