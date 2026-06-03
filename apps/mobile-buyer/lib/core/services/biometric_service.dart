import 'package:local_auth/local_auth.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class BiometricService {
  static final BiometricService _instance = BiometricService._internal();
  factory BiometricService() => _instance;
  BiometricService._internal();

  final LocalAuthentication _auth = LocalAuthentication();
  final FlutterSecureStorage _storage = const FlutterSecureStorage();

  static const _keyBiometricEnabled = 'biometric_enabled';
  static const _keyBiometricEmail = 'biometric_email';
  static const _keyBiometricToken = 'biometric_refresh_token';

  /// Check if device supports biometrics
  Future<bool> get isDeviceSupported async {
    try {
      final canCheck = await _auth.canCheckBiometrics;
      final isSupported = await _auth.isDeviceSupported();
      return canCheck && isSupported;
    } catch (_) {
      return false;
    }
  }

  /// Check if user has enrolled biometric login
  Future<bool> get isEnabled async {
    final val = await _storage.read(key: _keyBiometricEnabled);
    return val == 'true';
  }

  /// Save credentials after successful password login
  Future<void> enableBiometric({
    required String emailOrPhone,
    required String refreshToken,
  }) async {
    await _storage.write(key: _keyBiometricEnabled, value: 'true');
    await _storage.write(key: _keyBiometricEmail, value: emailOrPhone);
    await _storage.write(key: _keyBiometricToken, value: refreshToken);
  }

  /// Clear biometric data on logout
  Future<void> disableBiometric() async {
    await _storage.delete(key: _keyBiometricEnabled);
    await _storage.delete(key: _keyBiometricEmail);
    await _storage.delete(key: _keyBiometricToken);
  }

  /// Get saved credentials for biometric login
  Future<Map<String, String>?> getSavedCredentials() async {
    final email = await _storage.read(key: _keyBiometricEmail);
    final token = await _storage.read(key: _keyBiometricToken);
    if (email != null && token != null) {
      return {'emailOrPhone': email, 'refreshToken': token};
    }
    return null;
  }

  /// Keep stored biometric refresh token in sync after token rotation
  Future<void> syncRefreshToken(String newRefreshToken) async {
    final enabled = await _storage.read(key: _keyBiometricEnabled);
    if (enabled == 'true') {
      await _storage.write(key: _keyBiometricToken, value: newRefreshToken);
    }
  }

  /// Authenticate with biometrics (fingerprint / face)
  Future<bool> authenticate({String reason = 'Verify your identity to sign in'}) async {
    try {
      return await _auth.authenticate(
        localizedReason: reason,
        options: const AuthenticationOptions(
          stickyAuth: true,
          biometricOnly: false, // Allow PIN as fallback
        ),
      );
    } catch (_) {
      return false;
    }
  }
}
