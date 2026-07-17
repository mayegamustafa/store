import 'package:flutter/material.dart';
import 'package:fl_chart/fl_chart.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../core/theme.dart';
import '../providers/auth_provider.dart';
import '../providers/orders_provider.dart';
import '../providers/wallet_provider.dart';
import '../core/money.dart';
import '../core/api_service.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});
  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  Map<String, dynamic>? _trend;

  @override
  void initState() {
    super.initState();
    _refresh();
  }

  Future<void> _refresh() async {
    await Future.wait([
      context.read<OrdersProvider>().load(),
      context.read<WalletProvider>().load(),
      _loadTrend(),
    ]);
  }

  Future<void> _loadTrend() async {
    try {
      final api = ApiService();
      final res = await api.dio
          .get('/sellers/me/sales-trend', queryParameters: {'days': 14});
      final data = api.extractData(res);
      if (mounted && data is Map) {
        setState(() => _trend = Map<String, dynamic>.from(data));
      }
    } catch (_) {}
  }

  /// Revenue bars + order-count line for the last 14 days.
  Widget _buildTrendCharts() {
    final series = (_trend?['series'] as List?) ?? [];
    if (series.isEmpty) return const SizedBox.shrink();

    final revenue =
        series.map((d) => (d['revenue'] as num?)?.toDouble() ?? 0).toList();
    final orders =
        series.map((d) => (d['orders'] as num?)?.toDouble() ?? 0).toList();
    final maxRev = revenue.reduce((a, b) => a > b ? a : b);
    final maxOrd = orders.reduce((a, b) => a > b ? a : b);

    Widget card({required String title, required String subtitle, required Widget chart}) =>
        Container(
          margin: const EdgeInsets.only(bottom: 16),
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 12),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: const Color(0xFFE2E8F0)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(title,
                  style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
              Text(subtitle,
                  style: const TextStyle(
                      fontSize: 12, color: AppTheme.textSecondary)),
              const SizedBox(height: 16),
              SizedBox(height: 150, child: chart),
            ],
          ),
        );

    const hidden = FlTitlesData(
      leftTitles: AxisTitles(sideTitles: SideTitles(showTitles: false)),
      topTitles: AxisTitles(sideTitles: SideTitles(showTitles: false)),
      rightTitles: AxisTitles(sideTitles: SideTitles(showTitles: false)),
      bottomTitles: AxisTitles(sideTitles: SideTitles(showTitles: false)),
    );

    return Column(
      children: [
        card(
          title: 'Revenue — last 14 days',
          subtitle: 'Total ${Money.fmt(_trend?['totalRevenue'] ?? 0)}',
          chart: BarChart(BarChartData(
            maxY: maxRev == 0 ? 1 : maxRev * 1.2,
            gridData: const FlGridData(show: false),
            borderData: FlBorderData(show: false),
            titlesData: hidden,
            barTouchData: BarTouchData(
              touchTooltipData: BarTouchTooltipData(
                getTooltipItem: (g, _, rod, __) => BarTooltipItem(
                  Money.fmt(rod.toY),
                  const TextStyle(color: Colors.white, fontSize: 11),
                ),
              ),
            ),
            barGroups: [
              for (var i = 0; i < revenue.length; i++)
                BarChartGroupData(x: i, barRods: [
                  BarChartRodData(
                    toY: revenue[i],
                    color: AppTheme.primary,
                    width: 8,
                    borderRadius:
                        const BorderRadius.vertical(top: Radius.circular(3)),
                  ),
                ]),
            ],
          )),
        ),
        card(
          title: 'Orders — last 14 days',
          subtitle: '${(_trend?['totalOrders'] ?? 0)} orders',
          chart: LineChart(LineChartData(
            maxY: maxOrd == 0 ? 1 : maxOrd + 1,
            minY: 0,
            gridData: const FlGridData(show: false),
            borderData: FlBorderData(show: false),
            titlesData: hidden,
            lineBarsData: [
              LineChartBarData(
                spots: [
                  for (var i = 0; i < orders.length; i++)
                    FlSpot(i.toDouble(), orders[i]),
                ],
                isCurved: true,
                color: AppTheme.success,
                barWidth: 3,
                dotData: const FlDotData(show: false),
                belowBarData: BarAreaData(
                  show: true,
                  color: AppTheme.success.withValues(alpha: 0.12),
                ),
              ),
            ],
          )),
        ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final orders = context.watch<OrdersProvider>();
    final wallet = context.watch<WalletProvider>();
    final currency = NumberFormat.currency(symbol: '${Money.code} ', decimalDigits: 0);

    final pending =
        orders.orders.where((o) => o['status'] == 'PENDING').length;
    final processing =
        orders.orders.where((o) => o['status'] == 'PROCESSING').length;

    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(auth.storeName,
                style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w600)),
            Text('Seller Dashboard',
                style: TextStyle(
                    fontSize: 12, color: AppTheme.textSecondary)),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            onPressed: _refresh,
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _refresh,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            // Revenue card
            Container(
              padding: const EdgeInsets.all(20),
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
                          color: Colors.white.withValues(alpha: 0.8),
                          fontSize: 13)),
                  const SizedBox(height: 8),
                  Text(
                    currency.format(wallet.balance),
                    style: const TextStyle(
                        color: Colors.white,
                        fontSize: 32,
                        fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 16),
                  Row(
                    children: [
                      _MiniStat(
                          label: 'Transactions',
                          value: '${wallet.transactions.length}',
                          icon: Icons.swap_horiz),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),
            // Stats row
            Row(
              children: [
                Expanded(
                    child: _StatCard(
                        label: 'Total Orders',
                        value: '${orders.orders.length}',
                        icon: Icons.receipt_long_rounded,
                        color: AppTheme.primary)),
                const SizedBox(width: 12),
                Expanded(
                    child: _StatCard(
                        label: 'Pending',
                        value: '$pending',
                        icon: Icons.hourglass_top_rounded,
                        color: AppTheme.secondary)),
                const SizedBox(width: 12),
                Expanded(
                    child: _StatCard(
                        label: 'Processing',
                        value: '$processing',
                        icon: Icons.local_shipping_outlined,
                        color: AppTheme.success)),
              ],
            ),
            const SizedBox(height: 24),
            _buildTrendCharts(),
            // Recent orders
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('Recent Orders',
                    style: TextStyle(
                        fontSize: 16, fontWeight: FontWeight.w600)),
                TextButton(
                  onPressed: () {},
                  child: const Text('See All'),
                ),
              ],
            ),
            const SizedBox(height: 8),
            if (orders.loading)
              const Center(child: CircularProgressIndicator())
            else if (orders.orders.isEmpty)
              Center(
                child: Padding(
                  padding: const EdgeInsets.all(32),
                  child: Column(
                    children: [
                      Icon(Icons.receipt_long_outlined,
                          size: 48, color: Colors.grey.shade300),
                      const SizedBox(height: 12),
                      const Text('No orders yet',
                          style: TextStyle(color: AppTheme.textSecondary)),
                    ],
                  ),
                ),
              )
            else
              ...orders.orders.take(5).map((o) => _OrderTile(order: o)),
          ],
        ),
      ),
    );
  }
}

