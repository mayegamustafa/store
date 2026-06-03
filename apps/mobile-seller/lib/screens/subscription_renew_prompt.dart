import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

/// Bottom-sheet shown when a seller's subscription is in GRACE or expiring soon.
/// Two CTAs: "Renew now" navigates to the subscription screen (which initiates the
/// Pesapal flow). "Remind me later" snoozes — caller persists the snooze.
class SubscriptionRenewPrompt extends StatelessWidget {
  final String planName;
  final String currency;
  final num amount;
  final String billingCycle;
  final bool inGrace;
  final int? daysLeft;

  const SubscriptionRenewPrompt({
    super.key,
    required this.planName,
    required this.currency,
    required this.amount,
    required this.billingCycle,
    required this.inGrace,
    this.daysLeft,
  });

  /// Show as a non-dismissible-on-outside-tap bottom sheet.
  /// Returns `true` if the user tapped "Renew now", `false` if "Remind me later".
  static Future<bool?> show(
    BuildContext context, {
    required String planName,
    required String currency,
    required num amount,
    required String billingCycle,
    required bool inGrace,
    int? daysLeft,
  }) {
    return showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      isDismissible: false,
      enableDrag: false,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (_) => SubscriptionRenewPrompt(
        planName: planName,
        currency: currency,
        amount: amount,
        billingCycle: billingCycle,
        inGrace: inGrace,
        daysLeft: daysLeft,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final headline = inGrace
        ? 'Your plan is in grace period'
        : (daysLeft != null && daysLeft! <= 3
            ? 'Your plan ends in $daysLeft day${daysLeft == 1 ? '' : 's'}'
            : 'Renew your subscription');
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(20, 20, 20, 24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Container(
              width: 40,
              height: 4,
              margin: const EdgeInsets.only(bottom: 16),
              alignment: Alignment.center,
              decoration: BoxDecoration(
                color: Colors.black12,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            Row(
              children: [
                Icon(
                  inGrace ? Icons.warning_amber_rounded : Icons.schedule_rounded,
                  color: inGrace ? Colors.orange.shade700 : Colors.amber.shade700,
                  size: 28,
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    headline,
                    style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Text(
              inGrace
                  ? 'Renew now to avoid losing premium features. After grace ends your plan downgrades to the free tier.'
                  : 'Renew $planName to keep your premium features active.',
              style: theme.textTheme.bodyMedium?.copyWith(color: Colors.black54),
            ),
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: Colors.indigo.shade50,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(planName, style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w700)),
                        const SizedBox(height: 2),
                        Text(
                          '$currency ${amount.toStringAsFixed(0)} • $billingCycle',
                          style: theme.textTheme.bodySmall?.copyWith(color: Colors.black54),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),
            FilledButton.icon(
              onPressed: () {
                Navigator.of(context).pop(true);
                // Caller can route to /subscription; we do it here as a convenience
                // when the prompt is launched from a global lifecycle hook.
                context.go('/subscription');
              },
              icon: const Icon(Icons.refresh_rounded),
              label: const Text('Renew now'),
              style: FilledButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
            ),
            const SizedBox(height: 8),
            TextButton(
              onPressed: () => Navigator.of(context).pop(false),
              child: const Text('Remind me later'),
            ),
          ],
        ),
      ),
    );
  }
}
