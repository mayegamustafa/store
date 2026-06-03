import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:url_launcher/url_launcher.dart';
import '../core/api_service.dart';

/// Mobile-seller subscription management.
///
/// Scope this session: current plan banner (incl. GRACE state), plan cards with
/// Subscribe CTA, paid-plan flow via `subscribeToPlan` → opens Pesapal redirect
/// URL in the platform browser. Receipt download + full history deferred to
/// follow-up — the web seller surface has both, and mobile-seller users can
/// download receipts there.
class SubscriptionScreen extends StatefulWidget {
  const SubscriptionScreen({super.key});

  @override
  State<SubscriptionScreen> createState() => _SubscriptionScreenState();
}

class _SubscriptionScreenState extends State<SubscriptionScreen> {
  final _api = ApiService();

  bool _loading = true;
  Map<String, dynamic>? _mySub;
  List<dynamic> _plans = [];
  String? _subscribingPlanId;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final results = await Future.wait([
        _api.getMySubscription(),
        _api.getSubscriptionPlans(),
      ]);
      if (!mounted) return;
      setState(() {
        _mySub = results[0] as Map<String, dynamic>;
        _plans = results[1] as List<dynamic>;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => _loading = false);
      _showError('Failed to load subscription');
    }
  }

  Future<void> _subscribe(String planId) async {
    setState(() => _subscribingPlanId = planId);
    try {
      final res = await _api.subscribeToPlan(planId);
      if (!mounted) return;
      final requiresPayment = res['requiresPayment'] == true;
      if (requiresPayment) {
        final url = res['redirectUrl'] as String?;
        if (url != null && url.isNotEmpty) {
          await launchUrl(Uri.parse(url), mode: LaunchMode.externalApplication);
          _showInfo('Payment opened — return here once complete.');
        } else {
          _showError('Payment URL unavailable');
        }
      } else {
        _showInfo('Free plan activated');
      }
      await _load();
    } catch (e) {
      final ple = ApiService.planLimitFrom(e);
      _showError(ple?.toString() ?? 'Failed to subscribe');
    } finally {
      if (mounted) setState(() => _subscribingPlanId = null);
    }
  }

  void _showError(String msg) {
    if (!mounted) return;
    HapticFeedback.lightImpact();
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(msg), backgroundColor: Colors.red.shade700),
    );
  }

  void _showInfo(String msg) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg)));
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      appBar: AppBar(title: const Text('Subscription')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _load,
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  _CurrentPlanBanner(mySub: _mySub),
                  const SizedBox(height: 24),
                  Text(
                    'Available plans',
                    style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w700),
                  ),
                  const SizedBox(height: 12),
                  ..._plans.map((p) => _PlanCard(
                        plan: p as Map<String, dynamic>,
                        currentPlanId: (_mySub?['subscription'] as Map?)?['planId'] as String?,
                        isActive: (_mySub?['isActive'] as bool?) ?? false,
                        isSubscribing: _subscribingPlanId == (p as Map)['id'],
                        onSubscribe: () => _subscribe(p['id'] as String),
                      )),
                ],
              ),
            ),
    );
  }
}

class _CurrentPlanBanner extends StatelessWidget {
  final Map<String, dynamic>? mySub;
  const _CurrentPlanBanner({this.mySub});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final current = mySub?['subscription'] as Map?;
    final inGrace = mySub?['inGrace'] == true;

