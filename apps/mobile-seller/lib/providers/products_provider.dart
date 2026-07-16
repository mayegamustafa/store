import 'package:flutter/material.dart';
import '../core/api_service.dart';

class ProductsProvider extends ChangeNotifier {
  final _api = ApiService();

  List<dynamic> _products = [];
  bool _loading = false;
  int _page = 1;
  int _totalPages = 1;

  List<dynamic> get products => _products;
  bool get loading => _loading;
  bool get hasMore => _page < _totalPages;

  Future<void> load({bool refresh = false}) async {
    if (refresh) _page = 1;
    _loading = true;
    notifyListeners();
    try {
      final res =
          await _api.dio.get('/products/mine', queryParameters: {'page': _page, 'limit': 20});
      final data = _api.extractData(res);
      final list = data is List ? data : (data['data'] as List?) ?? [];
      if (refresh || _page == 1) {
        _products = list;
      } else {
        _products = [..._products, ...list];
      }
      if (data is Map) {
        _totalPages = (data['pages'] as int?) ?? 1;
      }
    } catch (_) {}
    _loading = false;
    notifyListeners();
  }

  Future<void> loadMore() async {
    if (!hasMore || _loading) return;
    _page++;
    await load();
  }

  /// Returns null on success, or a human-readable error message (e.g. the
  /// plan-limit upgrade prompt) so the form can show WHY it failed.
  Future<String?> createProduct(Map<String, dynamic> data) async {
    try {
      await _api.dio.post('/products', data: data);
      await load(refresh: true);
      return null;
    } catch (e) {
      final msg = _api.errorMessage(e);
      return msg.isNotEmpty ? msg : 'Failed to create product';
    }
  }

  Future<String?> updateProduct(String id, Map<String, dynamic> data) async {
    try {
      await _api.dio.patch('/products/$id', data: data);
      await load(refresh: true);
      return null;
    } catch (e) {
      final msg = _api.errorMessage(e);
      return msg.isNotEmpty ? msg : 'Failed to update product';
    }
  }
}
