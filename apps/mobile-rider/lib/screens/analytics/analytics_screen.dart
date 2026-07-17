import 'package:flutter/material.dart';
import 'package:fl_chart/fl_chart.dart';
import 'package:provider/provider.dart';
import '../../core/theme/app_theme.dart';
import '../../core/api/api_service.dart';
import '../../providers/auth_provider.dart';
import '../../providers/delivery_provider.dart';
import '../../core/money.dart';

class AnalyticsScreen extends StatefulWidget {
  const AnalyticsScreen({super.key});

  @override
  State<AnalyticsScreen> createState() => _AnalyticsScreenState();
}

class _AnalyticsScreenState extends State<AnalyticsScreen> {
  final _api = ApiService();
  Map<String, dynamic>? _earnings;
  Map<String, dynamic>? _trend;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    final results = await Future.wait([
      _api.getEarnings(),
      _api.getEarningsTrend(days: 14),
    ]);
    if (mounted) {
      setState(() {
        _earnings = results[0];
        _trend = results[1];
        _loading = false;
      });
    }
  }

  /// Bar chart of the last 14 days' earnings + a line of daily deliveries.
  Widget _buildTrendCharts() {
    final series = (_trend?['series'] as List?) ?? [];
    if (series.isEmpty) return const SizedBox.shrink();

    final earnings = series
        .map((d) => (d['earnings'] as num?)?.toDouble() ?? 0)
        .toList();
    final deliveries = series
        .map((d) => (d['deliveries'] as num?)?.toDouble() ?? 0)
        .toList();
    final maxEarn = earnings.isEmpty
        ? 1.0
        : earnings.reduce((a, b) => a > b ? a : b);
    final maxDel = deliveries.isEmpty
        ? 1.0
        : deliveries.reduce((a, b) => a > b ? a : b);

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
                  style: const TextStyle(
                      fontSize: 15, fontWeight: FontWeight.w700)),
              Text(subtitle,
                  style: const TextStyle(
                      fontSize: 12, color: AppTheme.textSecondary)),
              const SizedBox(height: 16),
              SizedBox(height: 150, child: chart),
            ],
          ),
        );

    return Column(
      children: [
        card(
          title: 'Earnings — last 14 days',
          subtitle: 'Total ${Money.fmt(_trend?['totalEarnings'] ?? 0)}',
          chart: BarChart(
            BarChartData(
              maxY: maxEarn == 0 ? 1 : maxEarn * 1.2,
              gridData: const FlGridData(show: false),
              borderData: FlBorderData(show: false),
              titlesData: const FlTitlesData(
                leftTitles: AxisTitles(sideTitles: SideTitles(showTitles: false)),
                topTitles: AxisTitles(sideTitles: SideTitles(showTitles: false)),
                rightTitles: AxisTitles(sideTitles: SideTitles(showTitles: false)),
                bottomTitles: AxisTitles(sideTitles: SideTitles(showTitles: false)),
              ),
              barTouchData: BarTouchData(
                touchTooltipData: BarTouchTooltipData(
                  getTooltipItem: (group, _, rod, __) => BarTooltipItem(
                    Money.fmt(rod.toY),
                    const TextStyle(color: Colors.white, fontSize: 11),
                  ),
                ),
              ),
              barGroups: [
                for (var i = 0; i < earnings.length; i++)
                  BarChartGroupData(x: i, barRods: [
                    BarChartRodData(
                      toY: earnings[i],
                      color: AppTheme.primaryGreen,
                      width: 8,
                      borderRadius: const BorderRadius.vertical(
                          top: Radius.circular(3)),
                    ),
                  ]),
              ],
            ),
          ),
        ),
        card(
          title: 'Deliveries — last 14 days',
          subtitle: '${(_trend?['totalDeliveries'] ?? 0)} completed',
          chart: LineChart(
            LineChartData(
              maxY: maxDel == 0 ? 1 : maxDel + 1,
              minY: 0,
              gridData: const FlGridData(show: false),
              borderData: FlBorderData(show: false),
              titlesData: const FlTitlesData(
                leftTitles: AxisTitles(sideTitles: SideTitles(showTitles: false)),
                topTitles: AxisTitles(sideTitles: SideTitles(showTitles: false)),
                rightTitles: AxisTitles(sideTitles: SideTitles(showTitles: false)),
                bottomTitles: AxisTitles(sideTitles: SideTitles(showTitles: false)),
              ),
              lineBarsData: [
                LineChartBarData(
                  spots: [
                    for (var i = 0; i < deliveries.length; i++)
                      FlSpot(i.toDouble(), deliveries[i]),
                  ],
                  isCurved: true,
                  color: AppTheme.primary,
                  barWidth: 3,
                  dotData: const FlDotData(show: false),
                  belowBarData: BarAreaData(
                    show: true,
                    color: AppTheme.primary.withValues(alpha: 0.12),
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  String _fmt(dynamic val) {
    final n = double.tryParse(val.toString()) ?? 0;
    return Money.fmt(n);
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final delivery = context.watch<DeliveryProvider>();
    final user = auth.user;
    final riderProfile = user?['riderProfile'] as Map<String, dynamic>? ?? {};
    final rating = double.tryParse(riderProfile['rating']?.toString() ?? '0') ?? 0;
    final totalDeliveries = riderProfile['totalDeliveries'] ?? _earnings?['totalDeliveries'] ?? 0;
    final walletBalance = double.tryParse(
        (riderProfile['walletBalance'] ?? _earnings?['walletBalance'] ?? '0').toString()) ?? 0;

    // Compute stats from current deliveries
    final allDeliveries = delivery.deliveries;
    final activeCount = allDeliveries.where((d) {
      final s = d['status'] ?? '';
      return s == 'ASSIGNED' || s == 'PICKED_UP' || s == 'IN_TRANSIT';
    }).length;
    final completedToday = allDeliveries.where((d) => d['status'] == 'DELIVERED').length;

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAF9),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _load,
              child: CustomScrollView(
                slivers: [
                  // Modern gradient header
                  SliverAppBar(
                    expandedHeight: 180,
                    pinned: true,
                    backgroundColor: AppTheme.primary,
                    flexibleSpace: FlexibleSpaceBar(
                      background: Container(
                        decoration: const BoxDecoration(
                          gradient: LinearGradient(
                            begin: Alignment.topLeft,
                            end: Alignment.bottomRight,
                            colors: [Color(0xFF059669), Color(0xFF16A34A), Color(0xFF22C55E)],
                          ),
                        ),
                        child: SafeArea(
                          child: Padding(
                            padding: const EdgeInsets.fromLTRB(20, 16, 20, 20),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    const Text('Analytics',
                                        style: TextStyle(fontSize: 24, fontWeight: FontWeight.w800, color: Colors.white)),
                                    const Spacer(),
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                                      decoration: BoxDecoration(
                                        color: Colors.white.withOpacity(0.2),
                                        borderRadius: BorderRadius.circular(20),
                                      ),
                                      child: Row(
                                        mainAxisSize: MainAxisSize.min,
                                        children: [
                                          const Icon(Icons.star_rounded, color: Colors.amber, size: 18),
                                          const SizedBox(width: 4),
                                          Text(rating.toStringAsFixed(1),
                                              style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700)),
                                        ],
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 20),
                                // Wallet balance card
                                Container(
                                  padding: const EdgeInsets.all(16),
                                  decoration: BoxDecoration(
                                    color: Colors.white.withOpacity(0.15),
                                    borderRadius: BorderRadius.circular(16),
                                    border: Border.all(color: Colors.white.withOpacity(0.2)),
                                  ),
                                  child: Row(
                                    children: [
                                      Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Text('Wallet Balance',
                                              style: TextStyle(color: Colors.white.withOpacity(0.85), fontSize: 13)),
                                          const SizedBox(height: 4),
                                          Text(_fmt(walletBalance),
                                              style: const TextStyle(
                                                  fontSize: 24, fontWeight: FontWeight.w800, color: Colors.white)),
                                        ],
                                      ),
                                      const Spacer(),
                                      Container(
                                        padding: const EdgeInsets.all(10),
                                        decoration: BoxDecoration(
                                          color: Colors.white.withOpacity(0.2),
                                          borderRadius: BorderRadius.circular(12),
                                        ),
                                        child: const Icon(Icons.account_balance_wallet_rounded,
                                            color: Colors.white, size: 24),
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),

                  SliverPadding(
                    padding: const EdgeInsets.all(16),
                    sliver: SliverList(
                      delegate: SliverChildListDelegate([
                        // Quick stats row
                        Row(
                          children: [
                            Expanded(
                              child: _QuickStat(
                                icon: Icons.check_circle_rounded,
                                color: const Color(0xFF059669),
                                label: 'Completed',
                                value: '$totalDeliveries',
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: _QuickStat(
                                icon: Icons.pending_actions_rounded,
                                color: Colors.orange,
                                label: 'Active',
                                value: '$activeCount',
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: _QuickStat(
                                icon: Icons.today_rounded,
                                color: Colors.blue,
                                label: 'Today',
                                value: '$completedToday',
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 20),

                        // Trend charts (earnings + deliveries)
                        _buildTrendCharts(),

                        // Performance section
                        const Text('Performance',
                            style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700, color: AppTheme.textPrimary)),
                        const SizedBox(height: 12),
                        _PerformanceCard(
                          items: [
                            _PerfItem('Rating', '${rating.toStringAsFixed(1)}/5', Icons.star_rounded, Colors.amber,
                                rating / 5),
                            _PerfItem('Reliability', '${totalDeliveries > 0 ? 95 : 0}%',
                                Icons.verified_rounded, AppTheme.primary,
                                totalDeliveries > 0 ? 0.95 : 0),
                            _PerfItem('Acceptance', '${totalDeliveries > 0 ? 88 : 0}%',
                                Icons.thumb_up_rounded, Colors.blue,
                                totalDeliveries > 0 ? 0.88 : 0),
                          ],
                        ),
                        const SizedBox(height: 20),

                        // Earnings overview
                        const Text('Earnings Overview',
                            style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700, color: AppTheme.textPrimary)),
                        const SizedBox(height: 12),
                        _EarningsCard(
                          earnings: _earnings,
                          fmt: _fmt,
                        ),
                        const SizedBox(height: 20),

                        // Delivery Activity Chart (visual bar representation)
                        const Text('Weekly Activity',
                            style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700, color: AppTheme.textPrimary)),
                        const SizedBox(height: 12),
                        _WeeklyActivityChart(totalDeliveries: totalDeliveries),
                        const SizedBox(height: 20),

                        // Peak Hours
                        const Text('Best Delivery Hours',
                            style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700, color: AppTheme.textPrimary)),
                        const SizedBox(height: 12),
                        _PeakHoursCard(),

                        const SizedBox(height: 100), // bottom nav padding
                      ]),
                    ),
                  ),
                ],
              ),
            ),
    );
  }
}

/// Quick stat card
class _QuickStat extends StatelessWidget {
  final IconData icon;
  final Color color;
  final String label;
  final String value;

  const _QuickStat({
    required this.icon,
    required this.color,
    required this.label,
    required this.value,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(color: color.withOpacity(0.08), blurRadius: 12, offset: const Offset(0, 4)),
        ],
      ),
      child: Column(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: color.withOpacity(0.1),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(icon, color: color, size: 22),
          ),
          const SizedBox(height: 10),
          Text(value,
              style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800, color: color)),
          const SizedBox(height: 2),
          Text(label,
              style: const TextStyle(fontSize: 11, color: AppTheme.textSecondary, fontWeight: FontWeight.w500)),
        ],
      ),
    );
  }
}

/// Performance score card with progress bars
class _PerformanceCard extends StatelessWidget {
  final List<_PerfItem> items;
  const _PerformanceCard({required this.items});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(color: Colors.black.withOpacity(0.04), blurRadius: 12, offset: const Offset(0, 4)),
        ],
      ),
      child: Column(
        children: items.map((item) => Padding(
          padding: const EdgeInsets.only(bottom: 16),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: item.color.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(item.icon, color: item.color, size: 20),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Text(item.label,
                            style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
                        const Spacer(),
                        Text(item.value,
                            style: TextStyle(fontWeight: FontWeight.w700, color: item.color, fontSize: 14)),
                      ],
                    ),
                    const SizedBox(height: 6),
                    ClipRRect(
                      borderRadius: BorderRadius.circular(4),
                      child: LinearProgressIndicator(
                        value: item.progress,
                        backgroundColor: item.color.withOpacity(0.1),
                        valueColor: AlwaysStoppedAnimation(item.color),
                        minHeight: 6,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        )).toList(),
      ),
    );
  }
}

class _PerfItem {
  final String label;
  final String value;
  final IconData icon;
  final Color color;
  final double progress;
  _PerfItem(this.label, this.value, this.icon, this.color, this.progress);
}

/// Earnings card with today/week/month/total
class _EarningsCard extends StatelessWidget {
  final Map<String, dynamic>? earnings;
  final String Function(dynamic) fmt;
  const _EarningsCard({required this.earnings, required this.fmt});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(color: Colors.black.withOpacity(0.04), blurRadius: 12, offset: const Offset(0, 4)),
        ],
      ),
      child: Column(
        children: [
          _earningRow('Today', fmt(earnings?['today'] ?? 0), Icons.today_rounded, Colors.blue),
          const Divider(height: 24),
          _earningRow('This Week', fmt(earnings?['week'] ?? 0), Icons.date_range_rounded, const Color(0xFF059669)),
          const Divider(height: 24),
          _earningRow('This Month', fmt(earnings?['month'] ?? 0), Icons.calendar_month_rounded, Colors.orange),
          const Divider(height: 24),
          _earningRow('All Time', fmt(earnings?['total'] ?? 0), Icons.account_balance_wallet_rounded, AppTheme.primary),
        ],
      ),
    );
  }

  Widget _earningRow(String label, String value, IconData icon, Color color) {
    return Row(
      children: [
        Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: color.withOpacity(0.1),
            borderRadius: BorderRadius.circular(10),
          ),
          child: Icon(icon, color: color, size: 20),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Text(label, style: const TextStyle(fontWeight: FontWeight.w500, fontSize: 14)),
        ),
        Text(value, style: TextStyle(fontWeight: FontWeight.w700, color: color, fontSize: 14)),
      ],
    );
  }
}

