import 'package:flutter/material.dart';
import '../core/api_service.dart';

class WalletProvider extends ChangeNotifier {
  final _api = ApiService();

  double _balance = 0;
  double _pendingBalance = 0;
  List<dynamic> _transactions = [];
  List<dynamic> _withdrawals = [];
  bool _loading = false;

  double get balance => _balance;
  double get pendingBalance => _pendingBalance;
  List<dynamic> get transactions => _transactions;
  List<dynamic> get withdrawals => _withdrawals;
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

    // Escrow (pending) balance — earnings released after delivery + hold days
    try {
      final eRes = await _api.dio.get('/wallet/seller/escrow');
      final eData = _api.extractData(eRes);
      _pendingBalance =
          double.tryParse(eData['pendingBalance']?.toString() ?? '0') ?? 0;
    } catch (_) {}

    // Withdrawal history
    try {
      final wRes = await _api.dio.get('/wallet/seller/withdrawals');
      final wData = _api.extractData(wRes);
      _withdrawals = wData is List ? wData : (wData['data'] as List?) ?? [];
    } catch (_) {}

    _loading = false;
    notifyListeners();
  }

  /// Returns null on success, or an error message.
  Future<String?> withdraw({
    required double amount,
    required String method, // mobile_money | bank
    required String destination,
    String? destinationName,
    String? bankName,
  }) async {
    try {
      await _api.dio.post('/wallet/seller/withdraw', data: {
        'amount': amount,
        'method': method,
        'destination': destination,
        if (destinationName != null && destinationName.isNotEmpty)
          'destinationName': destinationName,
        if (bankName != null && bankName.isNotEmpty) 'bankName': bankName,
      });
      await load();
      return null;
    } catch (e) {
      final msg = _api.errorMessage(e);
      return msg.isNotEmpty ? msg : 'Withdrawal failed';
    }
  }
}
