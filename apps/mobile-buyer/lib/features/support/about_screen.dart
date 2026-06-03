import 'package:flutter/material.dart';
import '../../core/theme.dart';

class AboutScreen extends StatelessWidget {
  const AboutScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.backgroundColor,
      appBar: AppBar(title: const Text('About')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // App logo & name
          Container(
            padding: const EdgeInsets.all(32),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              boxShadow: [AppTheme.cardShadow],
            ),
            child: Column(
              children: [
                Container(
                  width: 80,
                  height: 80,
                  decoration: BoxDecoration(
                    gradient: AppTheme.primaryGradient,
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: const Icon(Icons.shopping_bag_rounded, color: Colors.white, size: 40),
                ),
                const SizedBox(height: 16),
                const Text('TotalStore',
                    style: TextStyle(fontSize: 24, fontWeight: FontWeight.w800)),
                const SizedBox(height: 4),
                Text('Version 2.0.0',
                    style: TextStyle(fontSize: 14, color: AppTheme.textSecondary)),
                const SizedBox(height: 16),
                Text(
                  'Your one-stop marketplace for everything you need. '
                  'Shop from thousands of sellers, enjoy fast delivery, '
                  'and pay securely with Mobile Money or Card.',
                  textAlign: TextAlign.center,
                  style: TextStyle(fontSize: 14, color: AppTheme.textSecondary, height: 1.5),
                ),
              ],
            ),
          ),

          const SizedBox(height: 16),

          _buildInfoSection('Features', [
            _InfoItem(Icons.store_rounded, 'Multi-Vendor Marketplace',
                'Shop from hundreds of trusted sellers'),
            _InfoItem(Icons.local_shipping_rounded, 'Fast Delivery',
                'Get your orders delivered to your doorstep'),
            _InfoItem(Icons.gps_fixed_rounded, 'Real-Time Tracking',
                'Track your delivery in real-time on the map'),
            _InfoItem(Icons.payment_rounded, 'Secure Payments',
                'Pay with Mobile Money, Card, or Cash on Delivery'),
            _InfoItem(Icons.fingerprint_rounded, 'Biometric Login',
                'Quick and secure login with your fingerprint'),
          ]),

          const SizedBox(height: 16),

          _buildInfoSection('Company', [
            _InfoItem(Icons.business_rounded, 'SAK Technologies',
                'Building digital solutions for East Africa'),
            _InfoItem(Icons.location_on_rounded, 'Kampala, Uganda',
                'Serving customers across Uganda'),
            _InfoItem(Icons.email_rounded, 'support@saktech.org',
                'Get in touch with our team'),
          ]),

          const SizedBox(height: 16),

          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              boxShadow: [AppTheme.cardShadow],
            ),
            child: Column(
              children: [
                Text('Made with ❤️ in Uganda',
                    style: TextStyle(fontSize: 14, color: AppTheme.textSecondary)),
                const SizedBox(height: 8),
                Text('© ${DateTime.now().year} SAK Technologies. All rights reserved.',
                    style: TextStyle(fontSize: 12, color: AppTheme.textTertiary)),
              ],
            ),
          ),

          const SizedBox(height: 32),
        ],
      ),
    );
  }

  Widget _buildInfoSection(String title, List<_InfoItem> items) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [AppTheme.cardShadow],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
            child: Text(title,
                style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppTheme.textTertiary)),
          ),
          ...items.map((item) => ListTile(
                leading: Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: AppTheme.primaryColor.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Icon(item.icon, color: AppTheme.primaryColor, size: 20),
                ),
                title: Text(item.title, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
                subtitle: Text(item.subtitle,
                    style: TextStyle(fontSize: 12, color: AppTheme.textSecondary)),
              )),
          const SizedBox(height: 8),
        ],
      ),
    );
  }
}

class _InfoItem {
  final IconData icon;
  final String title;
  final String subtitle;
  const _InfoItem(this.icon, this.title, this.subtitle);
}
