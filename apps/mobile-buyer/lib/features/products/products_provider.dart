import 'package:flutter/material.dart' hide Banner;
import '../../core/api/api_service.dart';
import '../../core/models/models.dart';
import '../../core/constants.dart';

class ProductsProvider extends ChangeNotifier {
  final ApiService _api = ApiService();

  List<Product> _products = [];
  List<Product> _featured = [];
  List<Category> _categories = [];
  List<FlashSale> _flashSales = [];
  List<Banner> _banners = [];

  bool _isLoading = false;
  bool _isLoadingMore = false;
  bool _hasMore = true;
  int _page = 1;
  String? _currentSearch;
  String? _currentCategoryId;

  List<Product> get products => _products;
  List<Product> get featured => _featured;
  List<Category> get categories => _categories;
  List<FlashSale> get flashSales => _flashSales;
  List<Banner> get banners => _banners;
  bool get isLoading => _isLoading;
  bool get isLoadingMore => _isLoadingMore;
  bool get hasMore => _hasMore;

  Future<void> fetchHomeData() async {
    _isLoading = true;
    notifyListeners();

    await Future.wait([
      _fetchCategories(),
      _fetchFeatured(),
      _fetchFlashSales(),
      _fetchBanners(),
      fetchProducts(refresh: true),
    ]);

    _isLoading = false;
    notifyListeners();
  }

  Future<void> _fetchCategories() async {
    try {
      final response = await _api.dio.get('/categories');
      final data = _api.extractData(response);
      final list = data is List ? data : (data['data'] ?? data);
      _categories = (list as List).map((c) => Category.fromJson(c)).toList();
    } catch (_) {}
  }

  Future<void> _fetchFeatured() async {
    try {
      final response = await _api.dio.get('/products/featured');
      final data = _api.extractData(response);
      final list = data is List ? data : (data['data'] ?? data);
      _featured = (list as List).map((p) => Product.fromJson(p)).toList();
    } catch (_) {}
  }

  Future<void> _fetchFlashSales() async {
    try {
      final response = await _api.dio.get('/flash-sales/active');
      final data = _api.extractData(response);
      final list = data is List ? data : (data['data'] ?? data);
      _flashSales = (list as List).map((f) => FlashSale.fromJson(f)).toList();
    } catch (_) {}
  }

  Future<void> _fetchBanners() async {
    try {
      final response = await _api.dio.get('/settings/banners/hero');
      final data = _api.extractData(response);
      final list = data is List ? data : (data['data'] ?? data);
      _banners = (list as List).map((b) => Banner.fromJson(b)).toList();
    } catch (_) {}
  }

  Future<void> fetchProducts({
    bool refresh = false,
    String? search,
    String? categoryId,
    String? sortBy,
  }) async {
    if (refresh) {
      _page = 1;
      _hasMore = true;
      _currentSearch = search;
      _currentCategoryId = categoryId;
    }

    if (!_hasMore && !refresh) return;

    if (refresh) {
      _isLoading = true;
    } else {
      _isLoadingMore = true;
    }
    notifyListeners();

    try {
      final response = await _api.dio.get('/products', queryParameters: {
        'page': _page,
        'limit': AppConstants.productsPerPage,
        if (_currentSearch != null && _currentSearch!.isNotEmpty) 'search': _currentSearch,
        if (_currentCategoryId != null) 'categoryId': _currentCategoryId,
        if (sortBy != null) 'sortBy': sortBy,
      });

      final data = _api.extractData(response);
      List rawList;
      if (data is List) {
        rawList = data;
      } else if (data is Map) {
        rawList = data['data'] ?? data['products'] ?? [];
      } else {
        rawList = [];
      }

      final newProducts = rawList.map((p) => Product.fromJson(p)).toList();

      if (refresh) {
        _products = newProducts;
      } else {
        _products.addAll(newProducts);
      }

      _hasMore = newProducts.length >= AppConstants.productsPerPage;
      if (_hasMore) _page++;
    } catch (_) {}

    _isLoading = false;
    _isLoadingMore = false;
    notifyListeners();
  }

  Future<void> loadMore() async {
    if (_isLoadingMore || !_hasMore) return;
    await fetchProducts();
  }

  Future<Product?> fetchProductDetail(String slug) async {
    try {
      final response = await _api.dio.get('/products/$slug');
      final data = _api.extractData(response);
      return Product.fromJson(data);
    } catch (_) {
      return null;
    }
  }

  Future<List<Product>> fetchRelated(String slug) async {
    try {
      final response = await _api.dio.get('/products/$slug/related');
      final data = _api.extractData(response);
      final list = data is List ? data : (data['data'] ?? []);
      return (list as List).map((p) => Product.fromJson(p)).toList();
    } catch (_) {
      return [];
    }
  }

  Future<List<Review>> fetchReviews(String productId) async {
    try {
      final response = await _api.dio.get('/reviews/products/$productId');
      final data = _api.extractData(response);
      final list = data is List ? data : (data['data'] ?? []);
      return (list as List).map((r) => Review.fromJson(r)).toList();
    } catch (_) {
      return [];
    }
  }

  Future<List<String>> autocomplete(String query) async {
    try {
      final response = await _api.dio.get('/products/autocomplete', queryParameters: {'q': query});
      final data = _api.extractData(response);
      if (data is List) return data.map((e) => e.toString()).toList();
      return [];
    } catch (_) {
      return [];
    }
  }
}
