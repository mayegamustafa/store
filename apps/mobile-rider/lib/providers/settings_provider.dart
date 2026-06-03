import 'package:flutter/material.dart';
import '../core/api/api_service.dart';

class SettingsProvider extends ChangeNotifier {
  final _api = ApiService();

  String _riderLogoUrl = '';
  String _tagline = 'Delivering happiness across Uganda';

  String get riderLogoUrl => _riderLogoUrl;
  String get tagline => _tagline;
  bool get hasRemoteLogo => _riderLogoUrl.isNotEmpty;

  Future<void> load() async {
    try {
      final s = await _api.getPublicSettings()
          .timeout(const Duration(seconds: 5));
      _riderLogoUrl = (s['RIDER_APP_LOGO_URL'] as String? ?? '').trim();
      _tagline = (s['RIDER_APP_TAGLINE'] as String? ?? _tagline).trim();
      if (_tagline.isEmpty) _tagline = 'Delivering happiness across Uganda';
      notifyListeners();
    } catch (_) {}
  }
}
