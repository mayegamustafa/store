import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';

/// In-app WebView for Pesapal payment. Intercepts the returnUrl to close itself
/// and report success/failure back to the caller without leaving the app.
class PesapalWebViewScreen extends StatefulWidget {
  final String paymentUrl;
  final String orderId;

  const PesapalWebViewScreen({
    super.key,
    required this.paymentUrl,
    required this.orderId,
  });

  @override
  State<PesapalWebViewScreen> createState() => _PesapalWebViewScreenState();
}

class _PesapalWebViewScreenState extends State<PesapalWebViewScreen> {
  late final WebViewController _controller;
  bool _isLoading = true;

  /// The scheme we use as a sentinel to detect Pesapal's redirect back to us.
  static const String _returnScheme = 'totalstore';

  @override
  void initState() {
    super.initState();
    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(const Color(0xFFFFFFFF))
      ..setNavigationDelegate(
        NavigationDelegate(
          onPageStarted: (_) => setState(() => _isLoading = true),
          onPageFinished: (_) => setState(() => _isLoading = false),
          onNavigationRequest: (NavigationRequest req) {
            final uri = Uri.tryParse(req.url);
            if (uri == null) return NavigationDecision.navigate;

            // 1. Intercept the app deep link (totalstore://) — backend HTML bounce triggers this
            if (uri.scheme == _returnScheme) {
              final status = uri.queryParameters['status'] == 'success' ? 'success' : 'pending';
              Navigator.of(context).pop(status);
              return NavigationDecision.prevent;
            }

            // 2. Intercept our backend mobile-return page before it even loads —
            //    prevents a visible HTML flash and handles payment result immediately.
            if (req.url.contains('/payments/mobile-return')) {
              final status = uri.queryParameters['status'] == 'success' ? 'success' : 'pending';
              // If we have an OrderTrackingId it means Pesapal redirected here post-payment
              final hasTracking = uri.queryParameters['OrderTrackingId']?.isNotEmpty == true ||
                  uri.queryParameters['orderId']?.isNotEmpty == true;
              Navigator.of(context).pop(hasTracking ? 'success' : status);
              return NavigationDecision.prevent;
            }

            // 3. Legacy: intercept the old web orders payment-status URL
            if (req.url.contains('/orders/${widget.orderId}/payment-status')) {
              Navigator.of(context).pop('success');
              return NavigationDecision.prevent;
            }

            return NavigationDecision.navigate;
          },
          onWebResourceError: (WebResourceError error) {
            // Non-fatal — Pesapal may load external resources that fail
          },
        ),
      )
      ..loadRequest(Uri.parse(widget.paymentUrl));
  }

  Future<bool> _onWillPop() async {
    if (await _controller.canGoBack()) {
      await _controller.goBack();
      return false;
    }
    // Ask the user before closing mid-payment
    final leave = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Cancel payment?'),
        content: const Text(
            'Your payment is not complete yet. Are you sure you want to go back?'),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: const Text('Stay')),
          TextButton(
              onPressed: () => Navigator.pop(context, true),
              child: const Text('Leave', style: TextStyle(color: Colors.red))),
        ],
      ),
    );
    if (leave == true) Navigator.of(context).pop('cancelled');
    return false;
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: false,
      onPopInvoked: (_) => _onWillPop(),
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Complete Payment'),
          leading: IconButton(
            icon: const Icon(Icons.close),
            onPressed: () async => _onWillPop(),
          ),
        ),
        body: Stack(
          children: [
            WebViewWidget(controller: _controller),
            if (_isLoading)
              const Center(
                child: CircularProgressIndicator(),
              ),
          ],
        ),
      ),
    );
  }
}
