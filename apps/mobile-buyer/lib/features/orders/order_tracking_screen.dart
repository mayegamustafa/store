import 'dart:async';
import 'dart:math' show cos, sqrt, asin;
import 'package:flutter/material.dart';
import 'package:dio/dio.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:geolocator/geolocator.dart';
import 'package:socket_io_client/socket_io_client.dart' as sio;
import '../../core/constants.dart';
import '../../core/theme.dart';
import '../../core/api/api_service.dart';
import '../../core/services/app_config.dart';

class OrderTrackingScreen extends StatefulWidget {
  final String orderId;
  const OrderTrackingScreen({super.key, required this.orderId});

  @override
  State<OrderTrackingScreen> createState() => _OrderTrackingScreenState();
}

class _OrderTrackingScreenState extends State<OrderTrackingScreen> {
  sio.Socket? _socket;
  Timer? _pollTimer;
  final MapController _mapController = MapController();
  bool _mapReady = false;
  LatLng? _riderLocation;
  LatLng? _destLocation;
  List<LatLng> _routePoints = [];
  String _status = '';
  bool _connected = false;
  LatLng? _deviceLocation;

  final List<_Step> _steps = const [
    _Step(key: 'PENDING', label: 'Order Placed', icon: Icons.receipt_rounded),
    _Step(key: 'PROCESSING', label: 'Preparing', icon: Icons.sync_rounded),
    _Step(key: 'SHIPPED', label: 'Picked Up', icon: Icons.local_shipping_rounded),
    _Step(key: 'OUT_FOR_DELIVERY', label: 'On the Way', icon: Icons.delivery_dining_rounded),
    _Step(key: 'DELIVERED', label: 'Delivered', icon: Icons.check_circle_rounded),
  ];

  @override
  void initState() {
    super.initState();
    _initDeviceLocation();
    _connectSocket();
    _startFallbackPolling();
  }

