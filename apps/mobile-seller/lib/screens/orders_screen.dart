import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../core/theme.dart';
import '../providers/orders_provider.dart';
import '../core/money.dart';

class OrdersScreen extends StatefulWidget {
  const OrdersScreen({super.key});
  @override
  State<OrdersScreen> createState() => _OrdersScreenState();
}

class _OrdersScreenState extends State<OrdersScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabCtrl;
  final _tabs = ['', 'PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED'];
  final _labels = ['All', 'Pending', 'Processing', 'Shipped', 'Delivered'];

  @override
  void initState() {
    super.initState();
    _tabCtrl = TabController(length: _tabs.length, vsync: this)
      ..addListener(() {
        if (!_tabCtrl.indexIsChanging) {
          context.read<OrdersProvider>().load(status: _tabs[_tabCtrl.index]);
        }
      });
    context.read<OrdersProvider>().load();
  }

  @override
  void dispose() {
    _tabCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<OrdersProvider>();

    return Scaffold(
      appBar: AppBar(
        title: const Text('Orders'),
        bottom: TabBar(
          controller: _tabCtrl,
          isScrollable: true,
          tabAlignment: TabAlignment.start,
          labelColor: AppTheme.primary,
          unselectedLabelColor: AppTheme.textSecondary,
          indicatorColor: AppTheme.primary,
          tabs: _labels.map((l) => Tab(text: l)).toList(),
        ),
      ),
      body: RefreshIndicator(
        onRefresh: () =>
            provider.load(status: _tabs[_tabCtrl.index]),
        child: provider.loading && provider.orders.isEmpty
            ? const Center(child: CircularProgressIndicator())
            : provider.orders.isEmpty
                ? Center(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.receipt_long_outlined,
                            size: 64, color: Colors.grey.shade300),
                        const SizedBox(height: 16),
                        const Text('No orders found',
                            style: TextStyle(color: AppTheme.textSecondary)),
                      ],
                    ),
                  )
                : ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: provider.orders.length,
                    itemBuilder: (_, i) =>
                        _OrderCard(order: provider.orders[i]),
                  ),
      ),
    );
  }
}

class _OrderCard extends StatelessWidget {
  final dynamic order;
  const _OrderCard({required this.order});

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
    final id = order['id']?.toString() ?? '';
    final shortId = id.length >= 8 ? id.substring(0, 8) : id;
    final buyer = order['user']?['firstName'] ?? 'Customer';
    final items = order['items'] as List? ?? [];
    final itemCount = items.length;
    final date = order['createdAt'] != null
        ? DateFormat('MMM d, y · h:mm a')
            .format(DateTime.parse(order['createdAt']))
        : '';

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: InkWell(
        onTap: () => context.push('/orders/$id'),
        borderRadius: BorderRadius.circular(16),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text('#$shortId',
                      style: const TextStyle(
                          fontWeight: FontWeight.w600, fontSize: 15)),
                  Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: _statusColor(status).withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      status,
                      style: TextStyle(
                          color: _statusColor(status),
                          fontSize: 12,
                          fontWeight: FontWeight.w600),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  const Icon(Icons.person_outline,
                      size: 16, color: AppTheme.textSecondary),
                  const SizedBox(width: 6),
                  Text(buyer,
                      style: const TextStyle(
                          color: AppTheme.textSecondary, fontSize: 13)),
                  const Spacer(),
                  Text(date,
                      style: const TextStyle(
                          color: AppTheme.textSecondary, fontSize: 12)),
                ],
              ),
              const Divider(height: 20),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text('$itemCount item${itemCount != 1 ? 's' : ''}',
                      style: const TextStyle(
                          color: AppTheme.textSecondary, fontSize: 13)),
                  Text(Money.fmt(total),
                      style: const TextStyle(
                          fontWeight: FontWeight.bold, fontSize: 16)),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
