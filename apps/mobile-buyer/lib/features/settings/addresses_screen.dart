import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:geocoding/geocoding.dart';
import 'package:provider/provider.dart';
import '../../core/models/models.dart';
import '../../core/services/app_config.dart';
import '../../core/theme.dart';
import 'settings_provider.dart';

/// Standalone addresses management screen.
/// Reachable as a named route "/addresses" (e.g. from checkout).
class AddressesScreen extends StatefulWidget {
  const AddressesScreen({super.key});

  @override
  State<AddressesScreen> createState() => _AddressesScreenState();
}

class _AddressesScreenState extends State<AddressesScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<SettingsProvider>().fetchAddresses();
    });
  }

  @override
  Widget build(BuildContext context) {
    final sp = context.watch<SettingsProvider>();

    return Scaffold(
      backgroundColor: AppTheme.backgroundColor,
      appBar: AppBar(title: const Text('Delivery Addresses')),
      body: sp.isLoading && sp.addresses.isEmpty
          ? const Center(child: CircularProgressIndicator())
          : sp.addresses.isEmpty
              ? _buildEmpty()
              : RefreshIndicator(
                  onRefresh: () => sp.fetchAddresses(),
                  child: ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: sp.addresses.length,
                    itemBuilder: (_, i) =>
                        _AddressCard(address: sp.addresses[i]),
                  ),
                ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => Navigator.push(
          context,
          MaterialPageRoute(builder: (_) => const AddAddressScreen()),
        ),
        backgroundColor: AppTheme.primaryColor,
        icon: const Icon(Icons.add, color: Colors.white),
        label: const Text('Add Address',
            style: TextStyle(color: Colors.white, fontWeight: FontWeight.w600)),
      ),
    );
  }

  Widget _buildEmpty() {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.location_off_rounded,
              size: 72, color: AppTheme.textTertiary.withValues(alpha: 0.5)),
          const SizedBox(height: 16),
          Text('No delivery addresses yet',
              style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                  color: AppTheme.textSecondary)),
          const SizedBox(height: 8),
          Text('Add an address to speed up checkout',
              style: TextStyle(fontSize: 13, color: AppTheme.textTertiary)),
          const SizedBox(height: 24),
          FilledButton.icon(
            onPressed: () => Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const AddAddressScreen())),
            icon: const Icon(Icons.add_location_alt_rounded),
            label: const Text('Add Address'),
            style: FilledButton.styleFrom(
                backgroundColor: AppTheme.primaryColor,
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12)),
          ),
        ],
      ),
    );
  }
}

class _AddressCard extends StatelessWidget {
  final Address address;
  const _AddressCard({required this.address});

  @override
  Widget build(BuildContext context) {
    final sp = context.read<SettingsProvider>();
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: address.isDefault
            ? AppTheme.primaryColor.withValues(alpha: 0.05)
            : Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: address.isDefault
              ? AppTheme.primaryColor.withValues(alpha: 0.3)
              : AppTheme.dividerColor,
        ),
        boxShadow: [AppTheme.cardShadow],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.location_on_rounded,
                  color: address.isDefault
                      ? AppTheme.primaryColor
                      : AppTheme.textTertiary),
              const SizedBox(width: 8),
              Expanded(
                child: Row(
                  children: [
                    Text(address.label ?? 'Address',
                        style: const TextStyle(
                            fontWeight: FontWeight.w700, fontSize: 15)),
                    if (address.isDefault) ...[
                      const SizedBox(width: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 6, vertical: 1),
                        decoration: BoxDecoration(
                          color: AppTheme.primaryColor.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text('Default',
                            style: TextStyle(
                                fontSize: 10,
                                color: AppTheme.primaryColor,
                                fontWeight: FontWeight.w600)),
                      ),
                    ],
                  ],
                ),
              ),
              PopupMenuButton<String>(
                itemBuilder: (_) => [
                  if (!address.isDefault)
                    const PopupMenuItem(
                        value: 'default',
                        child: Text('Set as Default')),
                  const PopupMenuItem(
                      value: 'delete',
                      child: Text('Delete',
                          style: TextStyle(color: Colors.red))),
                ],
                onSelected: (action) async {
                  if (action == 'default') {
                    await sp.setDefaultAddress(address.id);
                  } else if (action == 'delete') {
                    final confirmed = await showDialog<bool>(
                      context: context,
                      builder: (ctx) => AlertDialog(
                        title: const Text('Delete Address'),
                        content: const Text('Are you sure you want to delete this address?'),
                        actions: [
                          TextButton(
                              onPressed: () => Navigator.pop(ctx, false),
                              child: const Text('Cancel')),
                          FilledButton(
                            onPressed: () => Navigator.pop(ctx, true),
                            style: FilledButton.styleFrom(
                                backgroundColor: AppTheme.errorColor),
                            child: const Text('Delete'),
                          ),
                        ],
                      ),
                    );
                    if (confirmed == true) await sp.deleteAddress(address.id);
                  }
                },
              ),
            ],
          ),
          const SizedBox(height: 8),
          if (address.fullName != null)
            Text(address.fullName!,
                style: const TextStyle(fontWeight: FontWeight.w500)),
          Text(address.formatted,
              style:
                  TextStyle(fontSize: 13, color: AppTheme.textSecondary)),
          if (address.phone != null)
            Text(address.phone!,
                style:
                    TextStyle(fontSize: 13, color: AppTheme.textSecondary)),
        ],
      ),
    );
  }
}