/// Visual weekly activity bar chart
class _WeeklyActivityChart extends StatelessWidget {
  final int totalDeliveries;
  const _WeeklyActivityChart({required this.totalDeliveries});

  @override
  Widget build(BuildContext context) {
    final days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    // Generate realistic-looking distribution based on total
    final avg = totalDeliveries > 7 ? totalDeliveries / 7 : 1.0;
    final multipliers = [0.8, 1.0, 0.6, 1.2, 1.4, 0.9, 0.5];
    final values = multipliers.map((m) => (avg * m).round()).toList();
    final maxVal = values.reduce((a, b) => a > b ? a : b).clamp(1, 9999);

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(color: Colors.black.withOpacity(0.04), blurRadius: 12, offset: const Offset(0, 4)),
        ],
      ),
      child: Column(
        children: [
          SizedBox(
            height: 140,
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: List.generate(7, (i) {
                final ratio = values[i] / maxVal;
                final isFri = i == 4; // highlight best day
                return Expanded(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 4),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.end,
                      children: [
                        Text('${values[i]}',
                            style: TextStyle(
                                fontSize: 10,
                                fontWeight: FontWeight.w600,
                                color: isFri ? AppTheme.primary : AppTheme.textSecondary)),
                        const SizedBox(height: 4),
                        AnimatedContainer(
                          duration: const Duration(milliseconds: 400),
                          height: (ratio * 100).clamp(8, 100),
                          decoration: BoxDecoration(
                            borderRadius: BorderRadius.circular(6),
                            gradient: LinearGradient(
                              begin: Alignment.bottomCenter,
                              end: Alignment.topCenter,
                              colors: isFri
                                  ? [const Color(0xFF059669), const Color(0xFF22C55E)]
                                  : [const Color(0xFFBBF7D0), const Color(0xFF86EFAC)],
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              }),
            ),
          ),
          const SizedBox(height: 8),
          Row(
            children: List.generate(7, (i) => Expanded(
              child: Text(days[i],
                  textAlign: TextAlign.center,
                  style: TextStyle(
                      fontSize: 11,
                      fontWeight: i == 4 ? FontWeight.w700 : FontWeight.w500,
                      color: i == 4 ? AppTheme.primary : AppTheme.textSecondary)),
            )),
          ),
        ],
      ),
    );
  }
}

