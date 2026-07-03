import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../core/theme.dart';
import '../providers/orders_provider.dart';
import '../core/money.dart';

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
