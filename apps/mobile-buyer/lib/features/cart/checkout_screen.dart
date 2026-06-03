import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/theme.dart';
import '../payments/pesapal_webview_screen.dart';
import '../../core/utils/helpers.dart';
import '../../core/models/models.dart';
import '../../shared/widgets/common.dart';
import '../cart/cart_provider.dart';
import '../orders/orders_provider.dart';
import '../settings/settings_provider.dart';
import '../../core/constants.dart';

class CheckoutScreen extends StatefulWidget {
  const CheckoutScreen({super.key});

  @override
  State<CheckoutScreen> createState() => _CheckoutScreenState();
}

class _CheckoutScreenState extends State<CheckoutScreen> {
  String _paymentMethod = 'PESAPAL';
  bool _isPlacing = false;
  final _notesController = TextEditingController();

  final List<Map<String, String>> _paymentMethods = [
    {'value': 'PESAPAL', 'label': 'Mobile Money (MTN, Airtel)', 'icon': 'phone_android'},
    {'value': 'PESAPAL_CARD', 'label': 'Card Payment (Visa, Mastercard)', 'icon': 'credit_card'},
    {'value': 'CASH_ON_DELIVERY', 'label': 'Cash on Delivery', 'icon': 'payments'},
  ];

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<SettingsProvider>().fetchAddresses();
    });
  }

  @override
  void dispose() {
    _notesController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final cart = context.watch<CartProvider>();
    final settings = context.watch<SettingsProvider>();
    final defaultAddress = settings.defaultAddress;
    final subtotal = cart.subtotal;
    final deliveryFee = subtotal >= settings.freeDeliveryThreshold
        ? 0.0
        : settings.defaultDeliveryFee;
    final total = subtotal + deliveryFee;

    return Scaffold(
      backgroundColor: AppTheme.backgroundColor,
      appBar: AppBar(title: const Text('Checkout')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Delivery address
            _sectionTitle('Delivery Address'),
            _buildAddressCard(context, defaultAddress),
            const SizedBox(height: 20),

            // Order items summary
            _sectionTitle('Order Summary'),
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                boxShadow: [AppTheme.cardShadow],
              ),
              child: Column(
                children: [
                  ...cart.items.map((item) => Padding(
                        padding: const EdgeInsets.only(bottom: 10),
                        child: Row(
                          children: [
                            Expanded(
                              child: Text(
                                '${item.product?.name ?? 'Product'} x${item.quantity}',
                                style: const TextStyle(fontSize: 14),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                            Text(
                              formatCurrency(item.lineTotal),
                              style: const TextStyle(
                                fontWeight: FontWeight.w600,
                                fontSize: 14,
                              ),
                            ),
                          ],
                        ),
                      )),
                  const Divider(),
                  _summaryRow('Subtotal', subtotal),
                  _summaryRow('Delivery Fee',
                      deliveryFee, note: deliveryFee == 0 ? 'FREE' : null),
                  const SizedBox(height: 6),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'Total',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      Text(
                        formatCurrency(total),
                        style: TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.w800,
                          color: AppTheme.primaryColor,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // Payment method
            _sectionTitle('Payment Method'),
            ...(_paymentMethods.map((m) => _buildPaymentOption(m))),
            const SizedBox(height: 20),

            // Notes
            _sectionTitle('Order Notes (optional)'),
            TextField(
              controller: _notesController,
              maxLines: 3,
              decoration: InputDecoration(
                hintText: 'Any special instructions...',
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
            ),
            const SizedBox(height: 100),
          ],
        ),
      ),

      bottomNavigationBar: Container(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 28),
        decoration: BoxDecoration(
          color: Colors.white,
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.06),
              blurRadius: 16,
              offset: const Offset(0, -4),
            ),
          ],
        ),
        child: SizedBox(
          width: double.infinity,
          height: 52,
          child: ElevatedButton(
            onPressed: _isPlacing || defaultAddress == null
                ? null
                : () => _placeOrder(context),
            child: _isPlacing
                ? const SizedBox(
                    width: 22,
                    height: 22,
                    child: CircularProgressIndicator(
                      strokeWidth: 2.5,
                      color: Colors.white,
                    ),
                  )
                : Text('Place Order  ${formatCurrency(total)}'),
          ),
        ),
      ),
    );
  }

  Widget _sectionTitle(String title) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Text(
        title,
        style: const TextStyle(
          fontSize: 16,
          fontWeight: FontWeight.w700,
          color: AppTheme.textPrimary,
        ),
      ),
    );
  }

  Widget _buildAddressCard(BuildContext context, Address? address) {
    return GestureDetector(
      onTap: () => Navigator.of(context).pushNamed('/addresses'),
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppTheme.dividerColor),
          boxShadow: [AppTheme.cardShadow],
        ),
        child: address == null
            ? Row(
                children: [
                  Icon(Icons.add_location_alt_outlined,
                      color: AppTheme.primaryColor),
                  const SizedBox(width: 12),
                  Text(
                    'Add delivery address',
                    style: TextStyle(
                      color: AppTheme.primaryColor,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              )
            : Row(
                children: [
                  Icon(Icons.location_on_rounded,
                      color: AppTheme.primaryColor, size: 22),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          address.label ?? 'Address',
                          style: const TextStyle(
                            fontWeight: FontWeight.w600,
                            fontSize: 14,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          address.formatted,
                          style: const TextStyle(
                            fontSize: 13,
                            color: AppTheme.textSecondary,
                          ),
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ),
                  ),
                  Icon(Icons.chevron_right_rounded,
                      color: AppTheme.textTertiary),
                ],
              ),
      ),
    );
  }

  Widget _buildPaymentOption(Map<String, String> method) {
    final isSelected = _paymentMethod == method['value'];
    final iconData = _getIconData(method['icon']!);

    return GestureDetector(
      onTap: () => setState(() => _paymentMethod = method['value']!),
      child: Container(
        margin: const EdgeInsets.only(bottom: 8),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
            color: isSelected ? AppTheme.primaryColor : AppTheme.dividerColor,
            width: isSelected ? 1.5 : 1,
          ),
        ),
        child: Row(
          children: [
            Icon(iconData,
                size: 22,
                color: isSelected ? AppTheme.primaryColor : AppTheme.textSecondary),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                method['label']!,
                style: TextStyle(
                  fontWeight: isSelected ? FontWeight.w600 : FontWeight.w400,
                  color: isSelected ? AppTheme.primaryColor : AppTheme.textPrimary,
                ),
              ),
            ),
            Container(
              width: 22,
              height: 22,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                border: Border.all(
                  color: isSelected ? AppTheme.primaryColor : AppTheme.textTertiary,
                  width: 2,
                ),
                color: isSelected ? AppTheme.primaryColor : Colors.transparent,
              ),
              child: isSelected
                  ? const Icon(Icons.check_rounded,
                      size: 14, color: Colors.white)
                  : null,
            ),
          ],
        ),
      ),
    );
  }

  Widget _summaryRow(String label, double amount, {String? note}) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(color: AppTheme.textSecondary)),
          note != null
              ? Text(
                  note,
                  style: const TextStyle(
                    color: AppTheme.successColor,
                    fontWeight: FontWeight.w600,
                  ),
                )
              : Text(formatCurrency(amount)),
        ],
      ),
    );
  }

  IconData _getIconData(String name) {
    switch (name) {
      case 'phone_android': return Icons.phone_android_rounded;
      case 'credit_card': return Icons.credit_card_rounded;
      case 'account_balance_wallet': return Icons.account_balance_wallet_rounded;
      case 'payments': return Icons.payments_rounded;
      default: return Icons.payment_rounded;
    }
  }

  Future<void> _placeOrder(BuildContext context) async {
    final settings = context.read<SettingsProvider>();
    final address = settings.defaultAddress;
    if (address == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: const Text('Please add a delivery address'),
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        ),
      );
      return;
    }

    setState(() => _isPlacing = true);

    final orders = context.read<OrdersProvider>();
    final apiMethod = _paymentMethod == 'PESAPAL_CARD' ? 'PESAPAL' : _paymentMethod;
    final orderData = await orders.createOrder(
      addressId: address.id,
      paymentMethod: apiMethod,
      notes: _notesController.text.isNotEmpty ? _notesController.text : null,
    );

    if (!mounted) return;

    if (orderData == null) {
      setState(() => _isPlacing = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: const Text('Failed to place order'),
          backgroundColor: AppTheme.errorColor,
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        ),
      );
      return;
    }

    context.read<CartProvider>().clearCart();

    if (_paymentMethod == 'CASH_ON_DELIVERY') {
      setState(() => _isPlacing = false);
      Navigator.of(context).pushNamedAndRemoveUntil('/main', (_) => false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: const Text('Order placed successfully!'),
          backgroundColor: AppTheme.successColor,
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        ),
      );
      return;
    }

    // Pesapal payment flow
    final orderId = orderData['id'] as String?;
    if (orderId != null) {
      // Use a backend HTTPS return URL — Pesapal requires a valid HTTPS callback URL
      // and will reject custom URI schemes (totalstore://). The backend confirms payment
      // and serves an HTML page that bounces the WebView into the app via the deep link.
      final baseWsUrl = AppConstants.baseUrl.replaceAll('/api/v1', '');
      final appReturnUrl = '$baseWsUrl/api/v1/payments/mobile-return?orderId=$orderId';
      final redirectUrl = await orders.initiatePayment(
        orderId: orderId,
        method: apiMethod,
        returnUrl: appReturnUrl,
      );

      if (!mounted) return;
      setState(() => _isPlacing = false);

      if (redirectUrl != null) {
        // Open payment in an in-app WebView so the user never leaves the app
        final result = await Navigator.of(context).push<String>(
          MaterialPageRoute(
            builder: (_) => PesapalWebViewScreen(
              paymentUrl: redirectUrl,
              orderId: orderId,
            ),
          ),
        );

        if (!mounted) return;

        // Poll backend to confirm payment status — IPN may not have arrived yet
        if (result == 'success') {
          await orders.confirmPayment(orderId: orderId);
        }

        if (!mounted) return;
        Navigator.of(context).pushNamedAndRemoveUntil('/main', (_) => false);
        final msg = result == 'success'
            ? 'Payment completed successfully!'
            : 'Order placed. Complete payment to confirm.';
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(msg),
            backgroundColor: result == 'success' ? AppTheme.successColor : AppTheme.primaryColor,
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
          ),
        );
        return;
      }

      Navigator.of(context).pushNamedAndRemoveUntil('/main', (_) => false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: const Text('Order placed! Complete payment to confirm.'),
          backgroundColor: AppTheme.successColor,
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        ),
      );
    } else {
      setState(() => _isPlacing = false);
      Navigator.of(context).pushNamedAndRemoveUntil('/main', (_) => false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: const Text('Order placed successfully!'),
          backgroundColor: AppTheme.successColor,
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        ),
      );
    }
  }
}
