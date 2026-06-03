import 'dart:async';
import 'dart:convert';
import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Dynamic configuration service that fetches API URLs and app config
/// from the backend. Caches locally and refreshes periodically.
///
/// Usage:
///   await AppConfig.instance.init();
///   final baseUrl = AppConfig.instance.apiBaseUrl;
class AppConfig {
  static final AppConfig instance = AppConfig._();
  AppConfig._();

  static const String _defaultApiUrl = 'https://store.saktech.org/api/v1';
  static const String _defaultUploadUrl = 'https://store.saktech.org';
  static const String _cacheKey = 'app_config_cache';
  static const String _configEndpoint = '/config/public';
  static const Duration _refreshInterval = Duration(minutes: 5);

  String _apiBaseUrl = _defaultApiUrl;
  String? _apiBackupUrl;
  String _uploadBaseUrl = _defaultUploadUrl;
  bool _maintenanceMode = false;
  Map<String, dynamic> _appVersions = {};
  String _googleMapsApiKey = '';
  double _defaultLat = 0.3476;
  double _defaultLng = 32.5825;
  Timer? _refreshTimer;
  bool _initialized = false;

  String get apiBaseUrl => _apiBaseUrl;
  String? get apiBackupUrl => _apiBackupUrl;
  String get uploadBaseUrl => _uploadBaseUrl;
  bool get maintenanceMode => _maintenanceMode;
  Map<String, dynamic> get appVersions => _appVersions;
  String get googleMapsApiKey => _googleMapsApiKey;
  double get defaultLat => _defaultLat;
  double get defaultLng => _defaultLng;
  bool get isInitialized => _initialized;

  /// Initialize config: load from cache first (fast), then fetch remote.
  Future<void> init() async {
    if (_initialized) return;
    await _loadFromCache();
    _initialized = true;
    // Fetch fresh config in background (don't block app start)
    _fetchRemoteConfig();
    _startPeriodicRefresh();
  }

  /// Load cached config from SharedPreferences for instant startup.
  Future<void> _loadFromCache() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final cached = prefs.getString(_cacheKey);
      if (cached != null) {
        _applyConfig(jsonDecode(cached) as Map<String, dynamic>);
      }
    } catch (e) {
      debugPrint('AppConfig: cache load failed: $e');
    }
  }

  /// Save config to SharedPreferences.
  Future<void> _saveToCache(Map<String, dynamic> config) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_cacheKey, jsonEncode(config));
    } catch (e) {
      debugPrint('AppConfig: cache save failed: $e');
    }
  }

  /// Fetch config from remote API, with failover to backup URL.
  Future<void> _fetchRemoteConfig() async {
    final dio = Dio()
      ..options.connectTimeout = const Duration(seconds: 5)
      ..options.receiveTimeout = const Duration(seconds: 5);

    // Try primary URL first
    Map<String, dynamic>? config = await _tryFetch(dio, '$_apiBaseUrl$_configEndpoint');

    // Failover to backup URL
    if (config == null && _apiBackupUrl != null && _apiBackupUrl!.isNotEmpty) {
      config = await _tryFetch(dio, '$_apiBackupUrl$_configEndpoint');
      if (config != null) {
        debugPrint('AppConfig: primary failed, using backup URL');
      }
    }

    // Failover to default URL (if current apiBaseUrl was changed)
    if (config == null && _apiBaseUrl != _defaultApiUrl) {
      config = await _tryFetch(dio, '$_defaultApiUrl$_configEndpoint');
    }

    if (config != null) {
      _applyConfig(config);
      await _saveToCache(config);
    }

    // Fetch maps config separately (contains API key)
    final mapsConfig = await _tryFetch(dio, '$_apiBaseUrl/config/maps');
    if (mapsConfig != null) _applyMapsConfig(mapsConfig);
  }

  Future<Map<String, dynamic>?> _tryFetch(Dio dio, String url) async {
    try {
      final response = await dio.get(url);
      if (response.statusCode == 200 && response.data is Map) {
        return response.data as Map<String, dynamic>;
      }
    } catch (e) {
      debugPrint('AppConfig: fetch failed from $url: $e');
    }
    return null;
  }

  void _applyConfig(Map<String, dynamic> config) {
    _apiBaseUrl = (config['apiBaseUrl'] as String?) ?? _defaultApiUrl;
    _apiBackupUrl = (config['apiBackupUrl'] ?? config['backup']) as String?;
    _uploadBaseUrl = (config['uploadBaseUrl'] as String?) ?? _defaultUploadUrl;
    _maintenanceMode = config['maintenanceMode'] == true;
    _appVersions = (config['apps'] as Map<String, dynamic>?) ?? {};
  }

  void _applyMapsConfig(Map<String, dynamic> config) {
    _googleMapsApiKey = (config['googleMapsApiKey'] as String?) ?? '';
    final center = config['defaultCenter'] as Map<String, dynamic>?;
    if (center != null) {
      _defaultLat = (center['lat'] as num?)?.toDouble() ?? _defaultLat;
      _defaultLng = (center['lng'] as num?)?.toDouble() ?? _defaultLng;
    }
  }

  void _startPeriodicRefresh() {
    _refreshTimer?.cancel();
    _refreshTimer = Timer.periodic(_refreshInterval, (_) {
      _fetchRemoteConfig();
    });
  }

  /// Force an immediate refresh (e.g. on app resume).
  Future<void> refresh() async {
    await _fetchRemoteConfig();
  }

  /// Clean up timer when no longer needed.
  void dispose() {
    _refreshTimer?.cancel();
    _refreshTimer = null;
  }
}
