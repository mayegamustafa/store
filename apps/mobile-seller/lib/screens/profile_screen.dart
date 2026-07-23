import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../core/theme.dart';
import '../core/services/update_service.dart';
import '../providers/auth_provider.dart';
import '../core/i18n/app_i18n.dart';

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final user = auth.user;

    return Scaffold(
      appBar: AppBar(title: const Text('Profile')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Store card
          Card(
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                children: [
                  CircleAvatar(
                    radius: 40,
                    backgroundColor: AppTheme.primary.withValues(alpha: 0.1),
                    child: Text(
                      auth.storeName.isNotEmpty
                          ? auth.storeName[0].toUpperCase()
                          : 'S',
                      style: const TextStyle(
                          fontSize: 28,
                          fontWeight: FontWeight.bold,
                          color: AppTheme.primary),
                    ),
                  ),
                  const SizedBox(height: 12),
                  Text(auth.storeName,
                      style: const TextStyle(
                          fontSize: 20, fontWeight: FontWeight.bold)),
                  if (user?['email'] != null) ...[
                    const SizedBox(height: 4),
                    Text(user!['email'],
                        style: const TextStyle(
                            color: AppTheme.textSecondary, fontSize: 14)),
                  ],
                  if (user?['phone'] != null) ...[
                    const SizedBox(height: 2),
                    Text(user!['phone'],
                        style: const TextStyle(
                            color: AppTheme.textSecondary, fontSize: 14)),
                  ],
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          // Info section
          Card(
            child: Column(
              children: [
                _ProfileTile(
                  icon: Icons.storefront_rounded,
                  title: 'Store Name',
                  subtitle: auth.storeName,
                ),
                const Divider(height: 1),
                _ProfileTile(
                  icon: Icons.badge_outlined,
                  title: 'Role',
                  subtitle: user?['role'] ?? 'SELLER',
                ),
                const Divider(height: 1),
                _ProfileTile(
                  icon: Icons.calendar_today_outlined,
                  title: 'Member Since',
                  subtitle: user?['createdAt'] != null
                      ? DateTime.parse(user!['createdAt'])
                          .toLocal()
                          .toString()
                          .split(' ')
                          .first
                      : 'N/A',
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          // Actions
          Card(
            child: Column(
              children: [
                ListTile(
                  leading: const Icon(Icons.translate_rounded),
                  title: Text(T.t('language')),
                  trailing: const Icon(Icons.chevron_right_rounded),
                  onTap: () => showLanguagePicker(
                      context, context.read<LocaleProvider>()),
                ),
                const Divider(height: 1),
                ListTile(
                  leading: const Icon(Icons.help_outline_rounded),
                  title: const Text('Help & Support'),
                  trailing: const Icon(Icons.chevron_right_rounded),
                  onTap: () {},
                ),
                const Divider(height: 1),
                ListTile(
                  leading: const Icon(Icons.system_update_rounded),
                  title: const Text('Check for updates'),
                  trailing: const Icon(Icons.chevron_right_rounded),
                  onTap: () => UpdateService.checkForUpdate(context, manual: true),
                ),
                const Divider(height: 1),
                ListTile(
                  leading: const Icon(Icons.info_outline_rounded),
                  title: const Text('About'),
                  trailing: const Text('v2.0.0',
                      style: TextStyle(color: AppTheme.textSecondary)),
                  onTap: () {},
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),
          SizedBox(
            height: 52,
            child: OutlinedButton.icon(
              onPressed: () async {
                final confirmed = await showDialog<bool>(
                  context: context,
                  builder: (ctx) => AlertDialog(
                    title: const Text('Sign Out'),
                    content:
                        const Text('Are you sure you want to sign out?'),
                    actions: [
                      TextButton(
                          onPressed: () => Navigator.pop(ctx, false),
                          child: const Text('Cancel')),
                      FilledButton(
                          onPressed: () => Navigator.pop(ctx, true),
                          child: const Text('Sign Out')),
                    ],
                  ),
                );
                if (confirmed == true && context.mounted) {
                  await context.read<AuthProvider>().logout();
                  if (context.mounted) context.go('/login');
                }
              },
              icon: const Icon(Icons.logout_rounded),
              label: const Text('Sign Out'),
              style: OutlinedButton.styleFrom(
                foregroundColor: AppTheme.error,
                side: const BorderSide(color: AppTheme.error),
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12)),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _ProfileTile extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  const _ProfileTile(
      {required this.icon, required this.title, required this.subtitle});

  @override
  Widget build(BuildContext context) {
    return ListTile(
      leading: Icon(icon, color: AppTheme.primary),
      title: Text(title,
          style: const TextStyle(fontSize: 13, color: AppTheme.textSecondary)),
      subtitle: Text(subtitle,
          style:
              const TextStyle(fontWeight: FontWeight.w500, fontSize: 15)),
    );
  }
}
