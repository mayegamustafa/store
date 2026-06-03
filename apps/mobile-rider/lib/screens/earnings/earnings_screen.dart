import 'package:flutter/material.dart';
import '../../core/theme/app_theme.dart';
import '../../core/api/api_service.dart';

class EarningsScreen extends StatefulWidget {
  const EarningsScreen({super.key});
  @override
  State<EarningsScreen> createState() => _EarningsScreenState();
}

class _EarningsScreenState extends State<EarningsScreen>
    with SingleTickerProviderStateMixin {
  final _api = ApiService();
  Map<String, dynamic>? _earnings;
  List<dynamic> _transactions = [];
  double _walletBalance = 0;
  bool _loading = true;
  late final TabController _tabCtrl;

  @override
  void initState() {
    super.initState();
    _tabCtrl = TabController(length: 2, vsync: this);
    _load();
  }

  @override
  void dispose() {
    _tabCtrl.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    final e = await _api.getEarnings();
    final txList = await _api.getWalletTransactions();
    final w = await _api.getWalletBalance();
    if (mounted) {
      setState(() {
        _earnings = e;
        _transactions = txList;
        _walletBalance =
            double.tryParse(w?['balance']?.toString() ?? '0') ?? 0;
        _loading = false;
      });
    }
  }

  void _showWithdrawDialog() {
    final amountCtrl = TextEditingController();
    final phoneCtrl = TextEditingController();
    bool submitting = false;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppTheme.surface,
      shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setSS) => Padding(
          padding: EdgeInsets.fromLTRB(
              24, 8, 24, MediaQuery.of(ctx).viewInsets.bottom + 32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: Container(
                  width: 36,
                  height: 4,
                  margin: const EdgeInsets.symmetric(vertical: 12),
                  decoration: BoxDecoration(
                      color: AppTheme.divider,
                      borderRadius: BorderRadius.circular(2)),
                ),
              ),
              const Text(
                'Withdraw Funds',
                style: TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.w800,
                    color: AppTheme.textPrimary),
              ),
              const SizedBox(height: 6),
              Text(
                'Available: ${_fmt(_walletBalance)}',
                style: const TextStyle(
                    fontSize: 14, color: AppTheme.textSecondary),
              ),
              const SizedBox(height: 24),
              _InputField(
                  controller: amountCtrl,
                  label: 'Amount (UGX)',
                  icon: Icons.payments_rounded,
                  keyboardType: TextInputType.number),
              const SizedBox(height: 16),
              _InputField(
                  controller: phoneCtrl,
                  label: 'Mobile Money Number',
                  icon: Icons.phone_android_rounded,
                  keyboardType: TextInputType.phone),
              const SizedBox(height: 24),
              SizedBox(
                width: double.infinity,
                height: 52,
                child: FilledButton(
                  style: FilledButton.styleFrom(
                      backgroundColor: AppTheme.primaryGreen,
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(14))),
                  onPressed: submitting
                      ? null
                      : () async {
                          final amt = double.tryParse(amountCtrl.text) ?? 0;
                          if (amt <= 0 || phoneCtrl.text.isEmpty) return;
                          if (amt > _walletBalance) {
                            ScaffoldMessenger.of(ctx).showSnackBar(
                              const SnackBar(
                                  content: Text('Insufficient balance')),
                            );
                            return;
                          }
                          setSS(() => submitting = true);
                          final res = await _api.withdrawFromWallet(
                              amount: amt, phone: phoneCtrl.text.trim());
                          if (!mounted) return;
                          Navigator.pop(ctx);
                          final ok = res != null && res['error'] == null;
                          ScaffoldMessenger.of(context).showSnackBar(SnackBar(
                            content: Text(ok
                                ? 'Withdrawal initiated!'
                                : (res?['error'] as String? ?? 'Withdrawal failed')),
                            backgroundColor:
                                ok ? AppTheme.successGreen : AppTheme.dangerRed,
                          ));
                          if (ok) _load();
                        },
                  child: submitting
                      ? const SizedBox(
                          width: 22,
                          height: 22,
                          child: CircularProgressIndicator(
                              color: Colors.white, strokeWidth: 2))
                      : const Text('Request Withdrawal',
                          style: TextStyle(
                              fontSize: 16, fontWeight: FontWeight.w700)),
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
    return Scaffold(
      backgroundColor: AppTheme.background,
      body: RefreshIndicator(
        onRefresh: _load,
        color: AppTheme.primaryGreen,
        child: CustomScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          slivers: [
            // Header
            SliverToBoxAdapter(child: _buildHeader()),
            if (_loading)
              const SliverFillRemaining(
                hasScrollBody: false,
                child: Center(
                    child: CircularProgressIndicator(
                        color: AppTheme.primaryGreen)),
              )
            else ...[
              // Stats row
              SliverToBoxAdapter(child: _buildStatsRow()),
              // Tab bar
              SliverPersistentHeader(
                pinned: true,
                delegate: _TabBarDelegate(
                  TabBar(
                    controller: _tabCtrl,
                    labelColor: AppTheme.primaryGreen,
                    unselectedLabelColor: AppTheme.textSecondary,
                    indicatorColor: AppTheme.primaryGreen,
                    indicatorWeight: 3,
                    indicatorSize: TabBarIndicatorSize.label,
                    labelStyle: const TextStyle(
                        fontSize: 14, fontWeight: FontWeight.w700),
                    tabs: const [
                      Tab(text: 'Overview'),
                      Tab(text: 'Transactions'),
                    ],
                  ),
                ),
              ),
              // Tab content
              SliverFillRemaining(
                hasScrollBody: true,
                child: TabBarView(
                  controller: _tabCtrl,
                  children: [
                    _buildOverview(),
                    _buildTransactions(),
                  ],
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildHeader() {
    return Container(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Color(0xFF064E3B), Color(0xFF065F46), Color(0xFF047857)],
        ),
      ),
      child: SafeArea(
        bottom: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 16, 20, 32),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Earnings',
                style: TextStyle(
                    fontSize: 26,
                    fontWeight: FontWeight.w800,
                    color: Colors.white,
                    letterSpacing: -0.5),
              ),
              const SizedBox(height: 20),
              // Balance card (inside header)
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.15),
                  borderRadius: BorderRadius.circular(20),
                  border:
                      Border.all(color: Colors.white.withOpacity(0.25)),
                ),
                child: Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Wallet Balance',
                            style: TextStyle(
                                fontSize: 13,
                                color: Colors.white70,
                                fontWeight: FontWeight.w500),
                          ),
                          const SizedBox(height: 8),
                          Text(
                            _fmt(_walletBalance),
                            style: const TextStyle(
                              fontSize: 28,
                              fontWeight: FontWeight.w900,
                              color: Colors.white,
                              letterSpacing: -0.5,
                            ),
                          ),
                        ],
                      ),
                    ),
                    GestureDetector(
                      onTap: _showWithdrawDialog,
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 18, vertical: 10),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(24),
                        ),
                        child: const Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(Icons.account_balance_wallet_rounded,
                                color: AppTheme.primaryGreen, size: 18),
                            SizedBox(width: 6),
                            Text(
                              'Withdraw',
                              style: TextStyle(
                                color: AppTheme.primaryGreen,
                                fontWeight: FontWeight.w800,
                                fontSize: 13,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildStatsRow() {
    final e = _earnings ?? {};
    final today =
        double.tryParse(e['today']?.toString() ?? '0') ?? 0;
    final week =
        double.tryParse(e['thisWeek']?.toString() ?? '0') ?? 0;
    final month =
        double.tryParse(e['thisMonth']?.toString() ?? '0') ?? 0;

    return Container(
      color: const Color(0xFF047857),
      child: Container(
        decoration: BoxDecoration(
          color: AppTheme.background,
          borderRadius:
              const BorderRadius.vertical(top: Radius.circular(24)),
        ),
        padding: const EdgeInsets.fromLTRB(16, 20, 16, 16),
        child: Row(
          children: [
            _EarningCard(
                label: 'Today',
                amount: _fmtShort(today),
                icon: Icons.wb_sunny_rounded,
                color: AppTheme.warningAmber),
            const SizedBox(width: 12),
            _EarningCard(
                label: 'This Week',
                amount: _fmtShort(week),
                icon: Icons.date_range_rounded,
                color: AppTheme.infoBlue),
            const SizedBox(width: 12),
            _EarningCard(
                label: 'This Month',
                amount: _fmtShort(month),
                icon: Icons.calendar_month_rounded,
                color: AppTheme.primaryGreen),
          ],
        ),
      ),
    );
  }

  Widget _buildOverview() {
    final e = _earnings ?? {};
    final deliveries =
        int.tryParse(e['totalDeliveries']?.toString() ?? '0') ?? 0;
    final totalEarned =
        double.tryParse(e['totalEarned']?.toString() ?? '0') ?? 0;
    final avgPerDelivery = deliveries > 0 ? totalEarned / deliveries : 0.0;

    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 120),
      children: [
        _SummaryCard(
          title: 'Total Earned',
          value: _fmt(totalEarned),
          subtitle: 'All time earnings',
          icon: Icons.trending_up_rounded,
          color: AppTheme.successGreen,
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(
              child: _MiniStatCard(
                label: 'Deliveries',
                value: '$deliveries',
                icon: Icons.local_shipping_rounded,
                color: AppTheme.infoBlue,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _MiniStatCard(
                label: 'Avg / Delivery',
                value: _fmtShort(avgPerDelivery),
                icon: Icons.bar_chart_rounded,
                color: AppTheme.warningAmber,
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildTransactions() {
    if (_transactions.isEmpty) {
      return const Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.receipt_long_rounded,
                size: 52, color: AppTheme.textTertiary),
            SizedBox(height: 16),
            Text('No transactions yet',
                style: TextStyle(
                    color: AppTheme.textSecondary, fontSize: 15)),
          ],
        ),
      );
    }

    return ListView.separated(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 120),
      itemCount: _transactions.length,
      separatorBuilder: (_, __) => const SizedBox(height: 8),
      itemBuilder: (_, i) {
        final tx = _transactions[i] as Map<String, dynamic>;
        final type = (tx['type'] as String?) ?? 'CREDIT';
        final isCredit = type == 'CREDIT';
        final amount =
            double.tryParse(tx['amount']?.toString() ?? '0') ?? 0;
        final desc = tx['description'] as String? ?? type;
        final date = tx['createdAt'] as String? ?? '';
        final color =
            isCredit ? AppTheme.successGreen : AppTheme.dangerRed;

        return Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
          decoration: BoxDecoration(
            color: AppTheme.surface,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: AppTheme.divider),
            boxShadow: AppTheme.cardShadow,
          ),
          child: Row(
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                    color: color.withOpacity(0.1),
                    shape: BoxShape.circle),
                child: Icon(
                  isCredit
                      ? Icons.arrow_downward_rounded
                      : Icons.arrow_upward_rounded,
                  color: color,
                  size: 22,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      desc,
                      style: const TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                          color: AppTheme.textPrimary),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    if (date.isNotEmpty) ...[
                      const SizedBox(height: 3),
                      Text(
                        _formatDate(date),
                        style: const TextStyle(
                            fontSize: 12, color: AppTheme.textTertiary),
                      ),
                    ],
                  ],
                ),
              ),
              Text(
                '${isCredit ? '+' : '-'}${_fmt(amount)}',
                style: TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.w800,
                  color: color,
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  String _fmt(dynamic val) {
    final n = double.tryParse(val?.toString() ?? '0') ?? 0;
    return 'UGX ${n.toStringAsFixed(0).replaceAllMapped(RegExp(r'(\d)(?=(\d{3})+(?!\d))'), (m) => '${m[1]},')}';
  }

  String _fmtShort(double n) {
    if (n >= 1000000) return 'UGX ${(n / 1000000).toStringAsFixed(1)}M';
    if (n >= 1000) return 'UGX ${(n / 1000).toStringAsFixed(0)}K';
    return 'UGX ${n.toStringAsFixed(0)}';
  }

  String _formatDate(String iso) {
    try {
      final dt = DateTime.parse(iso).toLocal();
      const months = [
        'Jan','Feb','Mar','Apr','May','Jun',
        'Jul','Aug','Sep','Oct','Nov','Dec'
      ];
      return '${dt.day} ${months[dt.month - 1]} ${dt.year}';
    } catch (_) {
      return iso;
    }
  }
}

// ── TabBar Persistent Header ───────────────────────────────────────────────
class _TabBarDelegate extends SliverPersistentHeaderDelegate {
  final TabBar tabBar;
  const _TabBarDelegate(this.tabBar);

  @override
  double get minExtent => tabBar.preferredSize.height + 1;
  @override
  double get maxExtent => tabBar.preferredSize.height + 1;

  @override
  Widget build(
      BuildContext context, double shrinkOffset, bool overlapsContent) {
    return Container(
      color: AppTheme.background,
      child: Column(
        children: [
          tabBar,
          const Divider(height: 1),
        ],
      ),
    );
  }

  @override
  bool shouldRebuild(_TabBarDelegate old) => false;
}

// ── Earning Card ───────────────────────────────────────────────────────────
class _EarningCard extends StatelessWidget {
  final String label;
  final String amount;
  final IconData icon;
  final Color color;
  const _EarningCard(
      {required this.label,
      required this.amount,
      required this.icon,
      required this.color});

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 10),
        decoration: BoxDecoration(
          color: AppTheme.surface,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: AppTheme.divider),
          boxShadow: AppTheme.cardShadow,
        ),
        child: Column(
          children: [
            Icon(icon, color: color, size: 20),
            const SizedBox(height: 8),
            Text(
              amount,
              style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w800,
                  color: color,
                  height: 1),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 4),
            Text(
              label,
              style: const TextStyle(
                  fontSize: 10,
                  color: AppTheme.textTertiary,
                  fontWeight: FontWeight.w600),
            ),
          ],
        ),
      ),
    );
  }
}

