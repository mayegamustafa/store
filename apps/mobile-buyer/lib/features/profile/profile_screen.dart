import 'dart:io';
import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:image_picker/image_picker.dart';
import 'package:geolocator/geolocator.dart';
import 'package:geocoding/geocoding.dart';
import '../../core/api/api_service.dart';
import '../../core/services/app_config.dart';
import '../../core/theme.dart';
import '../../core/utils/helpers.dart';
import '../../core/models/address.dart';
import '../auth/auth_provider.dart';
import '../settings/settings_provider.dart';
import '../auth/login_screen.dart';
import '../wishlist/wishlist_screen.dart';
import '../orders/orders_screen.dart';
import '../wallet/wallet_screen.dart';
import '../support/help_center_screen.dart';
import '../support/live_chat_screen.dart';
import '../support/about_screen.dart';
import '../../core/i18n/app_i18n.dart';

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.backgroundColor,
      appBar: AppBar(
        title: const Text('Account'),
        automaticallyImplyLeading: false,
      ),
      body: Consumer<AuthProvider>(
        builder: (context, auth, _) {
          if (!auth.isAuthenticated) {
            return _buildUnauthenticated(context);
          }
          return _buildProfile(context, auth);
        },
      ),
    );
  }

  Widget _buildUnauthenticated(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.person_outline_rounded, size: 80, color: AppTheme.textTertiary.withValues(alpha: 0.5)),
            const SizedBox(height: 16),
            const Text('Sign in to your account', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600)),
            const SizedBox(height: 8),
            Text('Manage orders, addresses, and more', style: TextStyle(color: AppTheme.textSecondary)),
            const SizedBox(height: 24),
            SizedBox(
              width: double.infinity,
              child: FilledButton(
                onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const LoginScreen())),
                style: FilledButton.styleFrom(
                  backgroundColor: AppTheme.primaryColor,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                ),
                child: const Text('Sign In', style: TextStyle(fontSize: 16)),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildProfile(BuildContext context, AuthProvider auth) {
    final user = auth.user!;
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        // Avatar & Name
        Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            boxShadow: [AppTheme.cardShadow],
          ),
          child: Row(
            children: [
              CircleAvatar(
                radius: 32,
                backgroundColor: AppTheme.primaryColor.withValues(alpha: 0.1),
                backgroundImage: user.avatar != null
                    ? CachedNetworkImageProvider(resolveImageUrl(user.avatar))
                    : null,
                child: user.avatar == null
                    ? Text(user.initials, style: TextStyle(fontSize: 22, fontWeight: FontWeight.w700, color: AppTheme.primaryColor))
                    : null,
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(user.displayName, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
                    const SizedBox(height: 4),
                    if (user.email != null)
                      Text(user.email!, style: TextStyle(fontSize: 13, color: AppTheme.textSecondary)),
                    if (user.phone != null)
                      Text(user.phone!, style: TextStyle(fontSize: 13, color: AppTheme.textSecondary)),
                  ],
                ),
              ),
            ],
          ),
        ),

        const SizedBox(height: 16),

        // Wallet & Loyalty - tappable
        GestureDetector(
          onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const WalletScreen())),
          child: Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              gradient: AppTheme.primaryGradient,
              borderRadius: BorderRadius.circular(16),
            ),
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    children: [
                      const Icon(Icons.account_balance_wallet_rounded, color: Colors.white, size: 28),
                      const SizedBox(height: 8),
                      Text(formatCurrency(user.walletBalance),
                          style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w700)),
                      const Text('Wallet', style: TextStyle(color: Colors.white70, fontSize: 12)),
                    ],
                  ),
                ),
                Container(width: 1, height: 50, color: Colors.white24),
                Expanded(
                  child: Column(
                    children: [
                      const Icon(Icons.stars_rounded, color: Colors.white, size: 28),
                      const SizedBox(height: 8),
                      Text('${user.loyaltyPoints}',
                          style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w700)),
                      const Text('Points', style: TextStyle(color: Colors.white70, fontSize: 12)),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),

        const SizedBox(height: 16),

        // Menu items
        _buildMenuSection('My Account', [
          _MenuItem(Icons.person_outline_rounded, 'Edit Profile', () => _editProfile(context, auth)),
          _MenuItem(Icons.location_on_outlined, 'My Addresses', () => _showAddresses(context)),
          _MenuItem(Icons.receipt_long_outlined, 'My Orders', () {
            Navigator.push(context, MaterialPageRoute(builder: (_) => const OrdersScreen()));
          }),
          _MenuItem(Icons.favorite_outline_rounded, 'Wishlist', () {
            Navigator.pushNamed(context, '/wishlist');
          }),
        ]),

        const SizedBox(height: 12),

        // Currency
        _buildMenuSection('Preferences', [
          _MenuItem(Icons.currency_exchange_rounded, 'Currency', () => _showCurrencyPicker(context)),
          _MenuItem(Icons.translate_rounded, T.t('language'),
              () => showLanguagePicker(context, context.read<LocaleProvider>())),
        ]),

        const SizedBox(height: 12),

        _buildMenuSection('Support', [
          _MenuItem(Icons.help_outline_rounded, 'Help Center', () {
            Navigator.push(context, MaterialPageRoute(builder: (_) => const HelpCenterScreen()));
          }),
          _MenuItem(Icons.chat_outlined, 'Live Chat', () {
            Navigator.push(context, MaterialPageRoute(builder: (_) => const LiveChatScreen()));
          }),
          _MenuItem(Icons.info_outline_rounded, 'About', () {
            Navigator.push(context, MaterialPageRoute(builder: (_) => const AboutScreen()));
          }),
        ]),

        const SizedBox(height: 12),

        // Logout
        Container(
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            boxShadow: [AppTheme.cardShadow],
          ),
          child: ListTile(
            leading: Icon(Icons.logout_rounded, color: AppTheme.errorColor),
            title: Text('Sign Out', style: TextStyle(color: AppTheme.errorColor, fontWeight: FontWeight.w600)),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            onTap: () => _confirmLogout(context, auth),
          ),
        ),

        const SizedBox(height: 32),
      ],
    );
  }

  Widget _buildMenuSection(String title, List<_MenuItem> items) {
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
            child: Text(title, style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppTheme.textTertiary)),
          ),
          ...items.map((item) => ListTile(
                leading: Icon(item.icon, color: AppTheme.textSecondary),
                title: Text(item.label, style: const TextStyle(fontSize: 15)),
                trailing: const Icon(Icons.chevron_right_rounded, size: 20, color: AppTheme.textTertiary),
                onTap: item.onTap,
              )),
          const SizedBox(height: 8),
        ],
      ),
    );
  }

  void _editProfile(BuildContext context, AuthProvider auth) {
    final user = auth.user!;
    final firstNameCtrl = TextEditingController(text: user.firstName ?? '');
    final lastNameCtrl = TextEditingController(text: user.lastName ?? '');
    String? selectedImagePath;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setModalState) => Padding(
          padding: EdgeInsets.fromLTRB(24, 24, 24, MediaQuery.of(ctx).viewInsets.bottom + 24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('Edit Profile', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w700)),
              const SizedBox(height: 20),

              // Avatar picker
              Center(
                child: GestureDetector(
                  onTap: () async {
                    final source = await showModalBottomSheet<ImageSource>(
                      context: ctx,
                      builder: (c) => SafeArea(
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            ListTile(
                              leading: const Icon(Icons.camera_alt_rounded),
                              title: const Text('Camera'),
                              onTap: () => Navigator.pop(c, ImageSource.camera),
                            ),
                            ListTile(
                              leading: const Icon(Icons.photo_library_rounded),
                              title: const Text('Gallery'),
                              onTap: () => Navigator.pop(c, ImageSource.gallery),
                            ),
                          ],
                        ),
                      ),
                    );
                    if (source == null) return;
                    final picked = await ImagePicker().pickImage(
                      source: source,
                      maxWidth: 512,
                      maxHeight: 512,
                      imageQuality: 80,
                    );
                    if (picked != null) {
                      setModalState(() => selectedImagePath = picked.path);
                    }
                  },
                  child: Stack(
                    children: [
                      CircleAvatar(
                        radius: 45,
                        backgroundColor: AppTheme.primaryColor.withValues(alpha: 0.1),
                        backgroundImage: selectedImagePath != null
                            ? FileImage(File(selectedImagePath!))
                            : (user.avatar != null
                                ? CachedNetworkImageProvider(resolveImageUrl(user.avatar))
                                : null) as ImageProvider?,
                        child: selectedImagePath == null && user.avatar == null
                            ? Text(user.initials,
                                style: TextStyle(fontSize: 28, fontWeight: FontWeight.w700, color: AppTheme.primaryColor))
                            : null,
                      ),
                      Positioned(
                        bottom: 0,
                        right: 0,
                        child: Container(
                          padding: const EdgeInsets.all(6),
                          decoration: BoxDecoration(
                            color: AppTheme.primaryColor,
                            shape: BoxShape.circle,
                            border: Border.all(color: Colors.white, width: 2),
                          ),
                          child: const Icon(Icons.camera_alt_rounded, color: Colors.white, size: 16),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 20),

              TextField(
                controller: firstNameCtrl,
                decoration: const InputDecoration(labelText: 'First Name'),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: lastNameCtrl,
                decoration: const InputDecoration(labelText: 'Last Name'),
              ),
              const SizedBox(height: 24),
              SizedBox(
                width: double.infinity,
                child: FilledButton(
                  onPressed: () async {
                    String? avatarUrl;
                    // Upload image if selected
                    if (selectedImagePath != null) {
                      try {
                        final api = ApiService();
                        final formData = FormData.fromMap({
                          'file': await MultipartFile.fromFile(selectedImagePath!, filename: 'avatar.jpg'),
                        });
                        final uploadRes = await api.dio.post('/upload/single', data: formData);
                        final uploadData = api.extractData(uploadRes);
                        avatarUrl = uploadData['url'] ?? uploadData['path'] ?? uploadData['filename'];
                      } catch (_) {}
                    }
                    await auth.updateProfile(
                      firstName: firstNameCtrl.text.trim(),
                      lastName: lastNameCtrl.text.trim(),
                      avatar: avatarUrl,
                    );
                    if (ctx.mounted) Navigator.pop(ctx);
                  },
                  style: FilledButton.styleFrom(
                    backgroundColor: AppTheme.primaryColor,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  ),
                  child: const Text('Save'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _showAddresses(BuildContext context) {
    final settings = context.read<SettingsProvider>();
    settings.fetchAddresses();
    Navigator.push(context, MaterialPageRoute(builder: (_) => const _AddressManagementScreen()));
  }

  void _showCurrencyPicker(BuildContext context) {
    final currencies = ['UGX', 'KES', 'USD', 'EUR', 'GBP', 'TZS', 'RWF'];
    final settings = context.read<SettingsProvider>();

    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Padding(
              padding: EdgeInsets.fromLTRB(24, 24, 24, 8),
              child: Text('Select Currency', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w700)),
            ),
            ...currencies.map((c) => ListTile(
                  contentPadding: const EdgeInsets.symmetric(horizontal: 24),
                  leading: Icon(
                    Icons.currency_exchange_rounded,
                    color: c == settings.currency ? AppTheme.primaryColor : AppTheme.textTertiary,
                  ),
                  title: Text(c, style: TextStyle(
                    fontWeight: c == settings.currency ? FontWeight.w700 : FontWeight.w400,
                    color: c == settings.currency ? AppTheme.primaryColor : AppTheme.textPrimary,
                  )),
                  trailing: c == settings.currency
                      ? Icon(Icons.check_circle_rounded, color: AppTheme.primaryColor)
                      : null,
                  onTap: () {
                    settings.setCurrency(c);
                    Navigator.pop(ctx);
                  },
                )),
            const SizedBox(height: 16),
          ],
        ),
      ),
    );
  }

  void _confirmLogout(BuildContext context, AuthProvider auth) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Sign Out'),
        content: const Text('Are you sure you want to sign out?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          FilledButton(
            onPressed: () {
              Navigator.pop(ctx);
              auth.logout();
            },
            style: FilledButton.styleFrom(backgroundColor: AppTheme.errorColor),
            child: const Text('Sign Out'),
          ),
        ],
      ),
    );
  }
}

