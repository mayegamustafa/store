import 'package:flutter/material.dart';
import '../../core/theme.dart';
import '../../core/utils/helpers.dart';
import '../../core/api/api_service.dart';

class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key});

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  final ApiService _api = ApiService();
  List<Map<String, dynamic>> _notifications = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _fetch();
  }

  Future<void> _fetch() async {
    setState(() => _isLoading = true);
    try {
      final response = await _api.dio.get('/users/me/notifications');
      final data = _api.extractData(response);
      final list = data is List ? data : (data['data'] ?? []);
      _notifications = List<Map<String, dynamic>>.from(list);
    } catch (_) {}
    if (mounted) setState(() => _isLoading = false);
  }

  Future<void> _markRead(String id) async {
    try {
      await _api.dio.patch('/users/me/notifications/$id/read');
      _fetch();
    } catch (_) {}
  }

  IconData _icon(String? type) {
    switch (type) {
      case 'ORDER_UPDATE': return Icons.local_shipping_rounded;
      case 'PAYMENT': return Icons.payment_rounded;
      case 'PROMO': return Icons.local_offer_rounded;
      case 'DELIVERY': return Icons.delivery_dining_rounded;
      default: return Icons.notifications_outlined;
    }
  }

  Color _iconColor(String? type) {
    switch (type) {
      case 'ORDER_UPDATE': return AppTheme.primaryColor;
      case 'PAYMENT': return AppTheme.successColor;
      case 'PROMO': return AppTheme.warningColor;
      case 'DELIVERY': return Colors.orange;
      default: return AppTheme.textSecondary;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.backgroundColor,
      appBar: AppBar(title: const Text('Notifications')),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _notifications.isEmpty
              ? Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.notifications_off_outlined, size: 64, color: AppTheme.textTertiary.withValues(alpha: 0.5)),
                      const SizedBox(height: 16),
                      Text('No notifications', style: TextStyle(fontSize: 16, color: AppTheme.textSecondary)),
                    ],
                  ),
                )
              : RefreshIndicator(
                  onRefresh: _fetch,
                  child: ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: _notifications.length,
                    itemBuilder: (context, index) {
                      final n = _notifications[index];
                      final isRead = n['readAt'] != null;
                      final type = n['type'] as String?;
                      final createdAt = DateTime.tryParse(n['createdAt'] ?? '') ?? DateTime.now();

                      return GestureDetector(
                        onTap: () {
                          if (!isRead && n['id'] != null) _markRead(n['id']);
                        },
                        child: Container(
                          margin: const EdgeInsets.only(bottom: 10),
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: isRead ? Colors.white : AppTheme.primaryColor.withValues(alpha: 0.04),
                            borderRadius: BorderRadius.circular(14),
                            border: isRead ? null : Border.all(color: AppTheme.primaryColor.withValues(alpha: 0.15)),
                            boxShadow: [AppTheme.cardShadow],
                          ),
                          child: Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Container(
                                padding: const EdgeInsets.all(10),
                                decoration: BoxDecoration(
                                  color: _iconColor(type).withValues(alpha: 0.1),
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                child: Icon(_icon(type), size: 20, color: _iconColor(type)),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      n['title'] ?? 'Notification',
                                      style: TextStyle(
                                        fontWeight: isRead ? FontWeight.w500 : FontWeight.w700,
                                        fontSize: 14,
                                      ),
                                    ),
                                    const SizedBox(height: 4),
                                    Text(
                                      n['message'] ?? n['body'] ?? '',
                                      style: TextStyle(fontSize: 13, color: AppTheme.textSecondary),
                                      maxLines: 2,
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                    const SizedBox(height: 6),
                                    Text(
                                      formatTimeAgo(createdAt),
                                      style: TextStyle(fontSize: 11, color: AppTheme.textTertiary),
                                    ),
                                  ],
                                ),
                              ),
                              if (!isRead)
                                Container(
                                  width: 8,
                                  height: 8,
                                  margin: const EdgeInsets.only(top: 4),
                                  decoration: BoxDecoration(
                                    color: AppTheme.primaryColor,
                                    shape: BoxShape.circle,
                                  ),
                                ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
                ),
    );
  }
}