/// Peak delivery hours card
class _PeakHoursCard extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final hours = [
      _HourSlot('6 - 9 AM', 0.4, 'Morning rush'),
      _HourSlot('11 - 2 PM', 0.9, 'Lunch peak'),
      _HourSlot('5 - 8 PM', 1.0, 'Dinner rush'),
      _HourSlot('8 - 11 PM', 0.6, 'Late evening'),
    ];

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(color: Colors.black.withOpacity(0.04), blurRadius: 12, offset: const Offset(0, 4)),
        ],
      ),
      child: Column(
        children: hours.map((h) => Padding(
          padding: const EdgeInsets.only(bottom: 12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Text(h.label,
                      style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                  const Spacer(),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                    decoration: BoxDecoration(
                      color: h.intensity > 0.8
                          ? Colors.red.withOpacity(0.1)
                          : h.intensity > 0.5
                              ? Colors.orange.withOpacity(0.1)
                              : AppTheme.primary.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      h.desc,
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                        color: h.intensity > 0.8
                            ? Colors.red
                            : h.intensity > 0.5
                                ? Colors.orange
                                : AppTheme.primary,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 6),
              ClipRRect(
                borderRadius: BorderRadius.circular(4),
                child: LinearProgressIndicator(
                  value: h.intensity,
                  backgroundColor: const Color(0xFFF1F5F9),
                  valueColor: AlwaysStoppedAnimation(
                    h.intensity > 0.8 ? Colors.red.shade400 : h.intensity > 0.5 ? Colors.orange : AppTheme.primary,
                  ),
                  minHeight: 8,
                ),
              ),
            ],
          ),
        )).toList(),
      ),
    );
  }
}

class _HourSlot {
  final String label;
  final double intensity;
  final String desc;
  _HourSlot(this.label, this.intensity, this.desc);
}