// ── Summary Card ───────────────────────────────────────────────────────────
class _SummaryCard extends StatelessWidget {
  final String title;
  final String value;
  final String subtitle;
  final IconData icon;
  final Color color;
  const _SummaryCard(
      {required this.title,
      required this.value,
      required this.subtitle,
      required this.icon,
      required this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppTheme.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppTheme.divider),
        boxShadow: AppTheme.cardShadow,
      ),
      child: Row(
        children: [
          Container(
            width: 56,
            height: 56,
            decoration: BoxDecoration(
                color: color.withOpacity(0.1),
                borderRadius: BorderRadius.circular(14)),
            child: Icon(icon, color: color, size: 28),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title,
                    style: const TextStyle(
                        fontSize: 13,
                        color: AppTheme.textSecondary,
                        fontWeight: FontWeight.w500)),
                const SizedBox(height: 4),
                Text(value,
                    style: const TextStyle(
                        fontSize: 22,
                        fontWeight: FontWeight.w900,
                        color: AppTheme.textPrimary,
                        letterSpacing: -0.5)),
                Text(subtitle,
                    style: const TextStyle(
                        fontSize: 12, color: AppTheme.textTertiary)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

// ── Mini Stat Card ─────────────────────────────────────────────────────────
class _MiniStatCard extends StatelessWidget {
  final String label;
  final String value;
  final IconData icon;
  final Color color;
  const _MiniStatCard(
      {required this.label,
      required this.value,
      required this.icon,
      required this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.surface,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppTheme.divider),
        boxShadow: AppTheme.cardShadow,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: color, size: 22),
          const SizedBox(height: 10),
          Text(value,
              style: TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.w800,
                  color: color,
                  height: 1)),
          const SizedBox(height: 4),
          Text(label,
              style: const TextStyle(
                  fontSize: 11,
                  color: AppTheme.textTertiary,
                  fontWeight: FontWeight.w600)),
        ],
      ),
    );
  }
}

// ── Input Field ────────────────────────────────────────────────────────────
class _InputField extends StatelessWidget {
  final TextEditingController controller;
  final String label;
  final IconData icon;
  final TextInputType keyboardType;
  const _InputField(
      {required this.controller,
      required this.label,
      required this.icon,
      required this.keyboardType});

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: controller,
      keyboardType: keyboardType,
      decoration: InputDecoration(
        labelText: label,
        prefixIcon: Icon(icon, color: AppTheme.textTertiary, size: 20),
        border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: BorderSide(color: AppTheme.divider)),
        enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: BorderSide(color: AppTheme.divider)),
        focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide:
                const BorderSide(color: AppTheme.primaryGreen, width: 2)),
        filled: true,
        fillColor: AppTheme.background,
        labelStyle:
            const TextStyle(color: AppTheme.textSecondary, fontSize: 14),
        contentPadding:
            const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      ),
    );
  }
}
