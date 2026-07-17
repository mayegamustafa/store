import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../core/theme/app_theme.dart';
import '../../providers/auth_provider.dart';
import '../../providers/delivery_provider.dart';
import '../../services/biometric_service.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  @override
  void initState() {
    super.initState();
    // The approval badge reads the cached profile — refresh it every time
    // the screen opens so an admin approval shows without re-logging in.
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) context.read<AuthProvider>().refreshProfile();
    });
  }

  @override
  Widget build(BuildContext context) {
    return Consumer<AuthProvider>(builder: (context, auth, _) {
      final user = auth.user ?? {};
      final riderProfile = user['riderProfile'] as Map<String, dynamic>? ?? {};
      final name = user['name'] as String?
          ?? '${user['firstName'] ?? ''} ${user['lastName'] ?? ''}'.trim();
      final phone = user['phone'] as String? ?? '';
      final email = user['email'] as String? ?? '';
      final avatarUrl = user['avatar'] as String?;
      final initials = name.isNotEmpty ? name[0].toUpperCase() : 'R';

      final rating = double.tryParse(riderProfile['rating']?.toString() ?? '0') ?? 0;
      final totalDeliveries = (riderProfile['totalDeliveries'] as num?)?.toInt() ?? 0;
      final isActive = riderProfile['status'] == 'ACTIVE';
      // Gold badge = every KYC check passed (auto-granted by the server).
      final isVerified = riderProfile['isVerified'] == true;
      final infoRequested = riderProfile['infoRequested'] as String?;
      final vehicleType = riderProfile['vehicleType'] as String?;
      final licensePlate = riderProfile['vehiclePlate'] ?? riderProfile['licensePlate'] ?? '';
      final memberSince = user['createdAt'] != null
          ? _formatDate(user['createdAt'].toString())
          : 'N/A';

      return Scaffold(
        backgroundColor: AppTheme.background,
        body: CustomScrollView(
          slivers: [
            // ── Header ──────────────────────────────────────────────────────
            SliverToBoxAdapter(
              child: Container(
                decoration: const BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: [Color(0xFF064E3B), Color(0xFF065F46), Color(0xFF047857)],
                  ),
                ),
                child: SafeArea(
                  bottom: false,
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(20, 12, 20, 28),
                    child: Column(
                      children: [
                        // Top bar
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Text(
                              'Profile',
                              style: TextStyle(
                                fontSize: 22,
                                fontWeight: FontWeight.w800,
                                color: Colors.white,
                                letterSpacing: -0.5,
                              ),
                            ),
                            // Online indicator from delivery provider
                            Consumer<DeliveryProvider>(
                              builder: (_, dp, __) => GestureDetector(
                                onTap: dp.toggleOnline,
                                child: _OnlinePill(isOnline: dp.isOnline),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 24),

                        // Avatar
                        Stack(
                          children: [
                            Container(
                              width: 80,
                              height: 80,
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
                                border: Border.all(color: Colors.white.withOpacity(0.3), width: 3),
                                color: Colors.white.withOpacity(0.15),
                              ),
                              child: avatarUrl != null && avatarUrl.isNotEmpty
                                  ? ClipOval(
                                      child: Image.network(
                                        avatarUrl,
                                        fit: BoxFit.cover,
                                        errorBuilder: (_, __, ___) => Center(
                                          child: Text(initials,
                                              style: const TextStyle(fontSize: 30, fontWeight: FontWeight.bold, color: Colors.white)),
                                        ),
                                      ),
                                    )
                                  : Center(
                                      child: Text(initials,
                                          style: const TextStyle(fontSize: 30, fontWeight: FontWeight.bold, color: Colors.white)),
                                    ),
                            ),
                            if (isActive)
                              Positioned(
                                bottom: 2,
                                right: 2,
                                child: Container(
                                  width: 20,
                                  height: 20,
                                  decoration: BoxDecoration(
                                    color: AppTheme.successGreen,
                                    shape: BoxShape.circle,
                                    border: Border.all(color: Colors.white, width: 2),
                                  ),
                                  child: const Icon(Icons.verified_rounded, color: Colors.white, size: 12),
                                ),
                              ),
                          ],
                        ),
                        const SizedBox(height: 12),

                        Text(
                          name.isNotEmpty ? name : 'Rider',
                          style: const TextStyle(
                            fontSize: 20,
                            fontWeight: FontWeight.w700,
                            color: Colors.white,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          phone.isNotEmpty ? phone : email,
                          style: TextStyle(fontSize: 13, color: Colors.white.withOpacity(0.75)),
                        ),
                        const SizedBox(height: 10),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                          decoration: BoxDecoration(
                            color: Colors.white.withOpacity(0.15),
                            borderRadius: BorderRadius.circular(20),
                            border: Border.all(color: Colors.white.withOpacity(0.25)),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              if (isVerified) ...[
                                const Icon(Icons.verified_rounded,
                                    size: 13, color: Color(0xFFFFC93C)),
                                const SizedBox(width: 4),
                              ],
                              Text(
                            isVerified
                                ? 'Verified & Trusted'
                                : isActive
                                    ? 'Approved Rider'
                                    : 'Pending Approval',
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 11,
                              fontWeight: FontWeight.w600,
                            ),
                              ),
                            ],
                          ),
                        ),
                        // Admin asked for something — show it prominently
                        if (infoRequested != null && infoRequested.isNotEmpty) ...[
                          const SizedBox(height: 10),
                          Container(
                            padding: const EdgeInsets.all(10),
                            decoration: BoxDecoration(
                              color: Colors.amber.withValues(alpha: 0.18),
                              borderRadius: BorderRadius.circular(10),
                              border: Border.all(color: Colors.amber.withValues(alpha: 0.5)),
                            ),
                            child: Row(
                              children: [
                                const Icon(Icons.info_outline_rounded,
                                    color: Colors.amber, size: 16),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: Text(infoRequested,
                                      style: const TextStyle(
                                          color: Colors.white, fontSize: 12)),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                ),
              ),
            ),

            SliverPadding(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 120),
              sliver: SliverList(
                delegate: SliverChildListDelegate([

                  // ── Stats Row ────────────────────────────────────────────
                  Row(
                    children: [
                      _StatCard(
                        icon: Icons.star_rounded,
                        color: AppTheme.warningAmber,
                        value: rating.toStringAsFixed(1),
                        label: 'Rating',
                      ),
                      const SizedBox(width: 10),
                      _StatCard(
                        icon: Icons.local_shipping_rounded,
                        color: AppTheme.primary,
                        value: '$totalDeliveries',
                        label: 'Deliveries',
                      ),
                      const SizedBox(width: 10),
                      _StatCard(
                        icon: Icons.calendar_today_rounded,
                        color: AppTheme.infoBlue,
                        value: memberSince,
                        label: 'Since',
                      ),
                    ],
                  ),
                  const SizedBox(height: 20),

                  // ── Quick Nav ────────────────────────────────────────────
                  Row(
                    children: [
                      _QuickTile(
                        icon: Icons.account_balance_wallet_rounded,
                        label: 'Earnings',
                        color: AppTheme.primary,
                        onTap: () => context.go('/earnings'),
                      ),
                      const SizedBox(width: 10),
                      _QuickTile(
                        icon: Icons.bar_chart_rounded,
                        label: 'Analytics',
                        color: AppTheme.infoBlue,
                        onTap: () {},
                      ),
                      const SizedBox(width: 10),
                      _QuickTile(
                        icon: Icons.headset_mic_rounded,
                        label: 'Support',
                        color: AppTheme.warningAmber,
                        onTap: () {},
                      ),
                    ],
                  ),
                  const SizedBox(height: 20),

                  // ── Account ──────────────────────────────────────────────
                  _SectionCard(
                    title: 'Account',
                    items: [
                      _SectionItem(
                        icon: Icons.person_outline_rounded,
                        iconBg: AppTheme.primary.withOpacity(0.1),
                        iconColor: AppTheme.primary,
                        title: 'Personal Info',
                        subtitle: name.isNotEmpty ? name : 'Not set',
                        onTap: () => _showPersonalInfo(context, user),
                      ),
                      _SectionItem(
                        icon: Icons.two_wheeler_rounded,
                        iconBg: AppTheme.infoBlue.withOpacity(0.1),
                        iconColor: AppTheme.infoBlue,
                        title: 'Vehicle Info',
                        subtitle: _vehicleLabel(vehicleType) + (licensePlate.isNotEmpty ? ' · $licensePlate' : ''),
                        onTap: () => _showVehicleInfo(context, riderProfile),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),

                  // ── Security ─────────────────────────────────────────────
                  _SectionCard(
                    title: 'Security',
                    items: [],
                    extra: FutureBuilder<bool>(
                      future: BiometricService.isAvailable(),
                      builder: (context, snap) {
                        if (snap.data != true) return const SizedBox.shrink();
                        return _BiometricRow(auth: auth);
                      },
                    ),
                  ),
                  const SizedBox(height: 12),

                  // ── App Info ─────────────────────────────────────────────
                  _SectionCard(
                    title: 'App',
                    items: [
                      _SectionItem(
                        icon: Icons.info_outline_rounded,
                        iconBg: AppTheme.textTertiary.withOpacity(0.1),
                        iconColor: AppTheme.textSecondary,
                        title: 'About TotalStore Rider',
                        subtitle: 'Version 2.0',
                        onTap: () {},
                        showChevron: false,
                      ),
                    ],
                  ),
                  const SizedBox(height: 20),

                  // ── Sign Out ─────────────────────────────────────────────
                  GestureDetector(
                    onTap: () => _confirmLogout(context, auth),
                    child: Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: AppTheme.dangerRed.withOpacity(0.06),
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: AppTheme.dangerRed.withOpacity(0.15)),
                      ),
                      child: Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(8),
                            decoration: BoxDecoration(
                              color: AppTheme.dangerRed.withOpacity(0.1),
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: Icon(Icons.logout_rounded, color: AppTheme.dangerRed, size: 18),
                          ),
                          const SizedBox(width: 14),
                          Text(
                            'Sign Out',
                            style: TextStyle(
                              color: AppTheme.dangerRed,
                              fontWeight: FontWeight.w600,
                              fontSize: 15,
                            ),
                          ),
                          const Spacer(),
                          Icon(Icons.chevron_right_rounded, color: AppTheme.dangerRed.withOpacity(0.5), size: 20),
                        ],
                      ),
                    ),
                  ),
                ]),
              ),
            ),
          ],
        ),
      );
    });
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────

  String _vehicleLabel(String? type) {
    switch (type) {
      case 'MOTORCYCLE': return 'Bodaboda';
      case 'BICYCLE': return 'Bicycle';
      case 'CAR': return 'Car';
      case 'WALKING': return 'Walking Courier';
      default: return type ?? 'Not set';
    }
  }

  String _formatDate(String iso) {
    try {
      final dt = DateTime.parse(iso);
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return '${months[dt.month - 1]} ${dt.year}';
    } catch (_) {
      return 'N/A';
    }
  }

  void _showPersonalInfo(BuildContext context, Map<String, dynamic> user) {
    _showInfoSheet(context, 'Personal Information', [
      _InfoRow('Name', '${user['firstName'] ?? ''} ${user['lastName'] ?? ''}'.trim()),
      _InfoRow('Phone', user['phone'] ?? 'Not set'),
      _InfoRow('Email', user['email'] ?? 'Not set'),
      _InfoRow('Member Since', user['createdAt'] != null ? _formatDate(user['createdAt'].toString()) : 'Unknown'),
    ]);
  }

  void _showVehicleInfo(BuildContext context, Map<String, dynamic> riderProfile) {
    _showInfoSheet(context, 'Vehicle Information', [
      _InfoRow('Vehicle Type', _vehicleLabel(riderProfile['vehicleType'] as String?)),
      _InfoRow('License Plate', riderProfile['vehiclePlate'] ?? riderProfile['licensePlate'] ?? 'Not set'),
      _InfoRow('Status', riderProfile['status'] ?? 'Unknown'),
    ]);
  }

  void _showInfoSheet(BuildContext context, String title, List<_InfoRow> rows) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => Container(
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        ),
        padding: const EdgeInsets.fromLTRB(24, 20, 24, 40),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: Container(
                width: 40, height: 4,
                margin: const EdgeInsets.only(bottom: 20),
                decoration: BoxDecoration(
                  color: AppTheme.divider,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            Text(title, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700, color: AppTheme.textPrimary)),
            const SizedBox(height: 20),
            ...rows.map((r) => Padding(
              padding: const EdgeInsets.only(bottom: 16),
              child: Row(
                children: [
                  SizedBox(
                    width: 110,
                    child: Text(r.label, style: const TextStyle(fontSize: 13, color: AppTheme.textSecondary)),
                  ),
                  Expanded(
                    child: Text(
                      r.value.isNotEmpty ? r.value : 'Not set',
                      style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: AppTheme.textPrimary),
                    ),
                  ),
                ],
              ),
            )),
          ],
        ),
      ),
    );
  }

  void _confirmLogout(BuildContext context, AuthProvider auth) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (ctx) => Container(
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        ),
        padding: const EdgeInsets.fromLTRB(24, 20, 24, 40),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Center(
              child: Container(
                width: 40, height: 4,
                margin: const EdgeInsets.only(bottom: 20),
                decoration: BoxDecoration(color: AppTheme.divider, borderRadius: BorderRadius.circular(2)),
              ),
            ),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppTheme.dangerRed.withOpacity(0.08),
                shape: BoxShape.circle,
              ),
              child: Icon(Icons.logout_rounded, color: AppTheme.dangerRed, size: 28),
            ),
            const SizedBox(height: 16),
            const Text('Sign Out', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700, color: AppTheme.textPrimary)),
            const SizedBox(height: 8),
            const Text(
              "You'll need to sign back in to accept deliveries",
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 13, color: AppTheme.textSecondary, height: 1.5),
            ),
            const SizedBox(height: 24),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: () => Navigator.pop(ctx),
                    style: OutlinedButton.styleFrom(
                      side: BorderSide(color: AppTheme.divider),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                      padding: const EdgeInsets.symmetric(vertical: 14),
                    ),
                    child: const Text('Cancel', style: TextStyle(color: AppTheme.textSecondary, fontWeight: FontWeight.w600)),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: FilledButton(
                    onPressed: () async {
                      Navigator.pop(ctx);
                      await auth.logout();
                      if (context.mounted) context.go('/login');
                    },
                    style: FilledButton.styleFrom(
                      backgroundColor: AppTheme.dangerRed,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                      padding: const EdgeInsets.symmetric(vertical: 14),
                    ),
                    child: const Text('Sign Out', style: TextStyle(fontWeight: FontWeight.w700)),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

// ─── Online Pill ──────────────────────────────────────────────────────────────

class _OnlinePill extends StatelessWidget {
  final bool isOnline;
  const _OnlinePill({required this.isOnline});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.15),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.white.withOpacity(0.25)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 7,
            height: 7,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: isOnline ? const Color(0xFF4ADE80) : Colors.white54,
            ),
          ),
          const SizedBox(width: 6),
          Text(
            isOnline ? 'Online' : 'Offline',
            style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w600),
          ),
        ],
      ),
    );
  }
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