// Full-screen address management
class _AddressManagementScreen extends StatelessWidget {
  const _AddressManagementScreen();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.backgroundColor,
      appBar: AppBar(
        title: const Text('My Addresses'),
        actions: [
          IconButton(
            icon: const Icon(Icons.add_rounded),
            onPressed: () => _showAddAddress(context),
          ),
        ],
      ),
      body: Consumer<SettingsProvider>(
        builder: (_, sp, __) {
          if (sp.isLoading) return const Center(child: CircularProgressIndicator());
          if (sp.addresses.isEmpty) {
            return Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.location_off_rounded, size: 64, color: AppTheme.textTertiary.withValues(alpha: 0.5)),
                  const SizedBox(height: 16),
                  const Text('No addresses saved', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
                  const SizedBox(height: 8),
                  Text('Add a delivery address to get started', style: TextStyle(color: AppTheme.textSecondary)),
                  const SizedBox(height: 20),
                  FilledButton.icon(
                    onPressed: () => _showAddAddress(context),
                    icon: const Icon(Icons.add),
                    label: const Text('Add Address'),
                    style: FilledButton.styleFrom(backgroundColor: AppTheme.primaryColor),
                  ),
                ],
              ),
            );
          }
          return RefreshIndicator(
            onRefresh: () => sp.fetchAddresses(),
            child: ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: sp.addresses.length,
              itemBuilder: (_, i) => _buildAddressCard(context, sp, sp.addresses[i]),
            ),
          );
        },
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => _showAddAddress(context),
        backgroundColor: AppTheme.primaryColor,
        child: const Icon(Icons.add, color: Colors.white),
      ),
    );
  }

  Widget _buildAddressCard(BuildContext context, SettingsProvider sp, Address addr) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: addr.isDefault ? AppTheme.primaryColor.withValues(alpha: 0.05) : Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: addr.isDefault ? AppTheme.primaryColor.withValues(alpha: 0.3) : AppTheme.dividerColor,
        ),
        boxShadow: [AppTheme.cardShadow],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.location_on_outlined,
                  color: addr.isDefault ? AppTheme.primaryColor : AppTheme.textTertiary),
              const SizedBox(width: 8),
              Expanded(
                child: Row(
                  children: [
                    Text(addr.label ?? 'Address',
                        style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
                    if (addr.isDefault) ...[
                      const SizedBox(width: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
                        decoration: BoxDecoration(
                          color: AppTheme.primaryColor.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text('Default',
                            style: TextStyle(fontSize: 10, color: AppTheme.primaryColor, fontWeight: FontWeight.w600)),
                      ),
                    ],
                  ],
                ),
              ),
              PopupMenuButton<String>(
                itemBuilder: (_) => [
                  if (!addr.isDefault)
                    const PopupMenuItem(value: 'default', child: Text('Set as Default')),
                  const PopupMenuItem(value: 'delete', child: Text('Delete', style: TextStyle(color: Colors.red))),
                ],
                onSelected: (action) async {
                  if (action == 'default') {
                    await sp.setDefaultAddress(addr.id);
                  } else if (action == 'delete') {
                    final confirmed = await showDialog<bool>(
                      context: context,
                      builder: (ctx) => AlertDialog(
                        title: const Text('Delete Address'),
                        content: const Text('Are you sure?'),
                        actions: [
                          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
                          FilledButton(
                            onPressed: () => Navigator.pop(ctx, true),
                            style: FilledButton.styleFrom(backgroundColor: AppTheme.errorColor),
                            child: const Text('Delete'),
                          ),
                        ],
                      ),
                    );
                    if (confirmed == true) await sp.deleteAddress(addr.id);
                  }
                },
              ),
            ],
          ),
          const SizedBox(height: 8),
          if (addr.fullName != null)
            Text(addr.fullName!, style: const TextStyle(fontWeight: FontWeight.w500)),
          Text(addr.formatted, style: TextStyle(fontSize: 13, color: AppTheme.textSecondary)),
          if (addr.phone != null)
            Text(addr.phone!, style: TextStyle(fontSize: 13, color: AppTheme.textSecondary)),
        ],
      ),
    );
  }

  void _showAddAddress(BuildContext context) {
    Navigator.push(context, MaterialPageRoute(builder: (_) => const _AddAddressScreen()));
  }
}

