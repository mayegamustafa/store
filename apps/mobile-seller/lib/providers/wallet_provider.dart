import 'package:flutter/material.dart';
import '../core/api_service.dart';

class WalletProvider extends ChangeNotifier {
  final _api = ApiService();

  double _balance = 0;
  List<dynamic> _transactions = [];
  bool _loading = false;

  double get balance => _balance;
  List<dynamic> get transactions => _transactions;
  bool get loading => _loading;

  Future<void> load() async {
    _loading = true;
    notifyListeners();
    try {
      final bRes = await _api.dio.get('/wallet/seller/balance');
      final bData = _api.extractData(bRes);
      _balance = double.tryParse(bData['balance']?.toString() ?? '0') ?? 0;

      final tRes = await _api.dio.get('/wallet/seller/transactions');
      final tData = _api.extractData(tRes);
      _transactions = tData is List ? tData : (tData['data'] as List?) ?? [];
    } catch (_) {}
    _loading = false;
    notifyListeners();
  }

  Future<bool> withdraw(double amount, String phone) async {
    try {
      await _api.dio.post('/wallet/seller/withdraw', data: {
        'amount': amount,
        'phone': phone,
      });
      await load();
      return true;
    } catch (_) {
      return false;
    }
  }
}
