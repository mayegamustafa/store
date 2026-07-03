import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../core/theme.dart';

class HelpCenterScreen extends StatelessWidget {
  const HelpCenterScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.backgroundColor,
      appBar: AppBar(title: const Text('Help Center')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Search
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              gradient: AppTheme.primaryGradient,
              borderRadius: BorderRadius.circular(16),
            ),
            child: Column(
              children: [
                const Icon(Icons.help_outline_rounded, color: Colors.white, size: 40),
                const SizedBox(height: 12),
                const Text('How can we help?',
                    style: TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.w700)),
                const SizedBox(height: 4),
                Text('Find answers to common questions',
                    style: TextStyle(color: Colors.white.withValues(alpha: 0.8), fontSize: 14)),
              ],
            ),
          ),

          const SizedBox(height: 20),

          _buildFaqSection('Orders & Delivery', Icons.local_shipping_outlined, [
            _FaqItem('How do I track my order?',
                'Go to Orders tab, tap on your order, then tap "Track Order" to see real-time delivery updates.'),
            _FaqItem('How long does delivery take?',
                'Delivery typically takes 1-3 business days within Kampala. Upcountry deliveries may take 3-7 business days.'),
            _FaqItem('Can I cancel my order?',
                'You can cancel your order before it is shipped. Go to Orders, tap the order, and select "Cancel Order".'),
            _FaqItem('What if my order arrives damaged?',
                'Contact us immediately via Live Chat or email. We\'ll arrange a replacement or refund.'),
          ]),

          const SizedBox(height: 12),

          _buildFaqSection('Payments', Icons.payment_outlined, [
            _FaqItem('What payment methods do you accept?',
                'We accept Mobile Money (MTN, Airtel), Visa/Mastercard, and Cash on Delivery.'),
            _FaqItem('Is my payment information secure?',
                'Yes, all payments are processed securely through Pesapal, a PCI-DSS compliant payment gateway.'),
            _FaqItem('How do I get a refund?',
                'Refunds are processed to your original payment method within 5-7 business days after approval.'),
          ]),

          const SizedBox(height: 12),

          _buildFaqSection('Account', Icons.person_outline_rounded, [
            _FaqItem('How do I reset my password?',
                'Tap "Forgot Password" on the login screen and follow the instructions sent to your email.'),
            _FaqItem('How do I update my profile?',
                'Go to Profile tab, tap "Edit Profile" to update your name and profile picture.'),
            _FaqItem('How do I enable fingerprint login?',
                'Fingerprint login is automatically enabled after your first password login on supported devices.'),
          ]),

          const SizedBox(height: 20),

          // Contact section
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              boxShadow: [AppTheme.cardShadow],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Still need help?',
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
                const SizedBox(height: 12),
                _contactTile(Icons.email_outlined, 'Email Us', 'support@saktech.org', () {
                  launchUrl(Uri.parse('mailto:support@saktech.org'));
                }),
                const Divider(height: 24),
                _contactTile(Icons.phone_outlined, 'Call Us', '+256 700 000 000', () {
                  launchUrl(Uri.parse('tel:+256700000000'));
                }),
                const Divider(height: 24),
                _contactTile(Icons.language_rounded, 'Visit Website', 'shop.saktech.org', () {
                  launchUrl(Uri.parse('https://shop.saktech.org'));
                }),
              ],
            ),
          ),

          const SizedBox(height: 32),
        ],
      ),
    );
  }

  Widget _contactTile(IconData icon, String title, String subtitle, VoidCallback onTap) {
    return InkWell(
      onTap: onTap,
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: AppTheme.primaryColor.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(icon, color: AppTheme.primaryColor, size: 20),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: const TextStyle(fontWeight: FontWeight.w600)),
                Text(subtitle, style: TextStyle(fontSize: 13, color: AppTheme.textSecondary)),
              ],
            ),
          ),
          Icon(Icons.arrow_forward_ios_rounded, size: 14, color: AppTheme.textTertiary),
        ],
      ),
    );
  }

  Widget _buildFaqSection(String title, IconData icon, List<_FaqItem> items) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [AppTheme.cardShadow],
      ),
      child: Theme(
        data: ThemeData(dividerColor: Colors.transparent),
        child: ExpansionTile(
          leading: Icon(icon, color: AppTheme.primaryColor),
          title: Text(title, style: const TextStyle(fontWeight: FontWeight.w600)),
          children: items
              .map((faq) => ExpansionTile(
                    tilePadding: const EdgeInsets.symmetric(horizontal: 24),
                    title: Text(faq.question, style: const TextStyle(fontSize: 14)),
                    children: [
                      Padding(
                        padding: const EdgeInsets.fromLTRB(24, 0, 24, 16),
                        child: Text(faq.answer,
                            style: TextStyle(fontSize: 13, color: AppTheme.textSecondary, height: 1.5)),
                      ),
                    ],
                  ))
              .toList(),
        ),
      ),
    );
  }
}

class _FaqItem {
  final String question;
  final String answer;
  const _FaqItem(this.question, this.answer);
}
