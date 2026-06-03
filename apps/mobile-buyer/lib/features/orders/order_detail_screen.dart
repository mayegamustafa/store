import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/theme.dart';
import '../../core/utils/helpers.dart';
import '../../core/models/order.dart';
import 'orders_provider.dart';

class OrderDetailScreen extends StatefulWidget {
  final String orderId;
  const OrderDetailScreen({super.key, required this.orderId});

  @override
  State<OrderDetailScreen> createState() => _OrderDetailScreenState();
}

class _OrderDetailScreenState extends State<OrderDetailScreen> {
  Order? _order;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final order = await context.read<OrdersProvider>().fetchOrderDetail(widget.orderId);
    if (mounted) setState(() { _order = order; _loading = false; });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.backgroundColor,
      appBar: AppBar(title: Text(_order != null ? '#${_order!.orderNumber}' : 'Order Details')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _order == null
              ? const Center(child: Text('Order not found'))
              : RefreshIndicator(onRefresh: _load, child: _buildBody()),
    );
  }

  Widget _buildBody() {
    final order = _order!;
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        _buildStatusCard(order),
        const SizedBox(height: 16),
        _buildTimeline(order),
        const SizedBox(height: 16),
        _buildItemsList(order),
        const SizedBox(height: 16),
        _buildSummary(order),
        if (order.delivery != null || ['SHIPPED', 'OUT_FOR_DELIVERY'].contains(order.status)) ...[
          const SizedBox(height: 16),
          _buildTrackButton(order),
        ],
        if (order.address != null) ...[
          const SizedBox(height: 16),
          _buildAddress(order),
        ],
        if (order.status == 'PENDING') ...[
          const SizedBox(height: 24),
          _buildCancelButton(order),
        ],
        const SizedBox(height: 32),
      ],
    );
  }

  Widget _buildStatusCard(Order order) {
    final color = _statusColor(order.status);
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [AppTheme.cardShadow],
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(14),
            ),
            child: Icon(_statusIcon(order.status), size: 28, color: color),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(getOrderStatusLabel(order.status),
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700, color: color)),
                const SizedBox(height: 4),
                Text(formatDateTime(order.createdAt),
                    style: TextStyle(fontSize: 13, color: AppTheme.textSecondary)),
              ],
            ),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(formatCurrency(order.total), style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
              const SizedBox(height: 4),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                decoration: BoxDecoration(
                  color: order.paymentStatus == 'COMPLETED'
                      ? AppTheme.successColor.withValues(alpha: 0.1)
                      : AppTheme.warningColor.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(
                  getPaymentStatusLabel(order.paymentStatus),
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                    color: order.paymentStatus == 'COMPLETED' ? AppTheme.successColor : AppTheme.warningColor,
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildTimeline(Order order) {
    final steps = [
      {'key': 'PENDING', 'label': 'Order Placed', 'icon': Icons.receipt_rounded},
      {'key': 'PROCESSING', 'label': 'Processing', 'icon': Icons.sync_rounded},
      {'key': 'SHIPPED', 'label': 'Shipped', 'icon': Icons.local_shipping_rounded},
      {'key': 'OUT_FOR_DELIVERY', 'label': 'Out for Delivery', 'icon': Icons.delivery_dining_rounded},
      {'key': 'DELIVERED', 'label': 'Delivered', 'icon': Icons.check_circle_rounded},
    ];

    final statusOrder = steps.map((s) => s['key'] as String).toList();
    final currentIdx = statusOrder.indexOf(order.status);

    // Don't show timeline for cancelled
    if (order.status == 'CANCELLED' || order.status == 'RETURNED' || order.status == 'REFUNDED') {
      return const SizedBox.shrink();
    }

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [AppTheme.cardShadow],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Order Progress', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
          const SizedBox(height: 16),
          ...List.generate(steps.length, (i) {
            final done = i <= currentIdx;
            final isLast = i == steps.length - 1;
            final color = done ? AppTheme.primaryColor : AppTheme.textTertiary.withValues(alpha: 0.4);
            return Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Column(
                  children: [
                    Container(
                      width: 32,
                      height: 32,
                      decoration: BoxDecoration(
                        color: done ? AppTheme.primaryColor.withValues(alpha: 0.1) : AppTheme.surfaceColor,
                        shape: BoxShape.circle,
                      ),
                      child: Icon(steps[i]['icon'] as IconData, size: 16, color: color),
                    ),
                    if (!isLast)
                      Container(
                        width: 2,
                        height: 24,
                        color: i < currentIdx ? AppTheme.primaryColor.withValues(alpha: 0.3) : AppTheme.dividerColor,
                      ),
                  ],
                ),
                const SizedBox(width: 12),
                Padding(
                  padding: const EdgeInsets.only(top: 6),
                  child: Text(
                    steps[i]['label'] as String,
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: done ? FontWeight.w600 : FontWeight.w400,
                      color: done ? AppTheme.textPrimary : AppTheme.textTertiary,
                    ),
                  ),
                ),
              ],
            );
          }),
        ],
      ),
    );
  }

  Widget _buildItemsList(Order order) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [AppTheme.cardShadow],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Items (${order.items.length})', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
          const SizedBox(height: 12),
          ...order.items.map((item) => Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: Row(
                  children: [
                    Container(
                      width: 56,
                      height: 56,
                      decoration: BoxDecoration(
                        color: AppTheme.surfaceColor,
                        borderRadius: BorderRadius.circular(12),
                        image: item.productImage != null
                            ? DecorationImage(
                                image: NetworkImage(resolveImageUrl(item.productImage)),
                                fit: BoxFit.cover,
                              )
                            : null,
                      ),
                      child: item.productImage == null
                          ? const Icon(Icons.image_outlined, color: AppTheme.textTertiary)
                          : null,
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(item.productName,
                              style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis),
                          if (item.variantName != null)
                            Text(item.variantName!,
                                style: TextStyle(fontSize: 12, color: AppTheme.textSecondary)),
                          const SizedBox(height: 4),
                          Text('${formatCurrency(item.price)} × ${item.quantity}',
                              style: TextStyle(fontSize: 13, color: AppTheme.textSecondary)),
                        ],
                      ),
                    ),
                    Text(formatCurrency(item.subtotal),
                        style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
                  ],
                ),
              )),
        ],
      ),
    );
  }

  Widget _buildSummary(Order order) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [AppTheme.cardShadow],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Order Summary', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
          const SizedBox(height: 12),
          _summaryRow('Subtotal', formatCurrency(order.subtotal)),
          _summaryRow('Shipping', order.shippingFee > 0 ? formatCurrency(order.shippingFee) : 'Free'),
          if (order.discount > 0) _summaryRow('Discount', '- ${formatCurrency(order.discount)}'),
          if (order.tax > 0) _summaryRow('Tax', formatCurrency(order.tax)),
          const Padding(padding: EdgeInsets.symmetric(vertical: 8), child: Divider()),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text('Total', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
              Text(formatCurrency(order.total), style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
            ],
          ),
        ],
      ),
    );
  }

  Widget _summaryRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: TextStyle(fontSize: 14, color: AppTheme.textSecondary)),
          Text(value, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w500)),
        ],
      ),
    );
  }

  Widget _buildAddress(Order order) {
    final addr = order.address!;
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [AppTheme.cardShadow],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Delivery Address', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
          const SizedBox(height: 12),
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: AppTheme.primaryColor.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(Icons.location_on_rounded, size: 20, color: AppTheme.primaryColor),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (addr.fullName != null)
                      Text(addr.fullName!, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
                    Text(addr.formatted, style: TextStyle(fontSize: 13, color: AppTheme.textSecondary)),
                    if (addr.phone != null)
                      Text(addr.phone!, style: TextStyle(fontSize: 13, color: AppTheme.textSecondary)),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildCancelButton(Order order) {
    return SizedBox(
      width: double.infinity,
      child: OutlinedButton.icon(
        onPressed: () => _showCancelDialog(order),
        icon: const Icon(Icons.cancel_outlined),
        label: const Text('Cancel Order'),
        style: OutlinedButton.styleFrom(
          foregroundColor: AppTheme.errorColor,
          side: BorderSide(color: AppTheme.errorColor.withValues(alpha: 0.4)),
          padding: const EdgeInsets.symmetric(vertical: 14),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
        ),
      ),
    );
  }

  void _showCancelDialog(Order order) {
    final controller = TextEditingController();
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Cancel Order'),
        content: TextField(
          controller: controller,
          decoration: const InputDecoration(
            hintText: 'Reason for cancellation',
            border: OutlineInputBorder(),
          ),
          maxLines: 3,
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Back')),
          FilledButton(
            onPressed: () async {
              Navigator.pop(ctx);
              final success = await context
                  .read<OrdersProvider>()
                  .cancelOrder(order.id, controller.text);
              if (success && mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Order cancelled')),
                );
                _load();
              }
            },
            style: FilledButton.styleFrom(backgroundColor: AppTheme.errorColor),
            child: const Text('Cancel Order'),
          ),
        ],
      ),
    );
  }

  Widget _buildTrackButton(Order order) {
    return SizedBox(
      width: double.infinity,
      child: FilledButton.icon(
        onPressed: () => Navigator.pushNamed(context, '/order/${order.id}/track'),
        icon: const Icon(Icons.map_rounded),
        label: const Text('Track Delivery'),
        style: FilledButton.styleFrom(
          backgroundColor: AppTheme.primaryColor,
          padding: const EdgeInsets.symmetric(vertical: 14),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
        ),
      ),
    );
  }

  Color _statusColor(String status) {
    switch (status) {
      case 'DELIVERED': return AppTheme.successColor;
      case 'CANCELLED':
      case 'RETURNED':
      case 'REFUNDED': return AppTheme.errorColor;
      case 'SHIPPED':
      case 'OUT_FOR_DELIVERY': return AppTheme.primaryColor;
      default: return AppTheme.warningColor;
    }
  }

  IconData _statusIcon(String status) {
    switch (status) {
      case 'DELIVERED': return Icons.check_circle_rounded;
      case 'CANCELLED': return Icons.cancel_rounded;
      case 'SHIPPED': return Icons.local_shipping_rounded;
      case 'OUT_FOR_DELIVERY': return Icons.delivery_dining_rounded;
      case 'PROCESSING': return Icons.sync_rounded;
      default: return Icons.schedule_rounded;
    }
  }
}
