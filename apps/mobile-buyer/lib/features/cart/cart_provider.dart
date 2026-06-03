import 'package:flutter/material.dart';
import 'package:dio/dio.dart';
import '../../core/api/api_service.dart';
import '../../core/models/models.dart';

class CartProvider extends ChangeNotifier {
  final ApiService _api = ApiService();

  Cart? _cart;
  bool _isLoading = false;

  Cart? get cart => _cart;
  bool get isLoading => _isLoading;
  int get itemCount => _cart?.itemCount ?? 0;
  double get subtotal => _cart?.subtotal ?? 0;
  List<CartItem> get items => _cart?.items ?? [];

  Future<void> fetchCart() async {
    _isLoading = true;
    notifyListeners();

    try {
      final response = await _api.dio.get('/cart');
      final data = _api.extractData(response);
      _cart = Cart.fromJson(data);
    } catch (_) {
      _cart = null;
    }

    _isLoading = false;
    notifyListeners();
  }

  Future<bool> addToCart(String productId, {int quantity = 1, String? variantId}) async {
    try {
      await _api.dio.post('/cart/items', data: {
        'productId': productId,
        'quantity': quantity,
        if (variantId != null) 'variantId': variantId,
      });
      await fetchCart();
      return true;
    } catch (e) {
      if (e is DioException && e.response?.statusCode == 401) {
        return false;
      }
      return false;
    }
  }

  Future<void> updateQuantity(String itemId, int quantity) async {
    try {
      await _api.dio.patch('/cart/items/$itemId', data: {
        'quantity': quantity,
      });
      await fetchCart();
    } catch (_) {}
  }

  Future<void> removeItem(String itemId) async {
    try {
      await _api.dio.delete('/cart/items/$itemId');
      await fetchCart();
    } catch (_) {}
  }

  Future<void> clearCart() async {
    try {
      await _api.dio.delete('/cart/clear');
      _cart = null;
      notifyListeners();
    } catch (_) {}
  }

  void reset() {
    _cart = null;
    notifyListeners();
  }
}
