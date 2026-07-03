import 'package:flutter/material.dart';
import 'package:dio/dio.dart';
import '../core/api_service.dart';
import '../core/services/notification_service.dart';

class AuthProvider extends ChangeNotifier {
  final _api = ApiService();
  Map<String, dynamic>? _user;
  bool _initialized = false;

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

  Future<void> logout() async {
    _user = null;
    await _api.clearTokens();
    notifyListeners();
  }
}