class _StatCard extends StatelessWidget {
  final IconData icon;
  final Color color;
  final String value;
  final String label;
  const _StatCard({required this.icon, required this.color, required this.value, required this.label});

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 10),
        decoration: BoxDecoration(
          color: AppTheme.surface,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppTheme.divider),
          boxShadow: AppTheme.cardShadow,
        ),
        child: Column(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: color.withOpacity(0.1),
                shape: BoxShape.circle,
              ),
              child: Icon(icon, color: color, size: 18),
            ),
            const SizedBox(height: 8),
            Text(
              value,
              style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15, color: color),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
            const SizedBox(height: 2),
            Text(label, style: const TextStyle(fontSize: 10, color: AppTheme.textTertiary, fontWeight: FontWeight.w500)),
          ],
        ),
      ),
    );
  }
}

// ─── Quick Tile ───────────────────────────────────────────────────────────────

class _QuickTile extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;
  final VoidCallback onTap;
  const _QuickTile({required this.icon, required this.label, required this.color, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: GestureDetector(
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 14),
          decoration: BoxDecoration(
            color: color.withOpacity(0.08),
            borderRadius: BorderRadius.circular(14),
          ),
          child: Column(
            children: [
              Icon(icon, color: color, size: 22),
              const SizedBox(height: 6),
              Text(label, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: color)),
            ],
          ),
        ),
      ),
    );
  }
}

