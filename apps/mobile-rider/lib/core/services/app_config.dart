import 'dart:async';
import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'dart:convert';

/// Fetches and caches remote config (including Google Maps API key) on startup.
class AppConfig {
  static final AppConfig instance = AppConfig._();
  AppConfig._();

  static const _defaultApiUrl = 'https://shop.saktech.org/api/v1';
  static const _cacheKey = 'rider_app_config_cache';

  String _apiBaseUrl = _defaultApiUrl;
  String _googleMapsApiKey = '';
  double _defaultLat = 0.3476;
  double _defaultLng = 32.5825;
  bool _initialized = false;

  String get apiBaseUrl => _apiBaseUrl;
  String get googleMapsApiKey => _googleMapsApiKey;
  double get defaultLat => _defaultLat;
  double get defaultLng => _defaultLng;
  bool get isInitialized => _initialized;

  Future<void> init() async {
    if (_initialized) return;
    await _loadFromCache();
    _initialized = true;
    _fetchRemoteConfig(); // background
  }

  Future<void> _loadFromCache() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final raw = prefs.getString(_cacheKey);
      if (raw != null) _apply(jsonDecode(raw) as Map<String, dynamic>);
    } catch (_) {}
  }

  Future<void> _fetchRemoteConfig() async {
    final dio = Dio()
      ..options.connectTimeout = const Duration(seconds: 5)
      ..options.receiveTimeout = const Duration(seconds: 5);
    try {
      final r = await dio.get('$_apiBaseUrl/config/maps');
      if (r.statusCode == 200 && r.data is Map) {
        final data = r.data as Map<String, dynamic>;
        _apply(data);
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString(_cacheKey, jsonEncode(data));
      }
    } catch (e) {
      debugPrint('AppConfig rider: fetch failed: $e');
    }
  }

  void _apply(Map<String, dynamic> data) {
    _googleMapsApiKey = (data['googleMapsApiKey'] as String?) ?? _googleMapsApiKey;
    final center = data['defaultCenter'] as Map<String, dynamic>?;
    if (center != null) {
      _defaultLat = (center['lat'] as num?)?.toDouble() ?? _defaultLat;
      _defaultLng = (center['lng'] as num?)?.toDouble() ?? _defaultLng;
    }
  }

  Future<void> refresh() => _fetchRemoteConfig();
}
