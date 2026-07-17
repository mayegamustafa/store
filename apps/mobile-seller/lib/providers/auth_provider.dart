import 'package:flutter/material.dart';
import 'package:dio/dio.dart';
import '../core/api_service.dart';
import '../core/services/notification_service.dart';
import '../core/services/biometric_service.dart';

class AuthProvider extends ChangeNotifier {
  final _api = ApiService();
  Map<String, dynamic>? _user;
  bool _initialized = false;
  bool _biometricEnabled = false;

  bool get biometricEnabled => _biometricEnabled;

  Map<String, dynamic>? get user => _user;
  bool get isAuthenticated => _user != null;
  bool get initialized => _initialized;
  String get storeName =>
      _user?['sellerProfile']?['storeName'] as String? ??
      _user?['firstName'] as String? ??
      'My Store';

  Future<void> init() async {
    if (_initialized) return;
    try {
      _biometricEnabled = await BiometricService.isEnabled() &&
          await BiometricService.isEnrolled();
    } catch (_) {}
    try {
      if (_api.isAuthenticated) {
        final res =
            await _api.dio.get('/auth/me').timeout(const Duration(seconds: 8));
        final data = _api.extractData(res);
        if (data != null &&
            (data['role'] == 'SELLER' || data['role'] == 'ADMIN')) {
          _user = data is Map<String, dynamic> ? data : null;
        } else {
          await _api.clearTokens();
        }
      }
    } catch (_) {
      await _api.clearTokens();
    }
    _initialized = true;
    notifyListeners();
  }

  Future<String?> login(
      {required String emailOrPhone, required String password}) async {
    try {
      final res = await _api.dio.post('/auth/login', data: {
        'email': emailOrPhone.contains('@') ? emailOrPhone : null,
        'phone': !emailOrPhone.contains('@') ? emailOrPhone : null,
        'password': password,
      });
      final data = _api.extractData(res);
      if (data['user']?['role'] != 'SELLER' &&
          data['user']?['role'] != 'ADMIN') {
        return 'This account is not a seller account';
      }
      await _api.setTokens(
          data['accessToken'] as String, data['refreshToken'] as String);
      _user = data['user'] as Map<String, dynamic>;
      NotificationService().registerTokenAfterLogin();
      _enableBiometricsIfAvailable();
      notifyListeners();
      return null;
    } on DioException catch (e) {
      final msg = e.response?.data;
      if (msg is Map) return msg['message'] as String? ?? 'Login failed';
      return 'Login failed';
    } catch (_) {
      return 'Network error. Try again.';
    }
  }

  /// Register a new seller account, then onboard the store.
  /// Returns null on success, or an error message.
  Future<String?> register({
    required String firstName,
    required String lastName,
    required String phone,
    String? email,
    required String password,
    required String storeName,
    String? storeDescription,
    String? storeCategory,
  }) async {
    try {
      final res = await _api.dio.post('/auth/register', data: {
        'firstName': firstName,
        'lastName': lastName,
        'phone': phone,
        if (email != null && email.isNotEmpty) 'email': email,
        'password': password,
        'role': 'SELLER',
      });
      final data = _api.extractData(res);
      await _api.setTokens(
          data['accessToken'] as String, data['refreshToken'] as String);
      _user = data['user'] as Map<String, dynamic>;

      // Create the store profile (best-effort — the dashboard prompts for
      // anything missing during onboarding)
      try {
        await _api.dio.post('/sellers/onboard', data: {
          'storeName': storeName,
          if (storeDescription != null && storeDescription.isNotEmpty)
            'storeDescription': storeDescription,
          if (storeCategory != null) 'storeCategory': storeCategory,
        });
      } catch (_) {}

      NotificationService().registerTokenAfterLogin();
      notifyListeners();
      return null;
    } on DioException catch (e) {
      final msg = e.response?.data;
      if (msg is Map) {
        final m = msg['message'];
        if (m is List) return m.join(', ');
        if (m is String) return m;
      }
      return 'Registration failed';
    } catch (_) {
      return 'Network error. Try again.';
    }
  }

  /// Google sign-in: exchange the Google ID token at the backend, then gate
  /// on seller/admin role (buyers must register a store first).
  Future<String?> googleLogin(String idToken) async {
    try {
      final res = await _api.dio.post('/auth/google-signin', data: {
        'credential': idToken,
        'role': 'SELLER',
      });
      final data = _api.extractData(res);
      final role = data['user']?['role'];
      if (role != 'SELLER' && role != 'ADMIN') {
        return 'This Google account has no seller store yet — use Register to create one';
      }
      await _api.setTokens(
          data['accessToken'] as String, data['refreshToken'] as String);
      _user = data['user'] as Map<String, dynamic>;
      NotificationService().registerTokenAfterLogin();
      _enableBiometricsIfAvailable();
      notifyListeners();
      return null;
    } catch (e) {
      final msg = _api.errorMessage(e);
      return msg.isNotEmpty ? msg : 'Google sign-in failed';
    }
  }

  /// Re-fetch the current user (after profile edits).
  Future<void> refreshProfile() async {
    try {
      final res = await _api.dio.get('/auth/me');
      final data = _api.extractData(res);
      if (data is Map<String, dynamic>) {
        _user = data;
        notifyListeners();
      }
    } catch (_) {}
  }

  void _enableBiometricsIfAvailable() {
    BiometricService.isAvailable().then((ok) async {
      if (ok) {
        await BiometricService.setEnabled(true);
        _biometricEnabled = true;
        notifyListeners();
      }
    }).catchError((_) {});
  }

  /// Fingerprint / face sign-in: verify identity, then restore the session
  /// from the stored tokens (the api client refreshes them as needed).
  Future<String?> biometricLogin() async {
    final ok = await BiometricService.authenticate(
        reason: 'Verify your identity to open your store');
    if (!ok) return 'Biometric check failed';
    try {
      final res = await _api.dio.get('/auth/me');
      final data = _api.extractData(res);
      if (data is Map<String, dynamic> &&
          (data['role'] == 'SELLER' || data['role'] == 'ADMIN')) {
        _user = data;
        NotificationService().registerTokenAfterLogin();
        notifyListeners();
        return null;
      }
      return 'Session expired — sign in with your password';
    } catch (_) {
      return 'Session expired — sign in with your password';
    }
  }

  Future<void> logout() async {
    _user = null;
    await _api.clearTokens();
    _biometricEnabled = false;
    notifyListeners();
  }
}