  Future<void> _initDeviceLocation() async {
    try {
      LocationPermission perm = await Geolocator.checkPermission();
      if (perm == LocationPermission.denied) {
        perm = await Geolocator.requestPermission();
      }
      if (perm == LocationPermission.deniedForever || perm == LocationPermission.denied) return;
      final pos = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.medium,
        timeLimit: const Duration(seconds: 10),
      );
      if (!mounted) return;
      setState(() => _deviceLocation = LatLng(pos.latitude, pos.longitude));
      // Only move camera if rider hasn't arrived yet
      if (_riderLocation == null && _mapReady) {
        _mapController.move(LatLng(pos.latitude, pos.longitude), 14);
      }
    } catch (_) {}
  }

  void _connectSocket() {
    final wsUrl = AppConstants.baseUrl.replaceAll('/api/v1', '');
    final token = ApiService().accessToken ?? '';

    _socket = sio.io(
      '$wsUrl/tracking',
      sio.OptionBuilder()
          .setTransports(['polling', 'websocket'])
          .setAuth({'token': token})
          .disableAutoConnect()
          .enableReconnection()
          .setReconnectionDelay(2000)
          .setReconnectionAttempts(10)
          .build(),
    );

    _socket!.onConnect((_) {
      if (mounted) setState(() => _connected = true);
      _socket!.emit('track:order', {'orderId': widget.orderId});
    });

    _socket!.on('rider:moved', (data) {
      if (!mounted || data == null) return;
      final lat = (data['location']?['lat'] ?? data['lat'])?.toDouble();
      final lng = (data['location']?['lng'] ?? data['lng'])?.toDouble();
      if (lat == null || lng == null) return;
      _updateRiderPosition(LatLng(lat, lng));
    });

    _socket!.on('delivery:destination', (data) {
      if (!mounted || data == null) return;
      final lat = (data['lat'])?.toDouble();
      final lng = (data['lng'])?.toDouble();
      if (lat == null || lng == null) return;
      setState(() => _destLocation = LatLng(lat, lng));
      if (_riderLocation != null) _fetchRoute(_riderLocation!, _destLocation!);
    });

    _socket!.on('delivery:status', (data) {
      if (!mounted || data == null) return;
      final status = data['status'];
      if (status is String && mounted) setState(() => _status = status);
    });

    _socket!.onDisconnect((_) {
      if (mounted) setState(() => _connected = false);
    });

    _socket!.connect();
  }

  void _updateRiderPosition(LatLng pos) {
    if (!mounted) return;
    setState(() => _riderLocation = pos);
    if (_mapReady && _destLocation == null) {
      _mapController.move(pos, _mapController.camera.zoom);
    }
    if (_destLocation != null) _fetchRoute(pos, _destLocation!);
  }

  void _startFallbackPolling() {
    _fetchTrackingSnapshot(); // immediate first paint
    _pollTimer = Timer.periodic(const Duration(seconds: 15), (_) async {
      if (!mounted) return;
      if (_connected && _riderLocation != null) return;
      await _fetchTrackingSnapshot();
    });
  }

  Future<void> _fetchTrackingSnapshot() async {
      try {
        final response = await ApiService().dio.get('/delivery/orders/${widget.orderId}/tracking');
        var data = response.data is Map ? response.data as Map<String, dynamic> : null;
        if (data != null && data['data'] is Map) data = data['data'] as Map<String, dynamic>;
        if (data == null || !mounted) return;
        final delivery = data['delivery'] as Map<String, dynamic>?;
        final loc = delivery?['currentLocation'] as Map<String, dynamic>?;
        final lat = (loc?['lat'] as num?)?.toDouble();
        final lng = (loc?['lng'] as num?)?.toDouble();
        if (lat != null && lng != null) _updateRiderPosition(LatLng(lat, lng));
        final dest = delivery?['destination'] as Map<String, dynamic>?;
        final dLat = (dest?['lat'] as num?)?.toDouble();
        final dLng = (dest?['lng'] as num?)?.toDouble();
        if (dLat != null && dLng != null && _destLocation == null && mounted) {
          setState(() => _destLocation = LatLng(dLat, dLng));
        }
        final orderStatus = (data['order'] as Map?)?['status'] as String?;
        if (orderStatus != null && mounted) setState(() => _status = orderStatus);
      } catch (_) {}
  }

  Future<void> _fetchRoute(LatLng from, LatLng to) async {
    // OSRM public routing — free, no API key (OpenStreetMap ecosystem)
    try {
      final url =
          'https://router.project-osrm.org/route/v1/driving/'
          '${from.longitude},${from.latitude};${to.longitude},${to.latitude}'
          '?overview=full&geometries=polyline';
      final resp = await Dio().get(url, options: Options(receiveTimeout: const Duration(seconds: 10)));
      if (resp.statusCode != 200 || !mounted) return;
      final routes = resp.data['routes'] as List?;
      if (routes == null || routes.isEmpty) return;
      final encoded = routes[0]['geometry'] as String?;
      if (encoded == null) return;
      final points = _decodePolyline(encoded);
      if (!mounted) return;
      setState(() => _routePoints = points);
      _fitMapToBounds(from, to);
    } catch (_) {}
  }

  void _fitMapToBounds(LatLng rider, LatLng dest) {
    if (!_mapReady) return;
    try {
      _mapController.fitCamera(CameraFit.bounds(
        bounds: LatLngBounds.fromPoints([rider, dest]),
        padding: const EdgeInsets.all(60),
      ));
    } catch (_) {}
  }

  /// Standard Google Maps polyline decoder (Encoded Polyline Algorithm).
  List<LatLng> _decodePolyline(String encoded) {
    final result = <LatLng>[];
    int index = 0;
    int lat = 0;
    int lng = 0;
    while (index < encoded.length) {
      int b, shift = 0, result0 = 0;
      do {
        b = encoded.codeUnitAt(index++) - 63;
        result0 |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      lat += (result0 & 1) != 0 ? ~(result0 >> 1) : (result0 >> 1);
      shift = 0;
      result0 = 0;
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
    _socket?.disconnect();
    _socket?.dispose();
    _pollTimer?.cancel();
    _mapController.dispose();
    super.dispose();
  }

  int get _currentStep {
    final idx = _steps.indexWhere((s) => s.key == _status);
    return idx >= 0 ? idx : -1;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.backgroundColor,
      appBar: AppBar(
        title: const Text('Track Delivery'),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 16),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 8,
                  height: 8,
                  decoration: BoxDecoration(
                    color: _connected ? AppTheme.successColor : AppTheme.textTertiary,
                    shape: BoxShape.circle,
                  ),
                ),
                const SizedBox(width: 6),
                Text(
                  _connected ? 'Live' : 'Connecting...',
                  style: TextStyle(
                    fontSize: 12,
                    color: _connected ? AppTheme.successColor : AppTheme.textTertiary,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
      body: Column(
        children: [
          // Map
          Expanded(
            child: Stack(
              children: [
                FlutterMap(
                  mapController: _mapController,
                  options: MapOptions(
                    initialCenter: _riderLocation ?? _deviceLocation ?? LatLng(
                      AppConfig.instance.defaultLat,
                      AppConfig.instance.defaultLng,
                    ),
                    initialZoom: 14,
                    onMapReady: () => _mapReady = true,
                  ),
                  children: [
                    TileLayer(
                      urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                      userAgentPackageName: 'com.totalstoreug.total_store_buyer',
                    ),
                    if (_routePoints.isNotEmpty)
                      PolylineLayer(polylines: [
                        Polyline(
                          points: _routePoints,
                          color: AppTheme.primaryColor,
                          strokeWidth: 5,
                        ),
                      ]),
                    MarkerLayer(markers: [
                      if (_destLocation != null)
                        Marker(
                          point: _destLocation!,
                          width: 44,
                          height: 44,
                          child: const Icon(Icons.location_pin,
                              color: Colors.red, size: 40),
                        ),
                      if (_deviceLocation != null)
                        Marker(
                          point: _deviceLocation!,
                          width: 20,
                          height: 20,
                          child: Container(
                            decoration: BoxDecoration(
                              color: Colors.blue,
                              shape: BoxShape.circle,
                              border: Border.all(color: Colors.white, width: 3),
                            ),
                          ),
                        ),
                      if (_riderLocation != null)
                        Marker(
                          point: _riderLocation!,
                          width: 40,
                          height: 40,
                          child: Container(
                            decoration: BoxDecoration(
                              color: AppTheme.primaryColor,
                              shape: BoxShape.circle,
                              border: Border.all(color: Colors.white, width: 3),
                              boxShadow: const [
                                BoxShadow(color: Colors.black26, blurRadius: 6)
                              ],
                            ),
                            child: const Icon(Icons.two_wheeler,
                                color: Colors.white, size: 20),
                          ),
                        ),
                    ]),
                  ],
                ),
                // Waiting overlay when no rider location yet
                if (_riderLocation == null)
                  Container(
                    color: Colors.white.withValues(alpha: 0.75),
                    child: Center(
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Icons.location_searching_rounded,
                              size: 52, color: AppTheme.textTertiary.withValues(alpha: 0.5)),
                          const SizedBox(height: 14),
                          const Text('Waiting for rider location...',
                              style: TextStyle(color: AppTheme.textSecondary, fontSize: 15, fontWeight: FontWeight.w600)),
                          const SizedBox(height: 4),
                          const Text('GPS tracking will appear once the rider is on the way',
                              style: TextStyle(color: AppTheme.textTertiary, fontSize: 12)),
                        ],
                      ),
                    ),
                  ),
                // Rider status chip
                if (_riderLocation != null)
                  Positioned(
                    bottom: 12,
                    left: 0,
                    right: 0,
                    child: Center(
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                        decoration: BoxDecoration(
                          color: Colors.white.withValues(alpha: 0.95),
                          borderRadius: BorderRadius.circular(20),
                          boxShadow: [AppTheme.softShadow],
                        ),
                        child: const Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(Icons.circle, size: 8, color: Colors.green),
                            SizedBox(width: 6),
                            Text('🏍 Rider is on the way',
                                style: TextStyle(fontSize: 12, color: AppTheme.textSecondary, fontWeight: FontWeight.w600)),
                          ],
                        ),
                      ),
                    ),
                  ),
              ],
            ),
          ),
          // Status timeline
          Container(
            padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
            decoration: const BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
              boxShadow: [BoxShadow(color: Colors.black12, blurRadius: 8, offset: Offset(0, -2))],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Center(
                  child: Container(
                    width: 40,
                    height: 4,
                    margin: const EdgeInsets.only(bottom: 16),
                    decoration: BoxDecoration(
                      color: AppTheme.dividerColor,
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                ),
                const Text('Delivery Progress',
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
                const SizedBox(height: 16),
                Row(
                  children: List.generate(_steps.length, (i) {
                    final done = i <= _currentStep;
                    return Expanded(
                      child: Column(
                        children: [
                          Container(
                            width: 36,
                            height: 36,
                            decoration: BoxDecoration(
                              color: done
                                  ? AppTheme.primaryColor.withValues(alpha: 0.15)
                                  : AppTheme.surfaceColor,
                              shape: BoxShape.circle,
                            ),
                            child: Icon(_steps[i].icon, size: 18,
                                color: done ? AppTheme.primaryColor : AppTheme.textTertiary),
                          ),
                          const SizedBox(height: 6),
                          Text(
                            _steps[i].label,
                            textAlign: TextAlign.center,
                            style: TextStyle(
                              fontSize: 10,
                              fontWeight: done ? FontWeight.w600 : FontWeight.w400,
                              color: done ? AppTheme.textPrimary : AppTheme.textTertiary,
                            ),
                          ),
                        ],
                      ),
                    );
                  }),
                ),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 8),
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(4),
                    child: LinearProgressIndicator(
                      value: _currentStep >= 0 ? _currentStep / (_steps.length - 1) : 0,
                      minHeight: 4,
                      backgroundColor: AppTheme.dividerColor,
                      valueColor: AlwaysStoppedAnimation(AppTheme.primaryColor),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _Step {
  final String key;
  final String label;
  final IconData icon;
  const _Step({required this.key, required this.label, required this.icon});
}