class _AddAddressScreen extends StatefulWidget {
  const _AddAddressScreen();

  @override
  State<_AddAddressScreen> createState() => _AddAddressScreenState();
}

class _AddAddressScreenState extends State<_AddAddressScreen> {
  final _labelCtrl = TextEditingController();
  final _fullNameCtrl = TextEditingController();
  final _phoneCtrl = TextEditingController();
  final _addressLine1Ctrl = TextEditingController();
  final _cityCtrl = TextEditingController();
  final _districtCtrl = TextEditingController();
  final _regionCtrl = TextEditingController();
  double? _latitude;
  double? _longitude;
  bool _gpsLoading = false;
  bool _saving = false;

  @override
  void dispose() {
    _labelCtrl.dispose();
    _fullNameCtrl.dispose();
    _phoneCtrl.dispose();
    _addressLine1Ctrl.dispose();
    _cityCtrl.dispose();
    _districtCtrl.dispose();
    _regionCtrl.dispose();
    super.dispose();
  }

  Future<void> _detectLocation() async {
    setState(() => _gpsLoading = true);
    try {
      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
      }
      if (permission == LocationPermission.deniedForever || permission == LocationPermission.denied) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Location permission is required to auto-detect your address')),
          );
        }
        setState(() => _gpsLoading = false);
        return;
      }

      final position = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
        timeLimit: const Duration(seconds: 15),
      );
      _latitude = position.latitude;
      _longitude = position.longitude;

      // Try Google Maps Geocoding API first (more accurate for Uganda)
      bool resolved = false;
      final googleKey = AppConfig.instance.googleMapsApiKey;
      if (googleKey.isNotEmpty) {
        try {
          final resp = await Dio(BaseOptions(connectTimeout: const Duration(seconds: 8)))
              .get('https://maps.googleapis.com/maps/api/geocode/json', queryParameters: {
            'latlng': '${position.latitude},${position.longitude}',
            'key': googleKey,
            'result_type': 'street_address|route|sublocality|locality',
          });
          if (resp.data?['status'] == 'OK') {
            final results = resp.data['results'] as List?;
            if (results != null && results.isNotEmpty) {
              final components = results[0]['address_components'] as List;
              String street = '', city = '', district = '', region = '';
              for (final c in components) {
                final types = List<String>.from(c['types'] as List);
                final name = c['long_name'] as String;
                if (types.contains('route')) street = name;
                else if (types.contains('street_number') && street.isEmpty) street = name;
                else if (types.contains('sublocality_level_1') || types.contains('neighborhood') || types.contains('sublocality')) {
                  if (street.isEmpty) street = name;
                }
                if (types.contains('locality') || types.contains('administrative_area_level_3')) city = name;
                if (types.contains('administrative_area_level_2')) district = name;
                if (types.contains('administrative_area_level_1')) region = name;
              }
              if (street.isNotEmpty || city.isNotEmpty) {
                _addressLine1Ctrl.text = street.isNotEmpty ? street : city;
                _cityCtrl.text = city;
                _districtCtrl.text = district;
                _regionCtrl.text = region;
                resolved = true;
              }
            }
          }
        } catch (_) {}
      }

      // Fallback to native geocoding
      if (!resolved) {
        try {
          final placemarks = await placemarkFromCoordinates(position.latitude, position.longitude);
          if (placemarks.isNotEmpty) {
            final p = placemarks.first;
            final streetParts = [p.street, p.subLocality].where((s) => s != null && s!.isNotEmpty).join(', ');
            _addressLine1Ctrl.text = streetParts.isNotEmpty ? streetParts : (p.locality ?? '');
            _cityCtrl.text = p.locality ?? p.subAdministrativeArea ?? '';
            _districtCtrl.text = p.subAdministrativeArea ?? p.administrativeArea ?? '';
            _regionCtrl.text = p.administrativeArea ?? '';
          }
        } catch (_) {}
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Could not detect location: ${e.toString().split(':').first}')),
        );
      }
    }
    if (mounted) setState(() => _gpsLoading = false);
  }

  Future<void> _save() async {
    if (_addressLine1Ctrl.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter an address')),
      );
      return;
    }
    setState(() => _saving = true);
    final sp = context.read<SettingsProvider>();
    final address = Address(
      id: '',
      label: _labelCtrl.text.trim().isNotEmpty ? _labelCtrl.text.trim() : 'Home',
      fullName: _fullNameCtrl.text.trim().isNotEmpty ? _fullNameCtrl.text.trim() : null,
      phone: _phoneCtrl.text.trim().isNotEmpty ? _phoneCtrl.text.trim() : null,
      addressLine1: _addressLine1Ctrl.text.trim(),
      city: _cityCtrl.text.trim().isNotEmpty ? _cityCtrl.text.trim() : null,
      district: _districtCtrl.text.trim().isNotEmpty ? _districtCtrl.text.trim() : null,
      region: _regionCtrl.text.trim().isNotEmpty ? _regionCtrl.text.trim() : null,
      country: 'Uganda',
      latitude: _latitude,
      longitude: _longitude,
    );
    final ok = await sp.addAddress(address);
    if (mounted) {
      setState(() => _saving = false);
      if (ok) Navigator.pop(context);
      else ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Failed to save address')));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.backgroundColor,
      appBar: AppBar(title: const Text('Add Address')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // GPS auto-detect
          Container(
            decoration: BoxDecoration(
              gradient: AppTheme.primaryGradient,
              borderRadius: BorderRadius.circular(14),
            ),
            child: ListTile(
              leading: _gpsLoading
                  ? const SizedBox(width: 24, height: 24, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                  : const Icon(Icons.gps_fixed_rounded, color: Colors.white),
              title: const Text('Use Current Location',
                  style: TextStyle(color: Colors.white, fontWeight: FontWeight.w600)),
              subtitle: Text('Auto-fill address from GPS',
                  style: TextStyle(color: Colors.white.withValues(alpha: 0.7), fontSize: 12)),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
              onTap: _gpsLoading ? null : _detectLocation,
            ),
          ),
          if (_latitude != null) ...[
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              decoration: BoxDecoration(
                color: AppTheme.successColor.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Row(
                children: [
                  Icon(Icons.check_circle_rounded, color: AppTheme.successColor, size: 16),
                  const SizedBox(width: 6),
                  Text('GPS: ${_latitude!.toStringAsFixed(5)}, ${_longitude!.toStringAsFixed(5)}',
                      style: TextStyle(fontSize: 12, color: AppTheme.successColor)),
                ],
              ),
            ),
          ],
          const SizedBox(height: 16),
          _field(_labelCtrl, 'Label', hint: 'e.g. Home, Office'),
          _field(_fullNameCtrl, 'Full Name'),
          _field(_phoneCtrl, 'Phone Number', keyboardType: TextInputType.phone),
          _field(_addressLine1Ctrl, 'Street Address'),
          _field(_cityCtrl, 'City'),
          _field(_districtCtrl, 'District'),
          _field(_regionCtrl, 'Region'),
          const SizedBox(height: 24),
          SizedBox(
            width: double.infinity,
            child: FilledButton(
              onPressed: _saving ? null : _save,
              style: FilledButton.styleFrom(
                backgroundColor: AppTheme.primaryColor,
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
              ),
              child: _saving
                  ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                  : const Text('Save Address', style: TextStyle(fontSize: 16)),
            ),
          ),
        ],
      ),
    );
  }

  Widget _field(TextEditingController ctrl, String label,
      {String? hint, TextInputType? keyboardType}) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: TextField(controller: ctrl, keyboardType: keyboardType,
        decoration: InputDecoration(labelText: label, hintText: hint)),
    );
  }
}

class _MenuItem {
  final IconData icon;
  final String label;
  final VoidCallback onTap;
  const _MenuItem(this.icon, this.label, this.onTap);
}
