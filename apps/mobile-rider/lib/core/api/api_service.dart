import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

String get _resolvedBaseUrl {
  return 'https://store.saktech.org/api/v1';
}

class ApiService {
  static const _baseUrl = 'https://store.saktech.org/api/v1'; // fallback
  late final Dio _dio;
  final _storage = const FlutterSecureStorage();

  ApiService() {
    _dio = Dio(BaseOptions(baseUrl: _resolvedBaseUrl, connectTimeout: const Duration(seconds: 15), receiveTimeout: const Duration(seconds: 15)));
    _dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) async {
        final token = await _storage.read(key: 'riderAccessToken');
        if (token != null) options.headers['Authorization'] = 'Bearer $token';
        handler.next(options);
      },
      onError: (err, handler) async {
        if (err.response?.statusCode == 401) {
          final refreshed = await _refresh();
          if (refreshed) {
            final token = await _storage.read(key: 'riderAccessToken');
            err.requestOptions.headers['Authorization'] = 'Bearer $token';
            final res = await _dio.fetch(err.requestOptions);
            return handler.resolve(res);
          }
        }
        handler.next(err);
      },
    ));
  }

  Future<bool> _refresh() async {
    try {
      final rt = await _storage.read(key: 'riderRefreshToken');
      if (rt == null) return false;
      final res = await Dio().post('$_resolvedBaseUrl/auth/refresh', data: {'refreshToken': rt});
      await _storage.write(key: 'riderAccessToken', value: res.data['accessToken']);
      await _storage.write(key: 'riderRefreshToken', value: res.data['refreshToken']);
      return true;
    } catch (_) { return false; }
  }

  /// Exposes the underlying Dio client for direct requests (e.g. file upload).
  Dio get dio => _dio;

  Future<Map<String, dynamic>?> login({required String phone, required String password}) async {
    try {
      final res = await _dio.post('/auth/login', data: {'phone': phone, 'password': password});
      return res.data;
    } catch (_) { return null; }
  }

  Future<Map<String, dynamic>?> getProfile() async {
    try { final res = await _dio.get('/auth/me'); return res.data; } catch (_) { return null; }
  }

  // Rider delivery management
  Future<dynamic> getAssignedDeliveries() async {
    try { final res = await _dio.get('/riders/me/deliveries'); return res.data; } catch (_) { return <dynamic>[]; }
  }

  Future<Map<String, dynamic>?> getDelivery(String orderId) async {
    try { final res = await _dio.get('/orders/$orderId'); return res.data; } catch (_) { return null; }
  }

  Future<bool> updateOrderStatus(String orderId, String status) async {
    try { await _dio.patch('/orders/$orderId/status', data: {'status': status}); return true; } catch (_) { return false; }
  }

  Future<bool> toggleOnline(bool online) async {
    try { await _dio.patch('/riders/me/online', data: {'isOnline': online}); return true; } catch (_) { return false; }
  }

  Future<Map<String, dynamic>?> getEarnings() async {
    try { final res = await _dio.get('/riders/me/earnings'); return res.data; } catch (_) { return null; }
  }

  Future<Map<String, dynamic>?> getTransactions({int page = 1}) async {
    try { final res = await _dio.get('/riders/me/earnings', queryParameters: {'page': page}); return res.data; } catch (_) { return null; }
  }

  Future<({bool ok, String? error})> updateDeliveryStatus(String deliveryId, String status) async {
    try {
      await _dio.patch('/riders/deliveries/$deliveryId/status', data: {'status': status});
      return (ok: true, error: null);
    } on DioException catch (e) {
      final msg = e.response?.data?['message']?.toString()
          ?? e.response?.data?.toString()
          ?? e.message
          ?? 'Request failed';
      debugPrint('updateDeliveryStatus error: $msg');
      return (ok: false, error: msg);
    } catch (e) {
      return (ok: false, error: e.toString());
    }
  }

  Future<bool> updateLocation({required String deliveryId, required double lat, required double lng}) async {
    try {
      await _dio.post('/riders/location', data: {'deliveryId': deliveryId, 'latitude': lat, 'longitude': lng});
      return true;
    } catch (_) { return false; }
  }

  // Public settings (no auth) — used for remote logo/branding URLs
  Future<Map<String, dynamic>> getPublicSettings() async {
    final r = await Dio(BaseOptions(baseUrl: _resolvedBaseUrl))
        .get('/settings/public');
    return r.data as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>?> googleSignIn(String idToken) async {
    try {
      final r = await _dio.post('/auth/google-signin', data: {'idToken': idToken, 'role': 'RIDER'});
      return r.data as Map<String, dynamic>;
    } catch (_) { return null; }
  }

  Future<void> updateFcmToken(String token) async {
    try { await _dio.post('/auth/fcm-token', data: {'token': token}); } catch (_) {}
  }

  // Wallet endpoints
  Future<Map<String, dynamic>?> getWalletBalance() async {
    try { final res = await _dio.get('/wallet/rider/balance'); return res.data; } catch (_) { return null; }
  }

  Future<Map<String, dynamic>?> withdrawFromWallet({required double amount, required String phone}) async {
    try {
      final res = await _dio.post('/wallet/rider/withdraw', data: {'amount': amount, 'phone': phone});
      return res.data;
    } catch (e) {
      if (e is DioException && e.response != null) return {'error': e.response?.data?['message'] ?? 'Withdrawal failed'};
      return {'error': 'Network error'};
    }
  }

  Future<List<dynamic>> getWalletTransactions({int page = 1}) async {
    try {
      final res = await _dio.get('/wallet/rider/transactions', queryParameters: {'page': page});
      final data = res.data;
      if (data is List) return data;
      if (data is Map) return (data['data'] as List?) ?? [];
      return [];
    } catch (_) { return []; }
  }
}