/// Standalone add-address screen (also accessible directly).
class AddAddressScreen extends StatefulWidget {
  const AddAddressScreen({super.key});

  @override
  State<AddAddressScreen> createState() => _AddAddressScreenState();
}

class _AddAddressScreenState extends State<AddAddressScreen> {
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
      if (permission == LocationPermission.deniedForever ||
          permission == LocationPermission.denied) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
              content: Text(
                  'Location permission is required to auto-detect your address')));
        }
        setState(() => _gpsLoading = false);
        return;
      }

      final position = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.best,
        timeLimit: const Duration(seconds: 15),
      );
      _latitude = position.latitude;
      _longitude = position.longitude;

      String street = '', city = '', district = '', region = '';

      // 1) Google reverse-geocoding — most accurate when a Maps key is set.
      // No result_type filter, so ALL admin-area components come back and we
      // can fill district/region reliably (esp. for Ugandan addresses).
      final googleKey = AppConfig.instance.googleMapsApiKey;
      if (googleKey.isNotEmpty) {
        try {
          final resp = await Dio(
                  BaseOptions(connectTimeout: const Duration(seconds: 8)))
              .get('https://maps.googleapis.com/maps/api/geocode/json',
                  queryParameters: {
                'latlng': '${position.latitude},${position.longitude}',
                'key': googleKey,
              });
          if (resp.data?['status'] == 'OK') {
            final results = resp.data['results'] as List?;
            if (results != null && results.isNotEmpty) {
              final components = results[0]['address_components'] as List;
              // First matching component for any of the wanted types (in order).
              String pick(List<String> wanted) {
                for (final want in wanted) {
                  for (final c in components) {
                    final types = List<String>.from(c['types'] as List);
                    if (types.contains(want)) return c['long_name'] as String;
                  }
                }
                return '';
              }
              final streetNumber = pick(['street_number']);
              final route = pick(['route']);
              street = [streetNumber, route].where((s) => s.isNotEmpty).join(' ');
              if (street.isEmpty) {
                street = pick(['sublocality_level_1', 'sublocality',
                    'neighborhood', 'premise']);
              }
              city = pick(['locality', 'postal_town',
                  'administrative_area_level_3', 'administrative_area_level_2']);
              district = pick(['administrative_area_level_2',
                  'administrative_area_level_3']);
              region = pick(['administrative_area_level_1']);
            }
          }
        } catch (_) {}
      }

      // 2) On-device geocoding — fill any fields Google didn't return.
      if (street.isEmpty || city.isEmpty || district.isEmpty || region.isEmpty) {
        try {
          final placemarks = await placemarkFromCoordinates(
              position.latitude, position.longitude);
          if (placemarks.isNotEmpty) {
            final p = placemarks.first;
            if (street.isEmpty) {
              street = [p.street, p.subLocality]
                  .where((s) => s != null && s.isNotEmpty)
                  .join(', ');
            }
            if (city.isEmpty) city = p.locality ?? p.subAdministrativeArea ?? '';
            if (district.isEmpty) district = p.subAdministrativeArea ?? '';
            if (region.isEmpty) region = p.administrativeArea ?? '';
          }
        } catch (_) {}
      }

      setState(() {
        if (street.isNotEmpty) {
          _addressLine1Ctrl.text = street;
        } else if (_addressLine1Ctrl.text.trim().isEmpty && city.isNotEmpty) {
          _addressLine1Ctrl.text = city;
        }
        if (city.isNotEmpty) _cityCtrl.text = city;
        if (district.isNotEmpty) _districtCtrl.text = district;
        if (region.isNotEmpty) _regionCtrl.text = region;
      });
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
            content: Text(
                'Could not detect location: ${e.toString().split(':').first}')));
      }
    }
    if (mounted) setState(() => _gpsLoading = false);
  }

  Future<void> _save() async {
    // Validate required fields (must match DB schema: fullName, phone, addressLine1, city are NOT NULL)
    if (_fullNameCtrl.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Please enter your full name')));
      return;
    }
    if (_phoneCtrl.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Please enter a phone number')));
      return;
    }
    if (_addressLine1Ctrl.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Please enter the street address')));
      return;
    }
    if (_cityCtrl.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Please enter the city')));
      return;
    }
    setState(() => _saving = true);
    final sp = context.read<SettingsProvider>();
    final address = Address(
      id: '',
      label: _labelCtrl.text.trim().isNotEmpty
          ? _labelCtrl.text.trim()
          : 'Home',
      fullName: _fullNameCtrl.text.trim(),
      phone: _phoneCtrl.text.trim(),
      addressLine1: _addressLine1Ctrl.text.trim(),
      city: _cityCtrl.text.trim(),
      district: _districtCtrl.text.trim().isNotEmpty
          ? _districtCtrl.text.trim()
          : null,
      region: _regionCtrl.text.trim().isNotEmpty
          ? _regionCtrl.text.trim()
          : null,
      country: 'Uganda',
      latitude: _latitude,
      longitude: _longitude,
    );
    final ok = await sp.addAddress(address);
    if (mounted) {
      setState(() => _saving = false);
      if (ok) {
        Navigator.pop(context);
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Failed to save address')));
      }
    }
  }

  Widget _field(TextEditingController ctrl, String label,
      {String? hint, TextInputType? keyboardType}) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: TextField(
        controller: ctrl,
        keyboardType: keyboardType,
        decoration: InputDecoration(
          labelText: label,
          hintText: hint,
          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
          contentPadding:
              const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        ),
      ),
    );
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
                  ? const SizedBox(
                      width: 24,
                      height: 24,
                      child: CircularProgressIndicator(
                          color: Colors.white, strokeWidth: 2))
                  : const Icon(Icons.gps_fixed_rounded,
                      color: Colors.white),
              title: const Text('Use Current Location',
                  style: TextStyle(
                      color: Colors.white, fontWeight: FontWeight.w600)),
              subtitle: Text('Auto-fill address from GPS',
                  style: TextStyle(
                      color: Colors.white.withValues(alpha: 0.7),
                      fontSize: 12)),
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(14)),
              onTap: _gpsLoading ? null : _detectLocation,
            ),
          ),
          if (_latitude != null) ...[
            const SizedBox(height: 8),
            Container(
              padding:
                  const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              decoration: BoxDecoration(
                color: AppTheme.successColor.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Row(
                children: [
                  Icon(Icons.check_circle_rounded,
                      color: AppTheme.successColor, size: 16),
                  const SizedBox(width: 6),
                  Text(
                      'GPS: ${_latitude!.toStringAsFixed(5)}, ${_longitude!.toStringAsFixed(5)}',
                      style: TextStyle(
                          fontSize: 12, color: AppTheme.successColor)),
                ],
              ),
            ),
          ],
          const SizedBox(height: 16),
          _field(_labelCtrl, 'Label', hint: 'e.g. Home, Office'),
          _field(_fullNameCtrl, 'Full Name *'),
          _field(_phoneCtrl, 'Phone Number *',
              keyboardType: TextInputType.phone),
          _field(_addressLine1Ctrl, 'Street Address *'),
          _field(_cityCtrl, 'City *'),
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
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14)),
              ),
              child: _saving
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(
                          color: Colors.white, strokeWidth: 2))
                  : const Text('Save Address',
                      style: TextStyle(fontSize: 16)),
            ),
          ),
        ],
      ),
    );
  }
}