// ─── Section Card ─────────────────────────────────────────────────────────────

class _SectionCard extends StatelessWidget {
  final String title;
  final List<_SectionItem> items;
  final Widget? extra;
  const _SectionCard({required this.title, required this.items, this.extra});

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: AppTheme.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppTheme.divider),
        boxShadow: AppTheme.cardShadow,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 14, 16, 6),
            child: Text(
              title.toUpperCase(),
              style: const TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w700,
                color: AppTheme.textTertiary,
                letterSpacing: 0.8,
              ),
            ),
          ),
          ...items.map((item) => _buildItem(item, items.last == item)),
          if (extra != null) extra!,
          const SizedBox(height: 4),
        ],
      ),
    );
  }

  Widget _buildItem(_SectionItem item, bool isLast) {
    return Column(
      children: [
        ListTile(
          contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 2),
          leading: Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(
              color: item.iconBg,
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(item.icon, color: item.iconColor, size: 18),
          ),
          title: Text(item.title, style: const TextStyle(fontWeight: FontWeight.w500, fontSize: 14, color: AppTheme.textPrimary)),
          subtitle: item.subtitle != null && item.subtitle!.isNotEmpty
              ? Text(item.subtitle!, style: const TextStyle(fontSize: 12, color: AppTheme.textSecondary), maxLines: 1, overflow: TextOverflow.ellipsis)
              : null,
          trailing: item.showChevron
              ? const Icon(Icons.chevron_right_rounded, size: 18, color: AppTheme.textTertiary)
              : null,
          onTap: item.onTap,
        ),
        if (!isLast)
          Divider(height: 1, indent: 68, endIndent: 0, color: AppTheme.divider),
      ],
    );
  }
}

