import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../constants.dart';
import '../services/biometric_service.dart';

class ApiService {
  static final ApiService _instance = ApiService._internal();
  factory ApiService() => _instance;
  ApiService._internal();

  final Dio dio = Dio(BaseOptions(
    baseUrl: AppConstants.baseUrl,
    connectTimeout: AppConstants.apiTimeout,
    receiveTimeout: AppConstants.apiTimeout,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
  ));

  final FlutterSecureStorage _storage = const FlutterSecureStorage();
  String? _accessToken;
  String? _refreshToken;
  bool _isRefreshing = false;

  Future<void> init() async {
    _accessToken = await _storage.read(key: 'access_token');
    _refreshToken = await _storage.read(key: 'refresh_token');

    dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) {
        if (_accessToken != null) {
          options.headers['Authorization'] = 'Bearer $_accessToken';
        }
        return handler.next(options);
      },
      onError: (error, handler) async {
        if (error.response?.statusCode == 401 && _refreshToken != null && !_isRefreshing) {
          _isRefreshing = true;
          try {
            final refreshDio = Dio(BaseOptions(baseUrl: AppConstants.baseUrl));
            final response = await refreshDio.post(
              '/auth/refresh',
              data: {'refreshToken': _refreshToken},
            );

            final data = response.data is Map && response.data.containsKey('data')
                ? response.data['data']
                : response.data;

            _accessToken = data['accessToken'];
            _refreshToken = data['refreshToken'];
            await _storage.write(key: 'access_token', value: _accessToken!);
            await _storage.write(key: 'refresh_token', value: _refreshToken!);

            // Keep biometric refresh token in sync after rotation
            await BiometricService().syncRefreshToken(_refreshToken!);

            _isRefreshing = false;

            // Retry original request
            final options = error.requestOptions;
            options.headers['Authorization'] = 'Bearer $_accessToken';
            final retryResponse = await dio.fetch(options);
            return handler.resolve(retryResponse);
          } catch (_) {
            _isRefreshing = false;
            await clearTokens();
            return handler.reject(error);
          }
        }
        return handler.next(error);
      },
    ));
  }

  Future<void> setTokens(String accessToken, String refreshToken) async {
    _accessToken = accessToken;
    _refreshToken = refreshToken;
    await _storage.write(key: 'access_token', value: accessToken);
    await _storage.write(key: 'refresh_token', value: refreshToken);
  }

  Future<void> clearTokens() async {
    _accessToken = null;
    _refreshToken = null;
    await _storage.delete(key: 'access_token');
    await _storage.delete(key: 'refresh_token');
  }

  bool get isAuthenticated => _accessToken != null;
  String? get accessToken => _accessToken;

  /// Extract data from API response (handles { data: ... } wrapper)
  dynamic extractData(Response response) {
    final body = response.data;
    if (body is Map && body.containsKey('data')) {
      return body['data'];
    }
    return body;
  }
}