    if (current == null) {
      return Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: Colors.grey.shade100,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: Colors.grey.shade300, style: BorderStyle.solid),
        ),
        child: Column(
          children: [
            Icon(Icons.workspace_premium_outlined, size: 36, color: Colors.grey.shade500),
            const SizedBox(height: 8),
            Text('No active subscription', style: theme.textTheme.titleSmall),
            Text('Choose a plan below to get started',
                style: theme.textTheme.bodySmall?.copyWith(color: Colors.black54)),
          ],
        ),
      );
    }

    final status = current['status'] as String? ?? 'PENDING';
    final plan = current['plan'] as Map?;
    final expiresAt = current['expiresAt'] as String?;
    final daysLeft = expiresAt != null
        ? ((DateTime.parse(expiresAt).difference(DateTime.now()).inHours) / 24).ceil()
        : null;

    final (bg, fg, icon) = switch (status) {
      'ACTIVE' => (Colors.green.shade50, Colors.green.shade700, Icons.check_circle_rounded),
      'GRACE' => (Colors.orange.shade50, Colors.orange.shade700, Icons.warning_amber_rounded),
      'PENDING' => (Colors.amber.shade50, Colors.amber.shade800, Icons.schedule_rounded),
      'EXPIRED' => (Colors.grey.shade100, Colors.grey.shade600, Icons.cancel_outlined),
      _ => (Colors.grey.shade100, Colors.grey.shade600, Icons.help_outline_rounded),
    };

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(16)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, color: fg, size: 20),
              const SizedBox(width: 8),
              Text(status, style: theme.textTheme.labelSmall?.copyWith(color: fg, fontWeight: FontWeight.w700)),
            ],
          ),
          const SizedBox(height: 8),
          Text(plan?['name']?.toString() ?? 'Plan',
              style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700)),
          const SizedBox(height: 4),
          Text(
            '${plan?['currency'] ?? 'UGX'} ${(plan?['price'] ?? 0).toString()} • ${plan?['billingCycle'] ?? 'MONTHLY'}',
            style: theme.textTheme.bodySmall?.copyWith(color: fg),
          ),
          if (daysLeft != null) ...[
            const SizedBox(height: 8),
            Text(
              daysLeft < 0
                  ? 'Expired ${daysLeft.abs()} day${daysLeft.abs() == 1 ? '' : 's'} ago'
                  : daysLeft == 0
                      ? 'Expires today'
                      : '$daysLeft day${daysLeft == 1 ? '' : 's'} left',
              style: theme.textTheme.bodySmall?.copyWith(color: fg, fontWeight: FontWeight.w600),
            ),
          ],
          if (inGrace || (daysLeft != null && daysLeft <= 3 && status == 'ACTIVE')) ...[
            const SizedBox(height: 12),
            Text(
              inGrace
                  ? 'Renew now to avoid losing premium features.'
                  : 'Your plan ends soon. Renew before expiry.',
              style: theme.textTheme.bodySmall?.copyWith(color: fg),
            ),
          ],
        ],
      ),
    );
  }
}

class _PlanCard extends StatelessWidget {
  final Map<String, dynamic> plan;
  final String? currentPlanId;
  final bool isActive;
  final bool isSubscribing;
  final VoidCallback onSubscribe;

  const _PlanCard({
    required this.plan,
    required this.currentPlanId,
    required this.isActive,
    required this.isSubscribing,
    required this.onSubscribe,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isCurrent = plan['id'] == currentPlanId && isActive;
    final price = num.tryParse(plan['price'].toString()) ?? 0;
    final isFree = price == 0;
    final maxProducts = (plan['maxProducts'] as int?) ?? 0;
    final features = (plan['features'] as List?) ?? const [];

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isCurrent ? Colors.indigo.shade50 : Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isCurrent ? Colors.indigo.shade300 : Colors.grey.shade200,
          width: isCurrent ? 1.5 : 1,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  plan['name']?.toString() ?? 'Plan',
                  style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
                ),
              ),
              if (isCurrent)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: Colors.indigo.shade100,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text('Current',
                      style: theme.textTheme.labelSmall?.copyWith(color: Colors.indigo.shade700, fontWeight: FontWeight.w700)),
                ),
            ],
          ),
          if (plan['description'] != null) ...[
            const SizedBox(height: 4),
            Text(plan['description'].toString(),
                style: theme.textTheme.bodySmall?.copyWith(color: Colors.black54)),
          ],
          const SizedBox(height: 12),
          if (isFree)
            Text('Free', style: theme.textTheme.headlineSmall?.copyWith(color: Colors.green.shade700, fontWeight: FontWeight.w800))
          else
            RichText(
              text: TextSpan(
                style: theme.textTheme.headlineSmall?.copyWith(color: Colors.black, fontWeight: FontWeight.w800),
                children: [
                  TextSpan(text: '${plan['currency'] ?? 'UGX'} ${price.toStringAsFixed(0)}'),
                  TextSpan(
                    text: ' / ${plan['billingCycle']?.toString().toLowerCase() ?? 'month'}',
                    style: theme.textTheme.bodySmall?.copyWith(color: Colors.black54),
                  ),
                ],
              ),
            ),
          const SizedBox(height: 12),
          _Feature('${maxProducts == 0 ? 'Unlimited' : 'Up to $maxProducts'} products'),
          for (final f in features) _Feature(f.toString()),
          const SizedBox(height: 12),
          SizedBox(
            width: double.infinity,
            child: FilledButton(
              onPressed: isCurrent || isSubscribing ? null : onSubscribe,
              style: FilledButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                backgroundColor: isCurrent ? Colors.indigo.shade100 : Colors.indigo,
                foregroundColor: isCurrent ? Colors.indigo.shade700 : Colors.white,
              ),
              child: isSubscribing
                  ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                  : Text(isCurrent ? 'Active' : isFree ? 'Activate' : 'Subscribe'),
            ),
          ),
        ],
      ),
    );
  }
}

class _Feature extends StatelessWidget {
  final String text;
  const _Feature(this.text);
  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Row(
        children: [
          Icon(Icons.check_rounded, size: 16, color: Colors.green.shade600),
          const SizedBox(width: 8),
          Expanded(child: Text(text, style: Theme.of(context).textTheme.bodySmall)),
        ],
      ),
    );
  }
}
