import 'package:flutter/material.dart';
import '../../core/api/api_service.dart';
import '../../core/models/models.dart';
import '../../core/constants.dart';

class OrdersProvider extends ChangeNotifier {
  final ApiService _api = ApiService();

  List<Order> _orders = [];
  bool _isLoading = false;
  bool _isLoadingMore = false;
  bool _hasMore = true;
  int _page = 1;
  String? _error;

  List<Order> get orders => _orders;
  bool get isLoading => _isLoading;
  bool get isLoadingMore => _isLoadingMore;
  bool get hasMore => _hasMore;
  String? get error => _error;

  Future<void> fetchOrders({bool refresh = false}) async {
    if (refresh) {
      _page = 1;
      _hasMore = true;
      _error = null;
    }

    if (!_hasMore && !refresh) return;

    if (refresh) {
      _isLoading = true;
    } else {
      _isLoadingMore = true;
    }
    notifyListeners();

    try {
      final response = await _api.dio.get('/orders', queryParameters: {
        'page': _page,
        'limit': AppConstants.ordersPerPage,
      });

      final data = _api.extractData(response);
      List rawList;
      if (data is List) {
        rawList = data;
      } else if (data is Map) {
        rawList = data['data'] ?? data['orders'] ?? [];
      } else {
        rawList = [];
      }

      final newOrders = rawList.map((o) => Order.fromJson(o)).toList();

      if (refresh) {
        _orders = newOrders;
      } else {
        _orders.addAll(newOrders);
      }

      _hasMore = newOrders.length >= AppConstants.ordersPerPage;
      if (_hasMore) _page++;
      _error = null;
    } catch (e) {
      _error = 'Failed to load orders. Please try again.';
    }

    _isLoading = false;
    _isLoadingMore = false;
    notifyListeners();
  }

  Future<Order?> fetchOrderDetail(String orderId) async {
    try {
      final response = await _api.dio.get('/orders/$orderId');
      final data = _api.extractData(response);
      return Order.fromJson(data);
    } catch (_) {
      return null;
    }
  }

  Future<Map<String, dynamic>?> createOrder({
    required String addressId,
    String? paymentMethod,
    String? couponCode,
    String? notes,
  }) async {
    try {
      final response = await _api.dio.post('/orders', data: {
        'addressId': addressId,
        if (paymentMethod != null) 'paymentMethod': paymentMethod,
        if (couponCode != null) 'couponCode': couponCode,
        if (notes != null) 'notes': notes,
      });
      final data = _api.extractData(response);
      await fetchOrders(refresh: true);
      if (data is Map<String, dynamic>) return data;
      return {'success': true};
    } catch (_) {
      return null;
    }
  }

  Future<String?> initiatePayment({
    required String orderId,
    required String method,
    String? phone,
    String? email,
    String? returnUrl,
  }) async {
    try {
      final response = await _api.dio.post('/payments/orders/$orderId/initiate', data: {
        'method': method,
        if (phone != null) 'phone': phone,
        if (email != null) 'email': email,
        if (returnUrl != null) 'returnUrl': returnUrl,
      });
      final data = _api.extractData(response);
      if (data is Map && data['redirectUrl'] != null) {
        return data['redirectUrl'] as String;
      }
      return null;
    } catch (_) {
      return null;
    }
  }

  Future<Map<String, dynamic>?> confirmPayment({required String orderId}) async {
    try {
      final response = await _api.dio.get('/payments/orders/$orderId/confirm');
      return _api.extractData(response) as Map<String, dynamic>?;
    } catch (_) {
      return null;
    }
  }

  Future<bool> cancelOrder(String orderId, String reason) async {
    try {
      await _api.dio.patch('/orders/$orderId/cancel', data: {'reason': reason});
      await fetchOrders(refresh: true);
      return true;
    } catch (_) {
      return false;
    }
  }

  Future<Order?> trackOrder(String orderNumber) async {
    try {
      final response = await _api.dio.get('/orders/track-by-number/$orderNumber');
      final data = _api.extractData(response);
      return Order.fromJson(data);
    } catch (_) {
      return null;
    }
  }

  void reset() {
    _orders = [];
    _page = 1;
    _hasMore = true;
    notifyListeners();
  }
}
