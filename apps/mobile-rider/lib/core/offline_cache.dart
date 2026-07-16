import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';

/// Tiny JSON cache so the app still shows content with no connection.
/// Fetchers save their last good payload; on network failure they read it
/// back. Data may be stale — screens should treat it as read-only.
class OfflineCache {
  static Future<void> saveList(String key, List<dynamic> raw) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('cache_$key', jsonEncode(raw));
    } catch (_) {}
  }

  static Future<List<dynamic>?> readList(String key) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final raw = prefs.getString('cache_$key');
      if (raw == null) return null;
      final decoded = jsonDecode(raw);
      return decoded is List ? decoded : null;
    } catch (_) {
      return null;
    }
  }
}
