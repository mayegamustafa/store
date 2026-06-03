import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
import '../core/api_service.dart';

class SettingsProvider extends ChangeNotifier {
  final _api = ApiService();
  String _currency = 'UGX';
  String _sellerLogoUrl = '';
  String _sellerTagline = 'Seller Dashboard';

  String get currency => _currency;
  String get sellerLogoUrl => _sellerLogoUrl;
  String get sellerTagline => _sellerTagline;
  bool get hasRemoteLogo => _sellerLogoUrl.isNotEmpty;

  Future<void> load() async {
    try {
      final res = await _api.dio.get('/settings/public');
      final data = _api.extractData(res);
      if (data is Map) {
        _currency = (data['DEFAULT_CURRENCY'] ?? data['CURRENCY'] ?? 'UGX').toString();
        _sellerLogoUrl = (data['SELLER_APP_LOGO_URL'] as String? ?? '').trim();
        _sellerTagline = (data['SELLER_APP_TAGLINE'] as String? ?? _sellerTagline).trim();
        if (_sellerTagline.isEmpty) _sellerTagline = 'Seller Dashboard';
        notifyListeners();
      }
    } catch (e) {
      debugPrint('SettingsProvider.load error: $e');
    }
  }

  String formatPrice(dynamic amount) {
    final value = double.tryParse(amount?.toString() ?? '0') ?? 0;
    return '$_currency ${value.toStringAsFixed(0)}';
  }
}
