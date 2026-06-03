import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/api/api_service.dart';
import '../../core/theme.dart';
import '../../core/utils/helpers.dart';
import '../auth/auth_provider.dart';

class WalletScreen extends StatefulWidget {
  const WalletScreen({super.key});

  @override
  State<WalletScreen> createState() => _WalletScreenState();
}

class _WalletScreenState extends State<WalletScreen> {
  final _api = ApiService();
  List<Map<String, dynamic>> _transactions = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadTransactions();
  }

  Future<void> _loadTransactions() async {
    try {
      final res = await _api.dio.get('/wallet/transactions');
      final data = _api.extractData(res);
      final list = data is List ? data : (data['data'] ?? data['transactions'] ?? []);
      _transactions = List<Map<String, dynamic>>.from(list);
    } catch (_) {
      // Wallet transactions endpoint may not exist yet - that's OK
    }
    if (mounted) setState(() => _loading = false);
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final user = auth.user;

    return Scaffold(
      backgroundColor: AppTheme.backgroundColor,
      appBar: AppBar(title: const Text('Wallet')),
      body: RefreshIndicator(
        onRefresh: () async {
          await auth.fetchProfile();
          await _loadTransactions();
        },
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            // Balance card
            Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                gradient: AppTheme.primaryGradient,
                borderRadius: BorderRadius.circular(20),
              ),
              child: Column(
                children: [
                  const Icon(Icons.account_balance_wallet_rounded, color: Colors.white, size: 40),
                  const SizedBox(height: 12),
                  Text('Wallet Balance',
                      style: TextStyle(color: Colors.white.withValues(alpha: 0.8), fontSize: 14)),
                  const SizedBox(height: 8),
                  Text(
                    formatCurrency(user?.walletBalance ?? 0),
                    style: const TextStyle(
                      color: Colors.white, fontSize: 32, fontWeight: FontWeight.w800,
                    ),
                  ),
                  const SizedBox(height: 16),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                        decoration: BoxDecoration(
                          color: Colors.white.withValues(alpha: 0.2),
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(Icons.stars_rounded, color: Colors.amber, size: 18),
                            const SizedBox(width: 6),
                            Text('${user?.loyaltyPoints ?? 0} Points',
                                style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600)),
                          ],
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),

            const SizedBox(height: 20),

            // Quick actions
            Row(
              children: [
                Expanded(child: _actionCard(Icons.add_rounded, 'Top Up', () {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Top up coming soon')),
                  );
                })),
                const SizedBox(width: 12),
                Expanded(child: _actionCard(Icons.history_rounded, 'History', () {
                  // Already showing below
                })),
              ],
            ),

            const SizedBox(height: 20),

            // Transaction history
            const Text('Recent Transactions',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
            const SizedBox(height: 12),

            if (_loading)
              const Center(
                child: Padding(
                  padding: EdgeInsets.all(32),
                  child: CircularProgressIndicator(),
                ),
              )
            else if (_transactions.isEmpty)
              Container(
                padding: const EdgeInsets.all(32),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  boxShadow: [AppTheme.cardShadow],
                ),
                child: Column(
                  children: [
                    Icon(Icons.receipt_long_outlined, size: 48,
                        color: AppTheme.textTertiary.withValues(alpha: 0.5)),
                    const SizedBox(height: 12),
                    Text('No transactions yet',
                        style: TextStyle(color: AppTheme.textSecondary)),
                    const SizedBox(height: 4),
                    Text('Your wallet transaction history will appear here',
                        style: TextStyle(fontSize: 13, color: AppTheme.textTertiary)),
                  ],
                ),
              )
            else
              Container(
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  boxShadow: [AppTheme.cardShadow],
                ),
                child: Column(
                  children: _transactions.map((tx) => _transactionTile(tx)).toList(),
                ),
              ),

            const SizedBox(height: 32),
          ],
        ),
      ),
    );
  }

  Widget _actionCard(IconData icon, String label, VoidCallback onTap) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          boxShadow: [AppTheme.cardShadow],
        ),
        child: Column(
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: AppTheme.primaryColor.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(icon, color: AppTheme.primaryColor),
            ),
            const SizedBox(height: 8),
            Text(label, style: const TextStyle(fontWeight: FontWeight.w600)),
          ],
        ),
      ),
    );
  }

  Widget _transactionTile(Map<String, dynamic> tx) {
    final amount = safeDouble(tx['amount']);
    final isCredit = tx['type'] == 'CREDIT' || amount > 0;
    final desc = tx['description'] ?? tx['type'] ?? 'Transaction';
    final dateStr = tx['createdAt'];
    final date = dateStr != null ? DateTime.tryParse(dateStr) : null;

    return ListTile(
      leading: Container(
        padding: const EdgeInsets.all(8),
        decoration: BoxDecoration(
          color: (isCredit ? AppTheme.successColor : AppTheme.errorColor).withValues(alpha: 0.1),
          borderRadius: BorderRadius.circular(10),
        ),
        child: Icon(
          isCredit ? Icons.arrow_downward_rounded : Icons.arrow_upward_rounded,
          color: isCredit ? AppTheme.successColor : AppTheme.errorColor,
          size: 20,
        ),
      ),
      title: Text(desc, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
      subtitle: date != null
          ? Text(formatDateTime(date), style: TextStyle(fontSize: 12, color: AppTheme.textTertiary))
          : null,
      trailing: Text(
        '${isCredit ? '+' : '-'} ${formatCurrency(amount.abs())}',
        style: TextStyle(
          fontWeight: FontWeight.w700,
          color: isCredit ? AppTheme.successColor : AppTheme.errorColor,
        ),
      ),
    );
  }
}
