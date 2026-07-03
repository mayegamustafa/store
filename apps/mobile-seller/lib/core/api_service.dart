import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'constants.dart';

/// Thrown when the backend rejects a seller mutation because the seller's
/// current plan limit (e.g., maxProducts) has been reached. Mirrors the
/// `402 PLAN_LIMIT` shape produced by ProductsService.create().
class PlanLimitException implements Exception {
  final int? limit;
  final int? used;
  final String? planName;
  final String upgradeUrl;
  final String? message;

  PlanLimitException({this.limit, this.used, this.planName, this.upgradeUrl = '/subscription', this.message});

  @override
  String toString() => message ?? 'Plan limit reached (${used ?? '-'} / ${limit ?? '-'} on ${planName ?? 'your plan'})';
}

class ApiService {
  static final ApiService _instance = ApiService._internal();
  factory ApiService() => _instance;
  ApiService._internal();

  final Dio dio = Dio(BaseOptions(
    baseUrl: AppConstants.baseUrl,
    connectTimeout: AppConstants.apiTimeout,
    receiveTimeout: AppConstants.apiTimeout,
    headers: {'Content-Type': 'application/json', 'Accept': 'application/json'},
  ));

  final _storage = const FlutterSecureStorage();
  String? _accessToken;
  String? _refreshToken;
  bool _isRefreshing = false;

  Future<void> init() async {
    _accessToken = await _storage.read(key: 'seller_access_token');
    _refreshToken = await _storage.read(key: 'seller_refresh_token');

    dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) {
        if (_accessToken != null) {
          options.headers['Authorization'] = 'Bearer $_accessToken';
        }
        handler.next(options);
      },
      onError: (err, handler) async {
        // M3b.5: detect the backend's structured 402 PLAN_LIMIT response and
        // rethrow as a typed exception so callers (product create screen) can
        // route to the subscription upgrade screen instead of showing a
        // generic toast.
        if (err.response?.statusCode == 402) {
          final body = err.response?.data;
          final code = (body is Map ? body['code'] : null) as String?;
          if (code == 'PLAN_LIMIT') {
            final ple = PlanLimitException(
              limit: body['limit'] is int ? body['limit'] as int : (body['limit'] is num ? (body['limit'] as num).toInt() : null),
              used: body['used'] is int ? body['used'] as int : (body['used'] is num ? (body['used'] as num).toInt() : null),
              planName: body['planName'] as String?,
              upgradeUrl: (body['upgradeUrl'] as String?) ?? '/subscription',
              message: body['message'] as String?,
            );
            return handler.reject(DioException(
              requestOptions: err.requestOptions,
              error: ple,
              response: err.response,
              type: DioExceptionType.badResponse,
            ));
          }
        }

        if (err.response?.statusCode == 401 &&
            _refreshToken != null &&
            !_isRefreshing) {
          _isRefreshing = true;
          try {
            final refreshDio =
                Dio(BaseOptions(baseUrl: AppConstants.baseUrl));
            final res = await refreshDio.post(
              '/auth/refresh',
              data: {'refreshToken': _refreshToken},
            );
            final data = _extractData(res);
            await setTokens(
                data['accessToken'] as String, data['refreshToken'] as String);
            _isRefreshing = false;

            err.requestOptions.headers['Authorization'] =
                'Bearer $_accessToken';
            final retry = await dio.fetch(err.requestOptions);
            return handler.resolve(retry);
          } catch (_) {
            _isRefreshing = false;
            await clearTokens();
          }
        }
        handler.next(err);
      },
    ));
  }

  dynamic _extractData(Response res) {
    final body = res.data;
    if (body is Map && body.containsKey('data')) return body['data'];
    return body;
  }

  dynamic extractData(Response res) => _extractData(res);

  /// Human-readable message from a caught Dio error (validation messages
  /// from the API come back as string or list under `message`).
  String errorMessage(Object error) {
    if (error is DioException) {
      final data = error.response?.data;
      if (data is Map) {
        final msg = data['message'];
        if (msg is List) return msg.join(', ');
        if (msg is String) return msg;
      }
      return 'Network error';
    }
    return '';
  }

  Future<void> setTokens(String access, String refresh) async {
    _accessToken = access;
    _refreshToken = refresh;
    await _storage.write(key: 'seller_access_token', value: access);
    await _storage.write(key: 'seller_refresh_token', value: refresh);
  }

  Future<void> clearTokens() async {
    _accessToken = null;
    _refreshToken = null;
    await _storage.delete(key: 'seller_access_token');
    await _storage.delete(key: 'seller_refresh_token');
  }

  bool get isAuthenticated => _accessToken != null;

  /// Convenience: pull a PlanLimitException out of a caught DioException if
  /// one was attached by the 402 interceptor; returns null otherwise.
  static PlanLimitException? planLimitFrom(Object error) {
    if (error is DioException && error.error is PlanLimitException) return error.error as PlanLimitException;
    if (error is PlanLimitException) return error;
    return null;
  }

  // ── Subscription helpers (M3b.1) ─────────────────────────────────────────
  Future<Map<String, dynamic>> getMySubscription() async {
    final res = await dio.get('/subscriptions/my');
    final data = _extractData(res);
    return Map<String, dynamic>.from(data as Map);
  }

  Future<List<dynamic>> getSubscriptionPlans() async {
    final res = await dio.get('/subscriptions/plans');
    final data = _extractData(res);
    return List<dynamic>.from(data as Iterable);
  }

  Future<List<dynamic>> getSubscriptionHistory() async {
    final res = await dio.get('/subscriptions/history');
    final data = _extractData(res);
    return List<dynamic>.from(data as Iterable);
  }

  /// Initiates a subscription. For free plans returns `{ subscription, requiresPayment: false }`.
  /// For paid plans returns `{ redirectUrl, subscriptionId, requiresPayment: true }` — caller
  /// opens `redirectUrl` in a WebView and listens for the callback redirect.
  Future<Map<String, dynamic>> subscribeToPlan(String planId, {String paymentMethod = 'PESAPAL'}) async {
    final res = await dio.post('/subscriptions/subscribe', data: {
      'planId': planId,
      'paymentMethod': paymentMethod,
    });
    final data = _extractData(res);
    return Map<String, dynamic>.from(data as Map);
  }
}
