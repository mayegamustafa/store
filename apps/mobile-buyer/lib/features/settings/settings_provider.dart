import 'package:flutter/material.dart';
import '../../core/api/api_service.dart';
import '../../core/models/models.dart';
import '../../core/theme.dart';

class SettingsProvider extends ChangeNotifier {
  final ApiService _api = ApiService();

  Map<String, dynamic> _settings = {};
  List<Address> _addresses = [];
  bool _isLoading = false;

  Map<String, dynamic> get settings => _settings;
  List<Address> get addresses => _addresses;
  bool get isLoading => _isLoading;

  String get siteName => _settings['SITE_NAME'] ?? 'TotalStore';
  String get currency => _overrideCurrency ?? (_settings['CURRENCY'] ?? 'UGX');
  String get buyerLogoUrl => (_settings['BUYER_APP_LOGO_URL'] as String? ?? '').trim();
  String get buyerTagline => (_settings['BUYER_APP_TAGLINE'] as String? ?? '').trim();
  bool get hasBuyerLogo => buyerLogoUrl.isNotEmpty;
  String? _overrideCurrency;
  double get defaultDeliveryFee =>
      double.tryParse(_settings['DELIVERY_FEE_DEFAULT']?.toString() ?? '') ?? 5000;
  double get freeDeliveryThreshold =>
      double.tryParse(_settings['FREE_DELIVERY_THRESHOLD']?.toString() ?? '') ?? 150000;

  void setCurrency(String currency) {
    _overrideCurrency = currency;
    notifyListeners();
  }

  Future<void> fetchPublicSettings() async {
    try {
      final response = await _api.dio.get('/settings/public');
      final data = _api.extractData(response);
      if (data is Map<String, dynamic>) {
        _settings = data;
      } else if (data is List) {
        for (var item in data) {
          if (item is Map && item['key'] != null) {
            _settings[item['key']] = item['value'];
          }
        }
      }

      // Apply theme colors from settings
      final primaryColor = _settings['PRIMARY_COLOR'] ?? _settings['THEME_PRIMARY_COLOR'];
      final accentColor = _settings['ACCENT_COLOR'] ?? _settings['THEME_ACCENT_COLOR'];
      if (primaryColor != null) {
        AppTheme.updateColors(
          primary: AppTheme.parseColor(primaryColor.toString()),
          accent: accentColor != null ? AppTheme.parseColor(accentColor.toString()) : null,
        );
      }
    } catch (_) {}
    notifyListeners();
  }

  Future<void> fetchAddresses() async {
    _isLoading = true;
    notifyListeners();

    try {
      final response = await _api.dio.get('/users/me/addresses');
      final data = _api.extractData(response);
      final list = data is List ? data : (data['data'] ?? []);
      _addresses = (list as List).map((a) => Address.fromJson(a)).toList();
    } catch (_) {}

    _isLoading = false;
    notifyListeners();
  }

  Future<bool> addAddress(Address address) async {
    try {
      await _api.dio.post('/users/me/addresses', data: address.toJson());
      await fetchAddresses();
      return true;
    } catch (_) {
      return false;
    }
  }

  Future<bool> setDefaultAddress(String addressId) async {
    try {
      await _api.dio.patch('/users/me/addresses/$addressId/default');
      await fetchAddresses();
      return true;
    } catch (_) {
      return false;
    }
  }

  Future<bool> deleteAddress(String addressId) async {
    try {
      await _api.dio.delete('/users/me/addresses/$addressId');
      await fetchAddresses();
      return true;
    } catch (_) {
      return false;
    }
  }

  Address? get defaultAddress {
    try {
      return _addresses.firstWhere((a) => a.isDefault);
    } catch (_) {
      return _addresses.isNotEmpty ? _addresses.first : null;
    }
  }
}
