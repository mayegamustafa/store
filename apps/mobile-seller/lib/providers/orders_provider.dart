import 'package:flutter/material.dart';
import '../core/api_service.dart';

class OrdersProvider extends ChangeNotifier {
  final _api = ApiService();

  List<dynamic> _orders = [];
  bool _loading = false;
  String _statusFilter = '';

  List<dynamic> get orders => _orders;
  bool get loading => _loading;
  String get statusFilter => _statusFilter;

  Future<void> load({String status = ''}) async {
    _statusFilter = status;
    _loading = true;
    notifyListeners();
    try {
      final params = <String, dynamic>{'page': 1, 'limit': 50};
      if (status.isNotEmpty) params['status'] = status;
      final res = await _api.dio.get('/sellers/me/orders', queryParameters: params);
      final data = _api.extractData(res);
      _orders = data is List ? data : (data['data'] as List?) ?? [];
    } catch (_) {
      _orders = [];
    }
    _loading = false;
    notifyListeners();
  }

  Future<Map<String, dynamic>?> getOrder(String id) async {
    try {
      final res = await _api.dio.get('/orders/$id');
      return _api.extractData(res) as Map<String, dynamic>;
    } catch (_) {
      return null;
    }
  }

  Future<bool> updateStatus(String id, String status) async {
    try {
      await _api.dio.patch('/orders/$id/status', data: {'status': status});
      await load(status: _statusFilter);
      return true;
    } catch (_) {
      return false;
    }
  }
}
