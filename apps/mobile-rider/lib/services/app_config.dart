import 'dart:async';
import 'dart:convert';
import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Dynamic configuration service that fetches API URLs and app config
/// from the backend. Caches locally and refreshes periodically.
class AppConfig {
  static final AppConfig instance = AppConfig._();
  AppConfig._();

  static const String _defaultApiUrl = 'https://totalstoreug.com/api/v1';
  static const String _defaultUploadUrl = 'https://totalstoreug.com';
  static const String _cacheKey = 'app_config_cache';
  static const String _configEndpoint = '/config/public';
  static const Duration _refreshInterval = Duration(minutes: 5);

  String _apiBaseUrl = _defaultApiUrl;
  String? _apiBackupUrl;
  String _uploadBaseUrl = _defaultUploadUrl;
  bool _maintenanceMode = false;
  Map<String, dynamic> _appVersions = {};
  Timer? _refreshTimer;
  bool _initialized = false;

  String get apiBaseUrl => _apiBaseUrl;
  String? get apiBackupUrl => _apiBackupUrl;
  String get uploadBaseUrl => _uploadBaseUrl;
  bool get maintenanceMode => _maintenanceMode;
  Map<String, dynamic> get appVersions => _appVersions;
  bool get isInitialized => _initialized;

  Future<void> init() async {
    if (_initialized) return;
    await _loadFromCache();
    _initialized = true;
    _fetchRemoteConfig();
    _startPeriodicRefresh();
  }

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

  Future<void> _saveToCache(Map<String, dynamic> config) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_cacheKey, jsonEncode(config));
    } catch (e) {
      debugPrint('AppConfig: cache save failed: $e');
    }
  }

  Future<void> _fetchRemoteConfig() async {
    final dio = Dio()
      ..options.connectTimeout = const Duration(seconds: 5)
      ..options.receiveTimeout = const Duration(seconds: 5);

    Map<String, dynamic>? config = await _tryFetch(dio, '$_apiBaseUrl$_configEndpoint');

    if (config == null && _apiBackupUrl != null && _apiBackupUrl!.isNotEmpty) {
      config = await _tryFetch(dio, '$_apiBackupUrl$_configEndpoint');
    }

    if (config == null && _apiBaseUrl != _defaultApiUrl) {
      config = await _tryFetch(dio, '$_defaultApiUrl$_configEndpoint');
    }

    if (config != null) {
      _applyConfig(config);
      await _saveToCache(config);
    }
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

  void _startPeriodicRefresh() {
    _refreshTimer?.cancel();
    _refreshTimer = Timer.periodic(_refreshInterval, (_) {
      _fetchRemoteConfig();
    });
  }

  Future<void> refresh() async {
    await _fetchRemoteConfig();
  }

  void dispose() {
    _refreshTimer?.cancel();
    _refreshTimer = null;
  }
}