// ─── Biometric Row ────────────────────────────────────────────────────────────

class _BiometricRow extends StatelessWidget {
  final AuthProvider auth;
  const _BiometricRow({required this.auth});

  @override
  Widget build(BuildContext context) {
    return SwitchListTile(
      contentPadding: const EdgeInsets.symmetric(horizontal: 16),
      secondary: Container(
        width: 36,
        height: 36,
        decoration: BoxDecoration(
          color: AppTheme.primary.withOpacity(0.1),
          borderRadius: BorderRadius.circular(10),
        ),
        child: Icon(Icons.fingerprint_rounded, color: AppTheme.primary, size: 18),
      ),
      title: const Text('Biometric Login', style: TextStyle(fontWeight: FontWeight.w500, fontSize: 14, color: AppTheme.textPrimary)),
      subtitle: const Text('Use fingerprint or Face ID to sign in', style: TextStyle(fontSize: 12)),
      value: auth.isBiometricEnabled,
      activeColor: AppTheme.primary,
      onChanged: (v) => v ? auth.enableBiometrics() : auth.disableBiometrics(),
    );
  }
}

// ─── Data classes ─────────────────────────────────────────────────────────────

class _SectionItem {
  final IconData icon;
  final Color iconBg;
  final Color iconColor;
  final String title;
  final String? subtitle;
  final VoidCallback onTap;
  final bool showChevron;

  const _SectionItem({
    required this.icon,
    required this.iconBg,
    required this.iconColor,
    required this.title,
    this.subtitle,
    required this.onTap,
    this.showChevron = true,
  });
}

class _InfoRow {
  final String label;
  final String value;
  const _InfoRow(this.label, this.value);
}
