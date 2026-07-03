import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../core/theme/app_theme.dart';
import '../../services/update_service.dart';
import '../../providers/delivery_provider.dart';
import '../../providers/auth_provider.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});
  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> with TickerProviderStateMixin {
  bool _hasError = false;

  late final AnimationController _pulseCtrl;
  late final Animation<double> _pulseAnim;
  late final AnimationController _radarCtrl;
  late final Animation<double> _radarAnim;

  @override
  void initState() {
    super.initState();
    _pulseCtrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1400),
    )..repeat(reverse: true);
    _pulseAnim = Tween<double>(begin: 0.5, end: 1.0)
        .animate(CurvedAnimation(parent: _pulseCtrl, curve: Curves.easeInOut));

    _radarCtrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 2200),
    )..repeat();
    _radarAnim = CurvedAnimation(parent: _radarCtrl, curve: Curves.easeOut);

    WidgetsBinding.instance.addPostFrameCallback((_) {
      _load();
      UpdateService.checkForUpdate(context);
    });
  }

  @override
  void dispose() {
    _pulseCtrl.dispose();
    _radarCtrl.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() => _hasError = false);
    try {
      await context.read<DeliveryProvider>().loadDeliveries();
    } catch (_) {
      if (mounted) setState(() => _hasError = true);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Consumer2<DeliveryProvider, AuthProvider>(
      builder: (context, delivery, auth, _) {
        final user = auth.user ?? {};
        final firstName =
            (user['firstName'] as String?)?.split(' ').first ?? 'Rider';
        return Scaffold(
          backgroundColor: AppTheme.background,
          body: RefreshIndicator(
            onRefresh: _load,
            color: AppTheme.primaryGreen,
            child: CustomScrollView(
              physics: const AlwaysScrollableScrollPhysics(),
              slivers: [
                // ── Gradient Header ──────────────────────────────────
                SliverToBoxAdapter(
                  child: _buildHeader(delivery, firstName),
                ),
                // ── Stats Row ────────────────────────────────────────
                SliverToBoxAdapter(
                  child: _buildStatsRow(delivery),
                ),
                // ── Body ─────────────────────────────────────────────
                if (_hasError)
                  SliverFillRemaining(
                    hasScrollBody: false,
                    child: _buildErrorState(),
                  )
                else if (delivery.loading)
                  SliverFillRemaining(
                    hasScrollBody: false,
                    child: _buildLoadingState(),
                  )
                else if (delivery.deliveries.isEmpty)
                  SliverFillRemaining(
                    hasScrollBody: false,
                    child: delivery.isOnline
                        ? _buildOnlineEmpty()
                        : _buildOfflineState(delivery),
                  )
                else ...[
                  SliverPadding(
                    padding: const EdgeInsets.fromLTRB(16, 8, 16, 4),
                    sliver: SliverToBoxAdapter(
                      child: Row(
                        children: [
                          const Text(
                            'Active Deliveries',
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w700,
                              color: AppTheme.textPrimary,
                            ),
                          ),
                          const SizedBox(width: 8),
                          Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 8, vertical: 2),
                            decoration: BoxDecoration(
                              color: AppTheme.primaryGreen.withOpacity(0.12),
                              borderRadius: BorderRadius.circular(20),
                            ),
                            child: Text(
                              '${delivery.deliveries.length}',
                              style: const TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w700,
                                color: AppTheme.primaryGreen,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  SliverPadding(
                    padding: const EdgeInsets.fromLTRB(16, 8, 16, 120),
                    sliver: SliverList(
                      delegate: SliverChildBuilderDelegate(
                        (context, i) => _DeliveryCard(
                          key: ValueKey(delivery.deliveries[i]['id']),
                          record: delivery.deliveries[i],
                          index: i,
                        ),
                        childCount: delivery.deliveries.length,
                      ),
                    ),
                  ),
                ],
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildHeader(DeliveryProvider delivery, String firstName) {
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
          padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Top row
              Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Hello, $firstName 👋',
                          style: const TextStyle(
                            fontSize: 22,
                            fontWeight: FontWeight.w800,
                            color: Colors.white,
                            letterSpacing: -0.5,
                          ),
                        ),
                        const SizedBox(height: 4),
                        AnimatedBuilder(
                          animation: _pulseAnim,
                          builder: (_, __) => Row(
                            children: [
                              Opacity(
                                opacity: delivery.isOnline
                                    ? _pulseAnim.value
                                    : 1.0,
                                child: Container(
                                  width: 8,
                                  height: 8,
                                  decoration: BoxDecoration(
                                    color: delivery.isOnline
                                        ? const Color(0xFF4ADE80)
                                        : Colors.white38,
                                    shape: BoxShape.circle,
                                  ),
                                ),
                              ),
                              const SizedBox(width: 6),
                              Text(
                                delivery.isOnline ? 'Online' : 'Offline',
                                style: TextStyle(
                                  fontSize: 13,
                                  color: delivery.isOnline
                                      ? const Color(0xFF4ADE80)
                                      : Colors.white54,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                  // Online toggle
                  GestureDetector(
                    onTap: () async => await delivery.toggleOnline(),
                    child: AnimatedContainer(
                      duration: const Duration(milliseconds: 300),
                      padding: const EdgeInsets.symmetric(
                          horizontal: 16, vertical: 10),
                      decoration: BoxDecoration(
                        color: delivery.isOnline
                            ? Colors.white.withOpacity(0.2)
                            : Colors.white.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(30),
                        border: Border.all(
                          color: delivery.isOnline
                              ? Colors.white.withOpacity(0.6)
                              : Colors.white.withOpacity(0.2),
                        ),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(
                            delivery.isOnline
                                ? Icons.wifi_tethering_rounded
                                : Icons.wifi_tethering_off_rounded,
                            color: Colors.white,
                            size: 16,
                          ),
                          const SizedBox(width: 6),
                          Text(
                            delivery.isOnline ? 'Go Offline' : 'Go Online',
                            style: const TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.w700,
                              fontSize: 13,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildStatsRow(DeliveryProvider delivery) {
    final active = delivery.deliveries
        .where((d) {
          final s = (d['status'] as String?) ?? '';
          return s == 'ASSIGNED' || s == 'PICKED_UP' || s == 'IN_TRANSIT';
        })
        .length;
    final delivered = delivery.deliveries
        .where((d) => (d['status'] as String?) == 'DELIVERED')
        .length;

    return Container(
      color: const Color(0xFF047857),
      child: Container(
        margin: const EdgeInsets.only(top: 1),
        decoration: BoxDecoration(
          color: AppTheme.background,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
        ),
        padding: const EdgeInsets.fromLTRB(16, 20, 16, 8),
        child: Row(
          children: [
            _StatCard(
              label: 'Active',
              value: '$active',
              icon: Icons.local_shipping_rounded,
              color: AppTheme.infoBlue,
            ),
            const SizedBox(width: 12),
            _StatCard(
              label: 'Delivered',
              value: '$delivered',
              icon: Icons.check_circle_rounded,
              color: AppTheme.successGreen,
            ),
            const SizedBox(width: 12),
            _StatCard(
              label: 'Total',
              value: '${delivery.deliveries.length}',
              icon: Icons.inventory_2_rounded,
              color: AppTheme.warningAmber,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildLoadingState() {
    return const Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          CircularProgressIndicator(color: AppTheme.primaryGreen),
          SizedBox(height: 16),
          Text('Loading deliveries…',
              style: TextStyle(
                  color: AppTheme.textSecondary, fontSize: 14)),
        ],
      ),
    );
  }

  Widget _buildErrorState() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 80,
              height: 80,
              decoration: BoxDecoration(
                color: AppTheme.dangerRed.withOpacity(0.1),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.cloud_off_rounded,
                  size: 40, color: AppTheme.dangerRed),
            ),
            const SizedBox(height: 20),
            const Text(
              'Connection Failed',
              style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w700,
                  color: AppTheme.textPrimary),
            ),
            const SizedBox(height: 8),
            const Text(
              'Check your internet and try again',
              style: TextStyle(
                  fontSize: 14,
                  color: AppTheme.textSecondary,
                  height: 1.5),
            ),
            const SizedBox(height: 28),
            FilledButton.icon(
              onPressed: _load,
              icon: const Icon(Icons.refresh_rounded, size: 18),
              label: const Text('Retry'),
              style: FilledButton.styleFrom(
                  backgroundColor: AppTheme.primaryGreen,
                  minimumSize: const Size(160, 48)),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildOfflineState(DeliveryProvider delivery) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 100,
              height: 100,
              decoration: BoxDecoration(
                color: AppTheme.textTertiary.withOpacity(0.1),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.delivery_dining_rounded,
                  size: 52, color: AppTheme.textTertiary),
            ),
            const SizedBox(height: 24),
            const Text(
              "You're Offline",
              style: TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.w800,
                color: AppTheme.textPrimary,
                letterSpacing: -0.5,
              ),
            ),
            const SizedBox(height: 12),
            const Text(
              'Tap the button to start\nreceiving orders',
              textAlign: TextAlign.center,
              style: TextStyle(
                  fontSize: 15,
                  color: AppTheme.textSecondary,
                  height: 1.6),
            ),
            const SizedBox(height: 36),
            GestureDetector(
              onTap: () async => await delivery.toggleOnline(),
              child: Container(
                padding: const EdgeInsets.symmetric(
                    horizontal: 32, vertical: 14),
                decoration: BoxDecoration(
                  color: AppTheme.primaryGreen,
                  borderRadius: BorderRadius.circular(30),
                  boxShadow: [
                    BoxShadow(
                      color: AppTheme.primaryGreen.withOpacity(0.35),
                      blurRadius: 20,
                      offset: const Offset(0, 8),
                    ),
                  ],
                ),
                child: const Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.power_settings_new_rounded,
                        color: Colors.white, size: 20),
                    SizedBox(width: 10),
                    Text(
                      'Go Online',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 16,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildOnlineEmpty() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            AnimatedBuilder(
              animation: _radarAnim,
              builder: (_, __) => SizedBox(
                width: 130,
                height: 130,
                child: CustomPaint(painter: _RadarPainter(_radarAnim.value)),
              ),
            ),
            const SizedBox(height: 28),
            const Text(
              'Looking for Orders…',
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.w700,
                color: AppTheme.textPrimary,
                letterSpacing: -0.3,
              ),
            ),
            const SizedBox(height: 10),
            const Text(
              'Stay online to receive delivery\nrequests in your area',
              textAlign: TextAlign.center,
              style: TextStyle(
                  fontSize: 14,
                  color: AppTheme.textSecondary,
                  height: 1.6),
            ),
          ],
        ),
      ),
    );
  }
}

// ── Radar Painter ──────────────────────────────────────────────────────────
class _RadarPainter extends CustomPainter {
  final double progress;
  const _RadarPainter(this.progress);

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final maxR = size.width / 2;
    for (int i = 0; i < 3; i++) {
      final p = (progress + i / 3) % 1.0;
      final r = maxR * p;
      final op = (1.0 - p) * 0.55;
      canvas.drawCircle(
        center,
        r,
        Paint()
          ..color = AppTheme.primaryGreen.withOpacity(op)
          ..style = PaintingStyle.stroke
          ..strokeWidth = 2,
      );
    }
    canvas.drawCircle(center, 14,
        Paint()..color = AppTheme.primaryGreen..style = PaintingStyle.fill);
    canvas.drawCircle(center, 7,
        Paint()..color = Colors.white..style = PaintingStyle.fill);
  }

  @override
  bool shouldRepaint(_RadarPainter old) => old.progress != progress;
}

// ── Stat Card ──────────────────────────────────────────────────────────────
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
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 12),
        decoration: BoxDecoration(
          color: AppTheme.surface,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: AppTheme.divider),
          boxShadow: AppTheme.cardShadow,
        ),
        child: Column(
          children: [
            Icon(icon, color: color, size: 22),
            const SizedBox(height: 6),
            Text(
              value,
              style: TextStyle(
                  fontSize: 22,
                  fontWeight: FontWeight.w800,
                  color: color,
                  height: 1),
            ),
            const SizedBox(height: 4),
            Text(
              label,
              style: const TextStyle(
                  fontSize: 11,
                  color: AppTheme.textTertiary,
                  fontWeight: FontWeight.w600),
            ),
          ],
        ),
      ),
    );
  }
}

// ── Delivery Card ──────────────────────────────────────────────────────────
class _DeliveryCard extends StatefulWidget {
  final Map<String, dynamic> record;
  final int index;
  const _DeliveryCard({super.key, required this.record, required this.index});
  @override
  State<_DeliveryCard> createState() => _DeliveryCardState();
}

class _DeliveryCardState extends State<_DeliveryCard>
    with SingleTickerProviderStateMixin {
  late final AnimationController _ctrl;
  late final Animation<double> _fade;
  late final Animation<Offset> _slide;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(
        vsync: this, duration: const Duration(milliseconds: 380));
    _fade = CurvedAnimation(parent: _ctrl, curve: Curves.easeOut);
    _slide = Tween<Offset>(begin: const Offset(0, 0.1), end: Offset.zero)
        .animate(CurvedAnimation(parent: _ctrl, curve: Curves.easeOut));
    Future.delayed(Duration(milliseconds: widget.index * 60),
        () { if (mounted) _ctrl.forward(); });
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  String _fmt(double n) =>
      'UGX ${n.toStringAsFixed(0).replaceAllMapped(RegExp(r'(\d)(?=(\d{3})+(?!\d))'), (m) => '${m[1]},')}';

  @override
  Widget build(BuildContext context) {
    final rec = widget.record;
    final order = (rec['order'] as Map<String, dynamic>?) ?? {};
    final status = (rec['status'] as String?) ?? 'ASSIGNED';
    final fee = double.tryParse(order['shippingFee']?.toString() ?? '0') ?? 0;
    final total = double.tryParse(order['total']?.toString() ?? '0') ?? 0;
    final isCod = order['paymentMethod'] == 'CASH_ON_DELIVERY';
    final addr = order['address'] as Map<String, dynamic>?;
    final buyer = order['buyer'] as Map<String, dynamic>?;
    final deliveryId = rec['id'] ?? '';
    final id = deliveryId.toString();
    final orderNum = order['orderNumber'] ??
        '#${id.length >= 8 ? id.substring(0, 8) : id}';
    final addrLine = [
      addr?['city'] ?? '',
      addr?['addressLine1'] ?? '',
    ].where((s) => (s as String).isNotEmpty).join(', ');

    final sc = AppTheme.statusColor(status);
    final sl = AppTheme.statusLabel(status);

    return FadeTransition(
      opacity: _fade,
      child: SlideTransition(
        position: _slide,
        child: Padding(
          padding: const EdgeInsets.only(bottom: 12),
          child: Material(
            color: AppTheme.surface,
            borderRadius: BorderRadius.circular(16),
            clipBehavior: Clip.antiAlias,
            child: InkWell(
              onTap: () => context.push('/deliveries/$deliveryId'),
              child: Container(
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: AppTheme.divider),
                  boxShadow: AppTheme.cardShadow,
                ),
                child: Column(
                  children: [
                    Padding(
                      padding: const EdgeInsets.fromLTRB(14, 14, 14, 10),
                      child: Row(
                        children: [
                          Container(
                            width: 50,
                            height: 50,
                            decoration: BoxDecoration(
                              color: sc.withOpacity(0.1),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Icon(Icons.delivery_dining_rounded,
                                color: sc, size: 28),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(orderNum,
                                    style: const TextStyle(
                                        fontSize: 15,
                                        fontWeight: FontWeight.w700,
                                        color: AppTheme.textPrimary,
                                        letterSpacing: -0.2)),
                                if ((buyer?['firstName'] as String?)
                                        ?.isNotEmpty ==
                                    true) ...[
                                  const SizedBox(height: 2),
                                  Row(
                                    children: [
                                      const Icon(Icons.person_outline_rounded,
                                          size: 12,
                                          color: AppTheme.textTertiary),
                                      const SizedBox(width: 4),
                                      Text(
                                        buyer!['firstName'] as String,
                                        style: const TextStyle(
                                            fontSize: 12,
                                            color: AppTheme.textTertiary),
                                      ),
                                    ],
                                  ),
                                ],
                                if (addrLine.isNotEmpty) ...[
                                  const SizedBox(height: 2),
                                  Row(
                                    children: [
                                      const Icon(
                                          Icons.location_on_outlined,
                                          size: 12,
                                          color: AppTheme.textTertiary),
                                      const SizedBox(width: 4),
                                      Expanded(
                                        child: Text(
                                          addrLine,
                                          style: const TextStyle(
                                              fontSize: 12,
                                              color:
                                                  AppTheme.textSecondary),
                                          maxLines: 1,
                                          overflow: TextOverflow.ellipsis,
                                        ),
                                      ),
                                    ],
                                  ),
                                ],
                              ],
                            ),
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 10, vertical: 5),
                            decoration: BoxDecoration(
                              color: sc.withOpacity(0.1),
                              borderRadius: BorderRadius.circular(20),
                              border: Border.all(
                                  color: sc.withOpacity(0.3)),
                            ),
                            child: Text(
                              sl,
                              style: TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w700,
                                  color: sc),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const Divider(height: 1, indent: 14, endIndent: 14),
                    Padding(
                      padding: const EdgeInsets.fromLTRB(14, 10, 14, 14),
                      child: Row(
                        children: [
                          _Chip(
                            icon: Icons.payments_rounded,
                            label: _fmt(fee),
                            color: AppTheme.successGreen,
                          ),
                          if (isCod) ...[
                            const SizedBox(width: 8),
                            _Chip(
                              icon: Icons.money_rounded,
                              label: 'COD ${_fmt(total)}',
                              color: AppTheme.warningAmber,
                            ),
                          ],
                          const Spacer(),
                          const Text('VIEW ',
                              style: TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.w700,
                                  color: AppTheme.primaryGreen,
                                  letterSpacing: 0.5)),
                          const Icon(Icons.arrow_forward_rounded,
                              size: 16, color: AppTheme.primaryGreen),
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
    );
  }
}

class _Chip extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;
  const _Chip(
      {required this.icon, required this.label, required this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 13, color: color),
          const SizedBox(width: 4),
          Text(label,
              style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w700,
                  color: color)),
        ],
      ),
    );
  }
}
