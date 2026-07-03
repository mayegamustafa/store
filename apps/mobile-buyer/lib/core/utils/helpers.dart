import 'package:intl/intl.dart';
import '../constants.dart';

/// Safely convert a dynamic value (String, int, double, or null) to double.
/// Prisma Decimal fields are serialized as strings in JSON.
double safeDouble(dynamic value, [double fallback = 0]) {
  if (value == null) return fallback;
  if (value is num) return value.toDouble();
  if (value is String) return double.tryParse(value) ?? fallback;
  return fallback;
}

/// Set by SettingsProvider from the admin CURRENCY setting (or the user's
/// chosen display currency). Screens should never hardcode a currency code.
String defaultCurrencyCode = 'UGX';

String formatCurrency(double amount, {String? currency}) {
  final formatter = NumberFormat('#,##0', 'en_US');
  return '${currency ?? defaultCurrencyCode} ${formatter.format(amount.round())}';
}

String formatDate(DateTime date) {
  return DateFormat('MMM d, yyyy').format(date);
}

String formatDateTime(DateTime date) {
  return DateFormat('MMM d, yyyy h:mm a').format(date);
}

String formatTimeAgo(DateTime date) {
  final diff = DateTime.now().difference(date);
  if (diff.inSeconds < 60) return 'just now';
  if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
  if (diff.inHours < 24) return '${diff.inHours}h ago';
  if (diff.inDays < 7) return '${diff.inDays}d ago';
  return formatDate(date);
}

String resolveImageUrl(String? url) {
  if (url == null || url.isEmpty) return '';
  if (url.startsWith('http')) return url;
  return '${AppConstants.uploadBaseUrl}$url';
}

String getOrderStatusLabel(String status) {
  switch (status) {
    case 'PENDING': return 'Pending';
    case 'CONFIRMED': return 'Confirmed';
    case 'PROCESSING': return 'Processing';
    case 'SHIPPED': return 'Shipped';
    case 'OUT_FOR_DELIVERY': return 'Out for Delivery';
    case 'DELIVERED': return 'Delivered';
    case 'CANCELLED': return 'Cancelled';
    case 'RETURN_REQUESTED': return 'Return Requested';
    case 'RETURNED': return 'Returned';
    case 'REFUNDED': return 'Refunded';
    default: return status;
  }
}

String getPaymentStatusLabel(String status) {
  switch (status) {
    case 'PENDING': return 'Pending';
    case 'PROCESSING': return 'Processing';
    case 'COMPLETED': return 'Paid';
    case 'FAILED': return 'Failed';
    case 'REFUNDED': return 'Refunded';
    default: return status;
  }
}