class _MiniStat extends StatelessWidget {
  final String label;
  final String value;
  final IconData icon;
  const _MiniStat(
      {required this.label, required this.value, required this.icon});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Icon(icon, color: Colors.white70, size: 16),
        const SizedBox(width: 6),
        Text('$label: $value',
            style: const TextStyle(color: Colors.white70, fontSize: 12)),
      ],
    );
  }
}

class _StatCard extends StatelessWidget {
  final String label;
  final String value;
  final IconData icon;
  final Color color;
  const _StatCard(
      {required this.label,
      required this.value,
      required this.icon,
      required this.color});

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          children: [
            Icon(icon, color: color, size: 28),
            const SizedBox(height: 8),
            Text(value,
                style:
                    const TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
            const SizedBox(height: 2),
            Text(label,
                style: const TextStyle(
                    fontSize: 11, color: AppTheme.textSecondary),
                textAlign: TextAlign.center),
          ],
        ),
      ),
    );
  }
}

class _OrderTile extends StatelessWidget {
  final dynamic order;
  const _OrderTile({required this.order});

  Color _statusColor(String s) {
    switch (s) {
      case 'PENDING':
        return AppTheme.secondary;
      case 'PROCESSING':
        return Colors.blue;
      case 'SHIPPED':
        return Colors.orange;
      case 'DELIVERED':
        return AppTheme.success;
      case 'CANCELLED':
        return AppTheme.error;
      default:
        return AppTheme.textSecondary;
    }
  }

  @override
  Widget build(BuildContext context) {
    final status = order['status'] as String? ?? 'PENDING';
    final total = order['total'] ?? order['totalAmount'] ?? 0;
    final id = order['id']?.toString().substring(0, 8) ?? '';
    final buyer = order['user']?['firstName'] ?? 'Customer';
    final date = order['createdAt'] != null
        ? DateFormat.MMMd().format(DateTime.parse(order['createdAt']))
        : '';

    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        contentPadding:
            const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
        leading: CircleAvatar(
          backgroundColor: _statusColor(status).withValues(alpha: 0.1),
          child: Icon(Icons.receipt_outlined, color: _statusColor(status)),
        ),
        title: Text('#$id',
            style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
        subtitle: Text('$buyer · $date',
            style:
                const TextStyle(fontSize: 12, color: AppTheme.textSecondary)),
        trailing: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            Text(Money.fmt(total),
                style:
                    const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
              decoration: BoxDecoration(
                color: _statusColor(status).withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(status,
                  style: TextStyle(
                      color: _statusColor(status),
                      fontSize: 10,
                      fontWeight: FontWeight.w600)),
            ),
          ],
        ),
      ),
    );
  }
}
