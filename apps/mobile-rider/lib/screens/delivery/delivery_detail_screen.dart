import 'dart:async';
import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:geolocator/geolocator.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:dio/dio.dart';
import '../../core/theme/app_theme.dart';
import '../../core/services/app_config.dart';
import '../../providers/delivery_provider.dart';

class DeliveryDetailScreen extends StatefulWidget {
  final String deliveryId;
  const DeliveryDetailScreen({super.key, required this.deliveryId});

  @override
  State<DeliveryDetailScreen> createState() => _DeliveryDetailScreenState();
}

class _DeliveryDetailScreenState extends State<DeliveryDetailScreen>
    with TickerProviderStateMixin {
  String get _googleMapsApiKey => AppConfig.instance.googleMapsApiKey;

  GoogleMapController? _mapCtrl;
  LatLng? _riderPos;
  LatLng? _destPos;
  Set<Polyline> _polylines = {};
  Set<Marker> _markers = {};
  String? _etaText;
  Timer? _locTimer;
  bool _actionLoading = false;
  int _slideResetKey = 0;

  @override
  void initState() {
    super.initState();
    _initLocation();
  }

  Future<void> _initLocation() async {
    try {
      LocationPermission perm = await Geolocator.checkPermission();
      if (perm == LocationPermission.denied) {
        perm = await Geolocator.requestPermission();
      }
      if (perm == LocationPermission.deniedForever ||
          perm == LocationPermission.denied) return;
      final pos = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
      );
      if (!mounted) return;
      setState(() => _riderPos = LatLng(pos.latitude, pos.longitude));
      _rebuildMarkers();
      _fetchRouteIfReady();
      _startTracking();
    } catch (_) {}
  }

  void _startTracking() {
    _locTimer = Timer.periodic(const Duration(seconds: 8), (_) async {
      try {
        final pos = await Geolocator.getCurrentPosition();
        if (!mounted) return;
        setState(() => _riderPos = LatLng(pos.latitude, pos.longitude));
        _rebuildMarkers();
        _fetchRouteIfReady();
      } catch (_) {}
    });
  }

  void _fetchRouteIfReady() {
    if (_riderPos != null && _destPos != null) _fetchRoute(_riderPos!, _destPos!);
  }

  Future<void> _fetchRoute(LatLng from, LatLng to) async {
    try {
      final url =
          'https://maps.googleapis.com/maps/api/directions/json'
          '?origin=${from.latitude},${from.longitude}'
          '&destination=${to.latitude},${to.longitude}'
          '&mode=driving'
          '&key=$_googleMapsApiKey';
      final resp = await Dio().get(url, options: Options(receiveTimeout: const Duration(seconds: 10)));
      if (resp.statusCode != 200 || !mounted) return;
      final routes = resp.data['routes'] as List?;
      if (routes == null || routes.isEmpty) return;
      final encoded = routes[0]['overview_polyline']['points'] as String?;
      final legs = routes[0]['legs'] as List?;
      final duration = legs?.isNotEmpty == true ? legs![0]['duration']['value'] as int? : null;
      if (encoded == null) return;
      final minutes = duration != null ? (duration / 60).round() : null;
      final points = _decodePolyline(encoded);
      if (!mounted) return;
      setState(() {
        _polylines = {
          Polyline(
            polylineId: const PolylineId('route'),
            points: points,
            color: AppTheme.primary,
            width: 6,
            endCap: Cap.roundCap,
            startCap: Cap.roundCap,
            jointType: JointType.round,
          ),
        };
        _etaText = minutes != null
            ? (minutes < 60 ? '~$minutes min away' : '~${(minutes / 60).toStringAsFixed(1)} hr away')
            : null;
      });
      _fitMapToBounds(from, to);
    } catch (_) {}
  }

  void _fitMapToBounds(LatLng rider, LatLng dest) {
    final sw = LatLng(
      rider.latitude < dest.latitude ? rider.latitude : dest.latitude,
      rider.longitude < dest.longitude ? rider.longitude : dest.longitude,
    );
    final ne = LatLng(
      rider.latitude > dest.latitude ? rider.latitude : dest.latitude,
      rider.longitude > dest.longitude ? rider.longitude : dest.longitude,
    );
    _mapCtrl?.animateCamera(
      CameraUpdate.newLatLngBounds(LatLngBounds(southwest: sw, northeast: ne), 80),
    );
  }

  void _rebuildMarkers() {
    if (!mounted) return;
    setState(() {
      _markers = {
        if (_riderPos != null)
          Marker(
            markerId: const MarkerId('rider'),
            position: _riderPos!,
            icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueAzure),
            infoWindow: const InfoWindow(title: '🏍 You'),
          ),
        if (_destPos != null)
          Marker(
            markerId: const MarkerId('destination'),
            position: _destPos!,
            icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueRed),
            infoWindow: const InfoWindow(title: '📍 Delivery Address'),
          ),
      };
    });
  }

  List<LatLng> _decodePolyline(String encoded) {
    final result = <LatLng>[];
    int index = 0, lat = 0, lng = 0;
    while (index < encoded.length) {
      int b, shift = 0, result0 = 0;
      do {
        b = encoded.codeUnitAt(index++) - 63;
        result0 |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      lat += (result0 & 1) != 0 ? ~(result0 >> 1) : (result0 >> 1);
      shift = 0; result0 = 0;
      do {
        b = encoded.codeUnitAt(index++) - 63;
        result0 |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      lng += (result0 & 1) != 0 ? ~(result0 >> 1) : (result0 >> 1);
      result.add(LatLng(lat / 1e5, lng / 1e5));
    }
    return result;
  }

  @override
  void dispose() {
    _locTimer?.cancel();
    _mapCtrl?.dispose();
    super.dispose();
  }

  LatLng _parseAddress(Map<String, dynamic>? addr) {
    final defLat = AppConfig.instance.defaultLat;
    final defLng = AppConfig.instance.defaultLng;
    if (addr == null) return LatLng(defLat, defLng);
    final lat = double.tryParse(addr['latitude']?.toString() ?? '') ??
        double.tryParse(addr['lat']?.toString() ?? '') ?? defLat;
    final lng = double.tryParse(addr['longitude']?.toString() ?? '') ??
        double.tryParse(addr['lng']?.toString() ?? '') ?? defLng;
    return LatLng(lat, lng);
  }

  void _onMapCreated(GoogleMapController ctrl) {
    _mapCtrl = ctrl;
    if (_riderPos != null && _destPos != null) _fetchRoute(_riderPos!, _destPos!);
  }

  Future<void> _doAction(Future<bool> Function(String) action, String successMsg) async {
    if (_actionLoading) return; // prevent double-tap
    setState(() => _actionLoading = true);
    try {
      final ok = await action(widget.deliveryId);
      if (!mounted) return;
      setState(() => _actionLoading = false);
      if (ok) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(successMsg),
            backgroundColor: AppTheme.primary,
            duration: const Duration(seconds: 2),
          ),
        );
        if (successMsg.toLowerCase().contains('complet') || successMsg.toLowerCase().contains('deliver')) {
          Navigator.of(context).popUntil((route) => route.isFirst);
        }
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Action failed — check your connection and try again.'),
            backgroundColor: Colors.red,
            duration: Duration(seconds: 3),
          ),
        );
        setState(() => _slideResetKey++);
      }
    } catch (e) {
      if (!mounted) return;
      setState(() { _actionLoading = false; _slideResetKey++; });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Error: ${e.toString()}'),
          backgroundColor: Colors.red,
          duration: const Duration(seconds: 4),
        ),
      );
    }
  }

  void _callBuyer(String? phone) {
    if (phone == null || phone.isEmpty) return;
    launchUrl(Uri.parse('tel:$phone'));
  }

  @override
  Widget build(BuildContext context) {
    return Consumer<DeliveryProvider>(
      builder: (context, provider, _) {
        final delivery = provider.deliveryById(widget.deliveryId);
        if (delivery == null) {
          // Delivery was completed/removed — navigate to home instead of showing error
          WidgetsBinding.instance.addPostFrameCallback((_) {
            if (mounted) Navigator.of(context).popUntil((route) => route.isFirst);
          });
          return const Scaffold(
            body: Center(child: CircularProgressIndicator()),
          );
        }

        final order = (delivery['order'] as Map<String, dynamic>?) ?? {};
        final status = delivery['status'] ?? order['status'] ?? 'ASSIGNED';
        final addr = order['address'] as Map<String, dynamic>?;
        final buyer = order['buyer'] as Map<String, dynamic>?;
        final items = (order['items'] as List?) ?? [];
        final orderNum = order['orderNumber'] ?? '#${(delivery['orderId'] ?? '').toString().substring(0, 8)}';
        final shippingFee = double.tryParse(order['shippingFee']?.toString() ?? '0') ?? 0;
        final total = double.tryParse(order['total']?.toString() ?? '0') ?? 0;
        final paymentMethod = order['paymentMethod']?.toString() ?? '';
        final isCod = paymentMethod == 'CASH_ON_DELIVERY';

        _destPos = _parseAddress(addr);
        // Kick route fetch the first time destPos is resolved
        WidgetsBinding.instance.addPostFrameCallback((_) {
          if (_destPos != null && _riderPos != null && _polylines.isEmpty) {
            _rebuildMarkers();
            _fetchRoute(_riderPos!, _destPos!);
          } else if (_destPos != null && _markers.isEmpty) {
            _rebuildMarkers();
          }
        });

        final mapCenter = _riderPos ?? _destPos ?? LatLng(AppConfig.instance.defaultLat, AppConfig.instance.defaultLng);

        return Scaffold(
          body: CustomScrollView(
            slivers: [
              // Map
              SliverAppBar(
                expandedHeight: 260,
                pinned: true,
                title: Text(orderNum),
                flexibleSpace: FlexibleSpaceBar(
                  background: Stack(
                    children: [
                      GoogleMap(
                        initialCameraPosition: CameraPosition(target: mapCenter, zoom: 14),
                        onMapCreated: _onMapCreated,
                        polylines: _polylines,
                        markers: _markers,
                        myLocationButtonEnabled: false,
                        zoomControlsEnabled: false,
                        mapToolbarEnabled: false,
                        compassEnabled: false,
                      ),
                      // ETA chip overlay
                      if (_etaText != null)
                        Positioned(
                          bottom: 10,
                          left: 0,
                          right: 0,
                          child: Center(
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
                              decoration: BoxDecoration(
                                color: Colors.white.withOpacity(0.95),
                                borderRadius: BorderRadius.circular(20),
                                boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.1), blurRadius: 8, offset: const Offset(0, 2))],
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  const Icon(Icons.timer_rounded, size: 14, color: AppTheme.primary),
                                  const SizedBox(width: 4),
                                  Text(_etaText!, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: AppTheme.textPrimary)),
                                ],
                              ),
                            ),
                          ),
                        ),
                    ],
                  ),
                ),
              ),

              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Status badge
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                        decoration: BoxDecoration(
                          color: _statusColor(status).withOpacity(0.12),
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Text(status.replaceAll('_', ' '), style: TextStyle(color: _statusColor(status), fontWeight: FontWeight.bold, fontSize: 13)),
                      ),
                      const SizedBox(height: 16),

                      // Buyer info & call
                      if (buyer != null) _infoCard(
                        icon: Icons.person_rounded,
                        title: '${buyer['firstName'] ?? ''} ${buyer['lastName'] ?? ''}'.trim(),
                        subtitle: buyer['phone'] ?? '',
                        trailing: IconButton(
                          icon: const Icon(Icons.phone_rounded, color: AppTheme.primary),
                          onPressed: () => _callBuyer(buyer['phone']),
                        ),
                      ),

                      // Address
                      if (addr != null) _infoCard(
                        icon: Icons.location_on_rounded,
                        title: addr['addressLine1'] ?? addr['street'] ?? 'Delivery Address',
                        subtitle: '${addr['city'] ?? ''} ${addr['region'] ?? ''}'.trim(),
                      ),

                      // Items
                      if (items.isNotEmpty) ...[
                        const SizedBox(height: 12),
                        const Text('Order Items', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                        const SizedBox(height: 8),
                        ...items.map((item) {
                          final product = (item['product'] as Map<String, dynamic>?) ?? {};
                          final qty = item['quantity'] ?? 1;
                          return Container(
                            margin: const EdgeInsets.only(bottom: 8),
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(color: const Color(0xFFE2E8F0)),
                            ),
                            child: Row(
                              children: [
                                Container(
                                  width: 44, height: 44,
                                  decoration: BoxDecoration(
                                    color: const Color(0xFFF1F5F9),
                                    borderRadius: BorderRadius.circular(10),
                                  ),
                                  child: const Icon(Icons.inventory_2_rounded, color: AppTheme.textSecondary, size: 22),
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(product['name'] ?? 'Product', style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                                      Text('Qty: $qty', style: const TextStyle(color: AppTheme.textSecondary, fontSize: 12)),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          );
                        }),
                      ],

                      // Earnings
                      const SizedBox(height: 12),
                      Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          gradient: const LinearGradient(colors: [Color(0xFF1E293B), Color(0xFF334155)]),
                          borderRadius: BorderRadius.circular(14),
                        ),
                        child: Row(
                          children: [
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Text('Your Earning', style: TextStyle(color: Colors.white70, fontSize: 12)),
                                  const SizedBox(height: 4),
                                  Text(_fmt(shippingFee), style: const TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold)),
                                ],
                              ),
                            ),
                            if (isCod)
                              Column(
                                crossAxisAlignment: CrossAxisAlignment.end,
                                children: [
                                  const Text('Collect COD', style: TextStyle(color: Colors.orange, fontSize: 12, fontWeight: FontWeight.w600)),
                                  const SizedBox(height: 4),
                                  Text(_fmt(total), style: const TextStyle(color: Colors.orange, fontSize: 18, fontWeight: FontWeight.bold)),
                                ],
                              ),
                          ],
                        ),
                      ),

                      const SizedBox(height: 24),

                      // Action buttons (slide-to-action)
                      if (status == 'ASSIGNED' || status == 'PENDING')
                        _SlideToAction(
                          key: ValueKey('accept_$_slideResetKey'),
                          label: 'Slide to Accept',
                          color: Colors.blue,
                          icon: Icons.check_circle_rounded,
                          loading: _actionLoading,
                          onConfirm: () => _doAction(provider.acceptDelivery, 'Delivery accepted!'),
                        ),

                      if (status == 'ASSIGNED' || status == 'CONFIRMED' || status == 'PROCESSING')
                        _SlideToAction(
                          key: ValueKey('pickup_$_slideResetKey'),
                          label: 'Slide to Pick Up',
                          color: Colors.indigo,
                          icon: Icons.local_shipping_rounded,
                          loading: _actionLoading,
                          onConfirm: () => _doAction(provider.markPickedUp, 'Marked as picked up!'),
                        ),

                      if (status == 'PICKED_UP' || status == 'IN_TRANSIT' || status == 'SHIPPED')
                        _SlideToAction(
                          key: ValueKey('deliver_$_slideResetKey'),
                          label: 'Slide to Deliver',
                          color: AppTheme.primary,
                          icon: Icons.done_all_rounded,
                          loading: _actionLoading,
                          onConfirm: () => _doAction(provider.markDelivered, 'Delivery completed!'),
                        ),

                      const SizedBox(height: 40),
                    ],
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _infoCard({required IconData icon, required String title, String? subtitle, Widget? trailing}) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Row(
        children: [
          Container(
            width: 42, height: 42,
            decoration: BoxDecoration(color: AppTheme.primary.withOpacity(0.1), borderRadius: BorderRadius.circular(12)),
            child: Icon(icon, color: AppTheme.primary, size: 22),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: const TextStyle(fontWeight: FontWeight.w600)),
                if (subtitle != null && subtitle.isNotEmpty)
                  Text(subtitle, style: const TextStyle(color: AppTheme.textSecondary, fontSize: 13)),
              ],
            ),
          ),
          if (trailing != null) trailing,
        ],
      ),
    );
  }

  Color _statusColor(String s) {
    switch (s) {
      case 'PENDING': return Colors.orange;
      case 'ASSIGNED': return Colors.blue;
      case 'CONFIRMED': return Colors.blue;
      case 'PICKED_UP': return Colors.indigo;
      case 'IN_TRANSIT': return Colors.purple;
      case 'SHIPPED': return Colors.purple;
      case 'DELIVERED': return AppTheme.primary;
      case 'FAILED': return Colors.red;
      default: return Colors.grey;
    }
  }

  String _fmt(dynamic val) {
    final n = double.tryParse(val.toString()) ?? 0;
    return 'UGX ${n.toStringAsFixed(0).replaceAllMapped(RegExp(r'(\d)(?=(\d{3})+(?!\d))'), (m) => '${m[1]},')}';
  }
}

