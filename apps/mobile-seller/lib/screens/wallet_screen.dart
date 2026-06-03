import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../core/theme.dart';
import '../providers/wallet_provider.dart';

class WalletScreen extends StatefulWidget {
  const WalletScreen({super.key});
  @override
  State<WalletScreen> createState() => _WalletScreenState();
}

class _WalletScreenState extends State<WalletScreen> {
  @override
  void initState() {
    super.initState();
    context.read<WalletProvider>().load();
  }

  void _showWithdrawDialog() {
    final amountCtrl = TextEditingController();
    final phoneCtrl = TextEditingController();
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text('Withdraw Funds'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: amountCtrl,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(
                  labelText: 'Amount (KES)', prefixIcon: Icon(Icons.payments_outlined)),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: phoneCtrl,
              keyboardType: TextInputType.phone,
              decoration: const InputDecoration(
                  labelText: 'M-Pesa Phone', prefixIcon: Icon(Icons.phone_outlined)),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () async {
              final amount = double.tryParse(amountCtrl.text);
              final phone = phoneCtrl.text.trim();
              if (amount == null || amount <= 0 || phone.isEmpty) return;
              Navigator.pop(ctx);
              final ok = await context
                  .read<WalletProvider>()
                  .withdraw(amount, phone);
              if (mounted) {
                ScaffoldMessenger.of(context).showSnackBar(SnackBar(
                    content: Text(ok
                        ? 'Withdrawal initiated'
                        : 'Withdrawal failed')));
              }
            },
            child: const Text('Withdraw'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final wallet = context.watch<WalletProvider>();
    final currency = NumberFormat.currency(symbol: 'KES ', decimalDigits: 0);

    return Scaffold(
      appBar: AppBar(title: const Text('Wallet')),
      body: RefreshIndicator(
        onRefresh: wallet.load,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            // Balance card
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [AppTheme.primary, AppTheme.primaryDark],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(20),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Available Balance',
                      style: TextStyle(
                          color: Colors.white.withValues(alpha: 0.8), fontSize: 14)),
                  const SizedBox(height: 8),
                  Text(
                    currency.format(wallet.balance),
                    style: const TextStyle(
                        color: Colors.white,
                        fontSize: 36,
                        fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 16),
                  SizedBox(
                    width: double.infinity,
                    child: OutlinedButton.icon(
                      onPressed: _showWithdrawDialog,
                      icon: const Icon(Icons.arrow_upward_rounded),
                      label: const Text('Withdraw'),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: Colors.white,
                        side: const BorderSide(color: Colors.white54),
                        shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12)),
                        padding: const EdgeInsets.symmetric(vertical: 12),
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),
            const Text('Transactions',
                style:
                    TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
            const SizedBox(height: 12),
            if (wallet.loading)
              const Center(child: CircularProgressIndicator())
            else if (wallet.transactions.isEmpty)
              Center(
                child: Padding(
                  padding: const EdgeInsets.all(32),
                  child: Column(
                    children: [
                      Icon(Icons.receipt_outlined, size: 48,
                          color: Colors.grey.shade300),
                      const SizedBox(height: 12),
                      const Text('No transactions yet',
                          style: TextStyle(color: AppTheme.textSecondary)),
                    ],
                  ),
                ),
              )
            else
              ...wallet.transactions.map((t) => _TransactionTile(tx: t)),
          ],
        ),
      ),
    );
  }
}

class _TransactionTile extends StatelessWidget {
  final dynamic tx;
  const _TransactionTile({required this.tx});

  @override
  Widget build(BuildContext context) {
    final type = tx['type'] as String? ?? '';
    final amount = tx['amount'] ?? 0;
    final isCredit = type == 'CREDIT' || type == 'COMMISSION' || type == 'SALE';
    final desc = tx['description'] ?? tx['reference'] ?? type;
    final date = tx['createdAt'] != null
        ? DateFormat('MMM d · h:mm a').format(DateTime.parse(tx['createdAt']))
        : '';

    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: (isCredit ? AppTheme.success : AppTheme.error)
              .withValues(alpha: 0.1),
          child: Icon(
              isCredit ? Icons.arrow_downward_rounded : Icons.arrow_upward_rounded,
              color: isCredit ? AppTheme.success : AppTheme.error),
        ),
        title: Text(desc.toString(),
            style: const TextStyle(fontWeight: FontWeight.w500, fontSize: 14)),
        subtitle: Text(date,
            style:
                const TextStyle(fontSize: 12, color: AppTheme.textSecondary)),
        trailing: Text(
          '${isCredit ? '+' : '-'} KES $amount',
          style: TextStyle(
              color: isCredit ? AppTheme.success : AppTheme.error,
              fontWeight: FontWeight.w600,
              fontSize: 14),
        ),
      ),
    );
  }
}
