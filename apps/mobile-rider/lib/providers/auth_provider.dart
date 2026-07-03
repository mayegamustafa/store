import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../core/api/api_service.dart';
import '../services/biometric_service.dart';
import '../services/google_auth_service.dart';
import '../services/notification_service.dart';

class AuthProvider extends ChangeNotifier {
  final _api = ApiService();
  final _storage = const FlutterSecureStorage();

  Map<String, dynamic>? _user;
  bool _initialized = false;
  bool _biometricEnabled = false;

  Map<String, dynamic>? get user => _user;
  bool get isAuthenticated => _user != null;
  bool get initialized => _initialized;
  bool get isBiometricEnabled => _biometricEnabled;

  Future<void> init() async {
    if (_initialized) return;  // guard against double-call
    try {
      final token = await _storage.read(key: 'riderAccessToken')
          .timeout(const Duration(seconds: 4));
      if (token != null) {
        try {
          final profile = await _api.getProfile()
              .timeout(const Duration(seconds: 8));
          if (profile != null && profile['role'] == 'RIDER') {
            _user = profile;
          } else if (profile != null) {
            await _storage.deleteAll().catchError((_) {});
          }
        } catch (_) {
          await _storage.deleteAll().catchError((_) {});
        }
      }
    } catch (_) {
      // Storage unavailable — treat as unauthenticated
    }
    try {
      _biometricEnabled = await BiometricService.isEnabled()
          .timeout(const Duration(seconds: 3));
    } catch (_) {
      _biometricEnabled = false;
    }
    _initialized = true;
    notifyListeners();
  }

  Future<String?> login({required String phone, required String password}) async {
    final res = await _api.login(phone: phone, password: password);
    if (res == null) return 'Invalid credentials';
    if (res['user']?['role'] != 'RIDER') return 'This account is not a rider account';
    await _storage.write(key: 'riderAccessToken', value: res['accessToken']);
    await _storage.write(key: 'riderRefreshToken', value: res['refreshToken']);
    _user = res['user'];
    // Auto-enable biometric after first successful login
    try {
      final available = await BiometricService.isAvailable();
      if (available) {
        await BiometricService.setEnabled(true);
        _biometricEnabled = true;
      }
    } catch (_) {}
    NotificationService.registerTokenAfterLogin();
    notifyListeners();
    return null;
  }

  /// Authenticates via biometrics and restores the existing session.
  Future<bool> biometricLogin() async {
    final enrolled = await BiometricService.isEnrolled();
    if (!enrolled) return false;
    final ok = await BiometricService.authenticate(
        reason: 'Verify your identity to sign in to TotalStore Rider');
    if (!ok) return false;
    // Use refresh token to get fresh access token (old one may have expired)
    final refreshToken = await _storage.read(key: 'riderRefreshToken');
    if (refreshToken == null) return false;
    try {
      final refreshDio = Dio(BaseOptions(baseUrl: 'https://shop.saktech.org/api/v1'));
      final res = await refreshDio.post('/auth/refresh', data: {'refreshToken': refreshToken});
      final data = res.data;
      await _storage.write(key: 'riderAccessToken', value: data['accessToken']);
      await _storage.write(key: 'riderRefreshToken', value: data['refreshToken']);
      final profile = await _api.getProfile();
      if (profile == null || profile['role'] != 'RIDER') return false;
      _user = profile;
      NotificationService.registerTokenAfterLogin();
      notifyListeners();
      return true;
    } catch (_) {
      return false;
    }
  }

  Future<void> enableBiometrics() async {
    await BiometricService.setEnabled(true);
    _biometricEnabled = true;
    notifyListeners();
  }

  Future<void> disableBiometrics() async {
    await BiometricService.setEnabled(false);
    _biometricEnabled = false;
    notifyListeners();
  }

  Future<String?> googleLogin(String idToken) async {
    final res = await _api.googleSignIn(idToken);
    if (res == null) return 'Google sign-in failed';
    if (res['user']?['role'] != 'RIDER') return 'This Google account is not linked to a rider account';
    await _storage.write(key: 'riderAccessToken', value: res['accessToken'] as String?);
    await _storage.write(key: 'riderRefreshToken', value: res['refreshToken'] as String?);
    _user = res['user'] as Map<String, dynamic>?;
    // Auto-enable biometric after Google login
    try {
      final available = await BiometricService.isAvailable();
      if (available) {
        await BiometricService.setEnabled(true);
        _biometricEnabled = true;
      }
    } catch (_) {}
    NotificationService.registerTokenAfterLogin();
    notifyListeners();
    return null;
  }

  Future<void> registerFcmToken(String token) async {
    try { await _api.updateFcmToken(token); } catch (_) {}
  }

  /// Registers a new rider account.
  Future<String?> register({
    required String firstName,
    required String lastName,
    required String phone,
    String? email,
    required String password,
    String vehicleType = 'MOTORCYCLE',
  }) async {
    try {
      final res = await _api.dio.post('/auth/register', data: {
        'firstName': firstName,
        'lastName': lastName,
        'phone': phone,
        if (email != null && email.isNotEmpty) 'email': email,
        'password': password,
        'role': 'RIDER',
        'vehicleType': vehicleType,
      });
      final data = res.data as Map<String, dynamic>;
      if (data['accessToken'] != null) {
        await _storage.write(key: 'riderAccessToken', value: data['accessToken'] as String);
        await _storage.write(key: 'riderRefreshToken', value: data['refreshToken'] as String?);
        _user = data['user'] as Map<String, dynamic>?;
        notifyListeners();
        return null;
      }
      return data['message'] as String? ?? 'Registration failed';
    } catch (e) {
      return 'Registration failed';
    }
  }

  /// Refreshes the current rider profile from the API.
  Future<void> refreshProfile() async {
    try {
      final profile = await _api.getProfile();
      if (profile != null) {
        _user = profile;
        notifyListeners();
      }
    } catch (_) {}
  }

  Future<void> logout() async {
    await GoogleAuthService.signOut();
    // Keep tokens and biometric_enabled so biometric re-login works
    _user = null;
    notifyListeners();
  }
}
