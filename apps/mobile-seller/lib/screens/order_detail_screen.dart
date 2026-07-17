import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../core/theme.dart';
import '../providers/orders_provider.dart';
import '../core/money.dart';
import '../core/api_service.dart';

class OrderDetailScreen extends StatefulWidget {
  final String orderId;
  const OrderDetailScreen({super.key, required this.orderId});
  @override
  State<OrderDetailScreen> createState() => _OrderDetailScreenState();
}

class _OrderDetailScreenState extends State<OrderDetailScreen> {
  Map<String, dynamic>? _order;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _fetch();
  }

  Future<void> _fetch() async {
    setState(() => _loading = true);
    _order = await context.read<OrdersProvider>().getOrder(widget.orderId);
    if (mounted) setState(() => _loading = false);
  }

  String? _nextStatus(String current) {
    switch (current) {
      case 'PENDING':
        return 'PROCESSING';
      case 'PROCESSING':
        return 'SHIPPED';
      case 'SHIPPED':
        return 'DELIVERED';
      default:
        return null;
    }
  }

  String _actionLabel(String next) {
    switch (next) {
      case 'PROCESSING':
        return 'Confirm Order';
      case 'SHIPPED':
        return 'Mark Shipped';
      case 'DELIVERED':
        return 'Mark Delivered';
      default:
        return 'Update';
    }
  }

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

  bool _assigning = false;

  Future<void> _showNearbyRiders() async {
    setState(() => _assigning = true);
    List<dynamic> riders = [];
    try {
      final res = await ApiService().dio
          .get('/delivery/orders/${widget.orderId}/nearby-riders');
      final data = ApiService().extractData(res);
      riders = (data is Map ? data['riders'] : data) as List? ?? [];
    } catch (_) {}
    if (!mounted) return;
    setState(() => _assigning = false);

    if (riders.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
          content: Text('No online riders nearby right now — try again shortly')));
      return;
    }

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) => DraggableScrollableSheet(
        expand: false,
        initialChildSize: 0.6,
        maxChildSize: 0.9,
        builder: (ctx, scroll) => Column(
          children: [
            const SizedBox(height: 12),
            Container(
                width: 40, height: 4,
                decoration: BoxDecoration(
                    color: Colors.grey.shade300,
                    borderRadius: BorderRadius.circular(2))),
            const Padding(
              padding: EdgeInsets.all(16),
              child: Text('Nearby riders',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            ),
            Expanded(
              child: ListView.separated(
                controller: scroll,
                itemCount: riders.length,
                separatorBuilder: (_, __) => const Divider(height: 1),
                itemBuilder: (_, i) {
                  final r = riders[i] as Map<String, dynamic>;
                  final dist = r['distanceKm'];
                  final verified = r['isVerified'] == true;
                  return ListTile(
                    leading: CircleAvatar(
                      backgroundColor: AppTheme.primary.withValues(alpha: 0.1),
                      backgroundImage: (r['avatar'] != null &&
                              (r['avatar'] as String).isNotEmpty)
                          ? NetworkImage(r['avatar'])
                          : null,
                      child: (r['avatar'] == null ||
                              (r['avatar'] as String).isEmpty)
                          ? const Icon(Icons.two_wheeler_rounded,
                              color: AppTheme.primary)
                          : null,
                    ),
                    title: Row(children: [
                      Flexible(child: Text(r['name']?.toString() ?? 'Rider')),
                      if (verified) ...[
                        const SizedBox(width: 4),
                        const Icon(Icons.verified_rounded,
                            size: 14, color: Colors.amber),
                      ],
                    ]),
                    subtitle: Text([
                      if (dist != null) '$dist km away',
                      if (r['vehicleType'] != null) r['vehicleType'],
                      '${r['activeJobs'] ?? 0} active',
                    ].join(' · ')),
                    trailing: FilledButton(
                      onPressed: () async {
                        Navigator.pop(ctx);
                        await _assignRider(r['id'] as String);
                      },
                      child: const Text('Assign'),
                    ),
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _assignRider(String riderId) async {
    setState(() => _assigning = true);
    try {
      await ApiService().dio.post(
          '/delivery/orders/${widget.orderId}/seller-assign',
          data: {'riderId': riderId});
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
          content: Text('Rider assigned — they have been notified'),
          backgroundColor: AppTheme.success));
      await context.read<OrdersProvider>().load();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text(ApiService().errorMessage(e).isNotEmpty
              ? ApiService().errorMessage(e)
              : 'Failed to assign rider')));
    }
    if (mounted) setState(() => _assigning = false);
  }

  Future<void> _updateStatus(String newStatus) async {
    final ok = await context
        .read<OrdersProvider>()
        .updateStatus(widget.orderId, newStatus);
    if (ok && mounted) {
      await _fetch();
      ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Order updated to $newStatus')));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Order Details')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _order == null
              ? const Center(child: Text('Order not found'))
              : RefreshIndicator(
                  onRefresh: _fetch,
                  child: _buildBody(),
                ),
    );
  }

  Widget _buildBody() {
    final o = _order!;
    final status = o['status'] as String? ?? 'PENDING';
    final total = o['total'] ?? o['totalAmount'] ?? 0;
    final id = o['id']?.toString() ?? '';
    final shortId = id.length >= 8 ? id.substring(0, 8) : id;
    final buyer = o['user'];
    final items = o['items'] as List? ?? [];
    final address = o['shippingAddress'] ?? o['address'];
    final date = o['createdAt'] != null
        ? DateFormat('MMM d, y · h:mm a')
            .format(DateTime.parse(o['createdAt']))
        : '';
    final next = _nextStatus(status);

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        // Header
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text('Order #$shortId',
                        style: const TextStyle(
                            fontWeight: FontWeight.bold, fontSize: 18)),
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 12, vertical: 5),
                      decoration: BoxDecoration(
                        color: _statusColor(status).withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(status,
                          style: TextStyle(
                              color: _statusColor(status),
                              fontWeight: FontWeight.w600,
                              fontSize: 13)),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Text(date,
                    style: const TextStyle(
                        color: AppTheme.textSecondary, fontSize: 13)),
              ],
            ),
          ),
        ),
        const SizedBox(height: 12),
        // Customer info
        if (buyer != null)
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Customer',
                      style: TextStyle(
                          fontWeight: FontWeight.w600, fontSize: 14)),
                  const SizedBox(height: 8),
                  _InfoRow(
                      icon: Icons.person_outline,
                      text:
                          '${buyer['firstName'] ?? ''} ${buyer['lastName'] ?? ''}'),
                  if (buyer['email'] != null)
                    _InfoRow(
                        icon: Icons.email_outlined,
                        text: buyer['email'] as String),
                  if (buyer['phone'] != null)
                    _InfoRow(
                        icon: Icons.phone_outlined,
                        text: buyer['phone'] as String),
                ],
              ),
            ),
          ),
        const SizedBox(height: 12),
        // Address
        if (address != null)
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Shipping Address',
                      style: TextStyle(
                          fontWeight: FontWeight.w600, fontSize: 14)),
                  const SizedBox(height: 8),
                  Text(
                    address is String ? address : _formatAddress(address),
                    style: const TextStyle(
                        color: AppTheme.textSecondary, fontSize: 13),
                  ),
                ],
              ),
            ),
          ),
        const SizedBox(height: 12),
        // Items
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Items (${items.length})',
                    style: const TextStyle(
                        fontWeight: FontWeight.w600, fontSize: 14)),
                const SizedBox(height: 8),
                ...items.map((item) {
                  final name =
                      item['product']?['name'] ?? item['name'] ?? 'Item';
                  final qty = item['quantity'] ?? 1;
                  final price = item['price'] ?? 0;
                  return Padding(
                    padding: const EdgeInsets.symmetric(vertical: 6),
                    child: Row(
                      children: [
                        Expanded(
                            child: Text(name,
                                style: const TextStyle(fontSize: 14))),
                        Text('x$qty',
                            style: const TextStyle(
                                color: AppTheme.textSecondary, fontSize: 13)),
                        const SizedBox(width: 12),
                        Text(Money.fmt(price),
                            style: const TextStyle(
                                fontWeight: FontWeight.w600, fontSize: 14)),
                      ],
                    ),
                  );
                }),
                const Divider(height: 20),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('Total',
                        style: TextStyle(
                            fontWeight: FontWeight.w600, fontSize: 16)),
                    Text(Money.fmt(total),
                        style: const TextStyle(
                            fontWeight: FontWeight.bold,
                            fontSize: 18,
                            color: AppTheme.primary)),
                  ],
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 20),
        // Action buttons
        if (next != null)
          SizedBox(
            height: 52,
            child: ElevatedButton(
              onPressed: () => _updateStatus(next),
              child: Text(_actionLabel(next)),
            ),
          ),
        if (['CONFIRMED', 'PROCESSING', 'SHIPPED'].contains(status)) ...[
          const SizedBox(height: 12),
          SizedBox(
            height: 52,
            child: OutlinedButton.icon(
              onPressed: _assigning ? null : _showNearbyRiders,
              icon: _assigning
                  ? const SizedBox(
                      width: 18, height: 18,
                      child: CircularProgressIndicator(strokeWidth: 2))
                  : const Icon(Icons.two_wheeler_rounded),
              label: const Text('Assign a nearby rider'),
              style: OutlinedButton.styleFrom(
                foregroundColor: AppTheme.primary,
                side: const BorderSide(color: AppTheme.primary),
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12)),
              ),
            ),
          ),
        ],
        if (status == 'PENDING') ...[
          const SizedBox(height: 12),
          SizedBox(
            height: 52,
            child: OutlinedButton(
              onPressed: () => _updateStatus('CANCELLED'),
              style: OutlinedButton.styleFrom(
                foregroundColor: AppTheme.error,
                side: const BorderSide(color: AppTheme.error),
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12)),
              ),
              child: const Text('Cancel Order'),
            ),
          ),
        ],
      ],
    );
  }

  String _formatAddress(dynamic addr) {
    if (addr is Map) {
      final parts = [
        addr['street'],
        addr['city'],
        addr['state'],
        addr['zipCode'] ?? addr['postalCode']
      ].where((e) => e != null && e.toString().isNotEmpty);
      return parts.join(', ');
    }
    return addr.toString();
  }
}

class _InfoRow extends StatelessWidget {
  final IconData icon;
  final String text;
  const _InfoRow({required this.icon, required this.text});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 3),
      child: Row(
        children: [
          Icon(icon, size: 16, color: AppTheme.textSecondary),
          const SizedBox(width: 8),
          Text(text,
              style:
                  const TextStyle(color: AppTheme.textSecondary, fontSize: 13)),
        ],
      ),
    );
  }
}
