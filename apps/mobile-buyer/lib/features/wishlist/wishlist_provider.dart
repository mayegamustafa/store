import 'package:flutter/material.dart';
import '../../core/api/api_service.dart';
import '../../core/models/models.dart';

class WishlistProvider extends ChangeNotifier {
  final ApiService _api = ApiService();

  List<Product> _items = [];
  Set<String> _productIds = {};
  bool _isLoading = false;

  List<Product> get items => _items;
  bool get isLoading => _isLoading;
  int get count => _items.length;

  bool isWishlisted(String productId) => _productIds.contains(productId);

  Future<void> fetch() async {
    _isLoading = true;
    notifyListeners();

    try {
      final response = await _api.dio.get('/users/me/wishlist');
      final data = _api.extractData(response);
      final list = data is List ? data : (data['data'] ?? []);
      _items = (list as List).map((w) {
        // API may return { product: {...} } or the product directly
        final p = w is Map && w.containsKey('product') ? w['product'] : w;
        return Product.fromJson(p);
      }).toList();
      _productIds = _items.map((p) => p.id).toSet();
    } catch (_) {}

    _isLoading = false;
    notifyListeners();
  }

  Future<void> toggle(String productId) async {
    try {
      if (_productIds.contains(productId)) {
        await _api.dio.delete('/users/me/wishlist/$productId');
        _items.removeWhere((p) => p.id == productId);
        _productIds.remove(productId);
      } else {
        await _api.dio.post('/users/me/wishlist', data: {'productId': productId});
        _productIds.add(productId);
        // Refresh full list to get product details
        await fetch();
        return;
      }
    } catch (_) {}
    notifyListeners();
  }
}
