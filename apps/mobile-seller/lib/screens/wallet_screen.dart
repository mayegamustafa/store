import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../core/theme.dart';
import '../providers/wallet_provider.dart';
import '../core/money.dart';

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

  void _showWithdrawSheet() {
    final amountCtrl = TextEditingController();
    final destinationCtrl = TextEditingController();
    final nameCtrl = TextEditingController();
    final bankCtrl = TextEditingController();
    String method = 'mobile_money';
    bool submitting = false;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setSS) => Padding(
          padding: EdgeInsets.only(
            left: 20, right: 20, top: 20,
            bottom: MediaQuery.of(ctx).viewInsets.bottom + 24,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: Container(
                  width: 40, height: 4,
                  decoration: BoxDecoration(
                      color: Colors.grey.shade300,
                      borderRadius: BorderRadius.circular(2)),
                ),
              ),
              const SizedBox(height: 16),
              const Text('Withdraw Funds',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
              const SizedBox(height: 4),
              Text(
                'Money is sent to your account after admin review.',
                style: TextStyle(fontSize: 13, color: Colors.grey.shade600),
              ),
              const SizedBox(height: 20),
              // Method toggle
              Row(
                children: [
                  Expanded(
                    child: _MethodChip(
                      label: 'Mobile Money',
                      icon: Icons.phone_android_rounded,
                      selected: method == 'mobile_money',
                      onTap: () => setSS(() => method = 'mobile_money'),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: _MethodChip(
                      label: 'Bank Account',
                      icon: Icons.account_balance_rounded,
                      selected: method == 'bank',
                      onTap: () => setSS(() => method = 'bank'),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              TextField(
                controller: amountCtrl,
                keyboardType: TextInputType.number,
                decoration: InputDecoration(
                    labelText: 'Amount (${Money.code})',
                    prefixIcon: const Icon(Icons.payments_outlined)),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: destinationCtrl,
                keyboardType: method == 'mobile_money'
                    ? TextInputType.phone
                    : TextInputType.number,
                decoration: InputDecoration(
                  labelText: method == 'mobile_money'
                      ? 'Mobile Money Number (MTN / Airtel)'
                      : 'Bank Account Number',
                  prefixIcon: Icon(method == 'mobile_money'
                      ? Icons.phone_outlined
                      : Icons.numbers_rounded),
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: nameCtrl,
                decoration: const InputDecoration(
                    labelText: 'Account Holder Name',
                    prefixIcon: Icon(Icons.person_outline_rounded)),
              ),
              if (method == 'bank') ...[
                const SizedBox(height: 12),
                TextField(
                  controller: bankCtrl,
                  decoration: const InputDecoration(
                      labelText: 'Bank Name',
                      prefixIcon: Icon(Icons.account_balance_outlined)),
                ),
              ],
              const SizedBox(height: 20),
              SizedBox(
                width: double.infinity,
                height: 52,
                child: FilledButton(
                  onPressed: submitting
                      ? null
                      : () async {
                          final amount = double.tryParse(amountCtrl.text);
                          final destination = destinationCtrl.text.trim();
                          if (amount == null || amount <= 0) return;
                          if (destination.isEmpty) return;
                          if (method == 'bank' && bankCtrl.text.trim().isEmpty) {
                            ScaffoldMessenger.of(ctx).showSnackBar(const SnackBar(
                                content: Text('Enter the bank name')));
                            return;
                          }
                          setSS(() => submitting = true);
                          final err = await context.read<WalletProvider>().withdraw(
                                amount: amount,
                                method: method,
                                destination: destination,
                                destinationName: nameCtrl.text.trim(),
                                bankName: bankCtrl.text.trim(),
                              );
                          if (!ctx.mounted) return;
                          Navigator.pop(ctx);
                          if (mounted) {
                            ScaffoldMessenger.of(context).showSnackBar(SnackBar(
                              content: Text(err ??
                                  'Withdrawal requested — you\'ll be paid after review'),
                              backgroundColor:
                                  err == null ? AppTheme.success : AppTheme.error,
                            ));
                          }
                        },
                  style: FilledButton.styleFrom(
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(14))),
                  child: submitting
                      ? const SizedBox(
                          width: 22, height: 22,
                          child: CircularProgressIndicator(
                              strokeWidth: 2, color: Colors.white))
                      : const Text('Request Withdrawal'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final wallet = context.watch<WalletProvider>();
    final currency = NumberFormat.currency(symbol: '${Money.code} ', decimalDigits: 0);

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
                  if (wallet.pendingBalance > 0) ...[
                    const SizedBox(height: 10),
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 12, vertical: 6),
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(Icons.hourglass_top_rounded,
                              color: Colors.white70, size: 15),
                          const SizedBox(width: 6),
                          Text(
                            '${currency.format(wallet.pendingBalance)} pending release',
                            style: const TextStyle(
                                color: Colors.white, fontSize: 13),
                          ),
                        ],
                      ),
                    ),
                  ],
                  const SizedBox(height: 16),
                  SizedBox(
                    width: double.infinity,
                    child: OutlinedButton.icon(
                      onPressed: _showWithdrawSheet,
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

            // Withdrawal requests
            if (wallet.withdrawals.isNotEmpty) ...[
              const Text('Withdrawal Requests',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
              const SizedBox(height: 12),
              ...wallet.withdrawals.take(5).map((w) => _WithdrawalTile(payout: w)),
              const SizedBox(height: 16),
            ],

            const Text('Transactions',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
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

class _MethodChip extends StatelessWidget {
  final String label;
  final IconData icon;
  final bool selected;
  final VoidCallback onTap;
  const _MethodChip({
    required this.label,
    required this.icon,
    required this.selected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(14),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 14),
        decoration: BoxDecoration(
          color: selected
              ? AppTheme.primary.withValues(alpha: 0.08)
              : Colors.grey.shade50,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
              color: selected ? AppTheme.primary : Colors.grey.shade200,
              width: selected ? 1.5 : 1),
        ),
        child: Column(
          children: [
            Icon(icon,
                color: selected ? AppTheme.primary : Colors.grey.shade500,
                size: 22),
            const SizedBox(height: 6),
            Text(label,
                style: TextStyle(
                    fontSize: 12,
                    fontWeight: selected ? FontWeight.w600 : FontWeight.w400,
                    color:
                        selected ? AppTheme.primary : Colors.grey.shade600)),
          ],
        ),
      ),
    );
  }
}

class _WithdrawalTile extends StatelessWidget {
  final dynamic payout;
  const _WithdrawalTile({required this.payout});

  @override
  Widget build(BuildContext context) {
    final status = payout['status'] as String? ?? 'PENDING';
    final amount = payout['amount'] ?? 0;
    final destination = payout['destination'] ?? '';
    final date = payout['createdAt'] != null
        ? DateFormat('MMM d · h:mm a').format(DateTime.parse(payout['createdAt']))
        : '';

    final (color, icon) = switch (status) {
      'COMPLETED' => (AppTheme.success, Icons.check_circle_rounded),
      'FAILED' => (AppTheme.error, Icons.cancel_rounded),
      _ => (Colors.orange, Icons.hourglass_top_rounded),
    };

    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: color.withValues(alpha: 0.1),
          child: Icon(icon, color: color, size: 20),
        ),
        title: Text('${Money.fmt(amount)} → $destination',
            style: const TextStyle(fontWeight: FontWeight.w500, fontSize: 14)),
        subtitle: Text(
          status == 'FAILED' && payout['failReason'] != null
              ? '$date · ${payout['failReason']}'
              : date,
          style: const TextStyle(fontSize: 12, color: AppTheme.textSecondary),
        ),
        trailing: Text(status,
            style: TextStyle(
                color: color, fontWeight: FontWeight.w600, fontSize: 12)),
      ),
    );
  }
}

class _TransactionTile extends StatelessWidget {
  final dynamic tx;
  const _TransactionTile({required this.tx});

  @override
  Widget build(BuildContext context) {
    final type = (tx['type'] as String? ?? '').toLowerCase();
    final amount = tx['amount'] ?? 0;
    final isCredit = type == 'credit' || type == 'commission' || type == 'sale';
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
          '${isCredit ? '+' : '-'} ${Money.fmt(amount)}',
          style: TextStyle(
              color: isCredit ? AppTheme.success : AppTheme.error,
              fontWeight: FontWeight.w600,
              fontSize: 14),
        ),
      ),
    );
  }
}