/// A slide-to-action widget (swipe right to confirm)
class _SlideToAction extends StatefulWidget {
  final String label;
  final Color color;
  final IconData icon;
  final bool loading;
  final VoidCallback onConfirm;

  const _SlideToAction({
    super.key,
    required this.label,
    required this.color,
    required this.icon,
    required this.loading,
    required this.onConfirm,
  });

  @override
  State<_SlideToAction> createState() => _SlideToActionState();
}

class _SlideToActionState extends State<_SlideToAction>
    with SingleTickerProviderStateMixin {
  double _dragX = 0;
  double _maxDrag = 0;
  bool _confirmed = false;
  late AnimationController _shimmerCtrl;

  @override
  void initState() {
    super.initState();
    _shimmerCtrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1500),
    )..repeat();
  }

  @override
  void dispose() {
    _shimmerCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (widget.loading) {
      return Container(
        height: 60,
        margin: const EdgeInsets.only(bottom: 14),
        decoration: BoxDecoration(color: widget.color.withOpacity(0.15), borderRadius: BorderRadius.circular(30)),
        child: Center(
          child: SizedBox(width: 24, height: 24, child: CircularProgressIndicator(strokeWidth: 2.5, color: widget.color)),
        ),
      );
    }

    return Container(
      height: 60,
      margin: const EdgeInsets.only(bottom: 14),
      child: LayoutBuilder(
        builder: (context, constraints) {
          _maxDrag = constraints.maxWidth - 68;

          return Container(
            decoration: BoxDecoration(
              color: widget.color.withOpacity(0.12),
              borderRadius: BorderRadius.circular(30),
            ),
            child: Stack(
              children: [
                // Label with shimmer
                Center(
                  child: AnimatedBuilder(
                    animation: _shimmerCtrl,
                    builder: (context, child) {
                      return ShaderMask(
                        shaderCallback: (bounds) {
                          return LinearGradient(
                            begin: Alignment(-1.0 + 2.0 * _shimmerCtrl.value, 0),
                            end: Alignment(-1.0 + 2.0 * _shimmerCtrl.value + 0.6, 0),
                            colors: [
                              widget.color.withOpacity(0.4),
                              widget.color,
                              widget.color.withOpacity(0.4),
                            ],
                          ).createShader(bounds);
                        },
                        child: Text(
                          widget.label,
                          style: TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.w700,
                            fontSize: 15,
                            letterSpacing: 0.5,
                          ),
                        ),
                      );
                    },
                  ),
                ),
                // Filled track
                Positioned(
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: _dragX + 60,
                  child: Container(
                    decoration: BoxDecoration(
                      color: widget.color.withOpacity(0.3),
                      borderRadius: BorderRadius.circular(30),
                    ),
                  ),
                ),
                // Thumb
                Positioned(
                  left: _dragX + 4,
                  top: 4,
                  bottom: 4,
                  child: GestureDetector(
                    onHorizontalDragUpdate: (details) {
                      if (_confirmed) return;
                      setState(() {
                        _dragX = (_dragX + details.delta.dx).clamp(0.0, _maxDrag);
                      });
                    },
                    onHorizontalDragEnd: (details) {
                      if (_confirmed) return;
                      if (_dragX >= _maxDrag * 0.85) {
                        setState(() { _confirmed = true; _dragX = _maxDrag; });
                        widget.onConfirm();
                      } else {
                        setState(() => _dragX = 0);
                      }
                    },
                    child: Container(
                      width: 52,
                      decoration: BoxDecoration(
                        color: widget.color,
                        borderRadius: BorderRadius.circular(26),
                        boxShadow: [BoxShadow(color: widget.color.withOpacity(0.3), blurRadius: 8, offset: const Offset(2, 2))],
                      ),
                      child: Icon(
                        _confirmed ? Icons.check_rounded : Icons.chevron_right_rounded,
                        color: Colors.white,
                        size: 28,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}
