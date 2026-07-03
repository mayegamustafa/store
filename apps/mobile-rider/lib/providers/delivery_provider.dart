import 'dart:async';
import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:socket_io_client/socket_io_client.dart' as io;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../core/api/api_service.dart';

class DeliveryProvider extends ChangeNotifier {
  final _api = ApiService();
  final _storage = const FlutterSecureStorage();

  List<dynamic> _deliveries = [];
  bool _isOnline = false;
  bool _loading = false;
  String? _activeDeliveryId;
  String? _activeOrderId;     // orderId of the active delivery (used for socket broadcasts)
  String? _riderId;
  io.Socket? _socket;

  // ── Adaptive GPS tracking (M2) ──────────────────────────────────────────────
  // Previous implementation: Timer.periodic(10s) -> getCurrentPosition() at HIGH
  // accuracy regardless of movement. That drains a Tecno/Infinix in ~4-6 hours.
  //
  // New implementation: a position STREAM with a distanceFilter so the OS only
  // wakes the GPS when the rider has actually moved. Network broadcasts are
  // additionally rate-limited so two events under MIN_EMIT_INTERVAL_MS apart are
  // coalesced. Mock-location detection (Position.isMocked) flags spoofed GPS for
  // ops review.
  StreamSubscription<Position>? _locationSubscription;
  DateTime? _lastEmitAt;
  Position? _lastEmittedPosition;

  // Minimum gap between network/socket broadcasts (ms). The stream may fire more
  // often when the rider moves rapidly; we coalesce to avoid burning data.
  static const int _minEmitIntervalMs = 3000;
  // Minimum distance between broadcasts (metres). Backstop in case the OS
  // returns positions through the distanceFilter due to provider quirks.
  static const double _minEmitDistanceM = 8;

  List<dynamic> get deliveries => _deliveries;
  bool get isOnline => _isOnline;
  bool get loading => _loading;
  String? get activeDeliveryId => _activeDeliveryId;

  /// Call once after login to cache the rider profile ID for socket events.
  void setRiderId(String? id) => _riderId = id;

  Future<void> loadDeliveries() async {
    _loading = true; notifyListeners();
    final res = await _api.getAssignedDeliveries();
    // API returns the array directly (not wrapped in {data:[...]})
    if (res is List) {
      _deliveries = List<dynamic>.from(res as Iterable);
    } else if (res is Map) {
      final m = res as Map<String, dynamic>;
      _deliveries = List<dynamic>.from((m['data'] as List?) ?? (m['deliveries'] as List?) ?? []);
    } else {
      _deliveries = [];
    }
    if (_activeDeliveryId != null && !_deliveries.any((d) => d['id'] == _activeDeliveryId)) {
      _activeDeliveryId = null;
    }
    _loading = false; notifyListeners();
  }

  Map<String, dynamic>? deliveryById(String deliveryId) {
    try {
      final d = _deliveries.firstWhere((d) => d['id'] == deliveryId);
      return Map<String, dynamic>.from(d as Map);
    } catch (_) {
      return null;
    }
  }

  Future<void> toggleOnline() async {
    _isOnline = !_isOnline;
    await _api.toggleOnline(_isOnline);
    if (_isOnline) { await _connectSocket(); _startLocationTracking(); }
    else {
      _stopLocationTracking();
      if (_riderId != null) _socket?.emit('rider:offline', {'riderId': _riderId});
      _socket?.disconnect();
    }
    notifyListeners();
  }

  Future<void> _connectSocket() async {
    final token = await _storage.read(key: 'riderAccessToken');
    if (token == null) return;
    _socket = io.io('https://shop.saktech.org/tracking', io.OptionBuilder()
        .setTransports(['polling', 'websocket'])
        .setAuth({'token': token})
        .build());
    _socket!.onConnect((_) {
      debugPrint('Rider socket connected');
      if (_riderId != null) _socket!.emit('rider:online', {'riderId': _riderId});
    });
  }

  /// Open the position stream and broadcast on movement. The OS-level
  /// distanceFilter naturally suppresses updates when the rider is stationary —
  /// no need for a wakeup timer. High accuracy is used because a delivery
  /// route requires it; battery savings come from the OS deduping movement.
  void _startLocationTracking() {
    // Defensive: cancel any prior subscription so toggleOnline doesn't leak.
    _locationSubscription?.cancel();
    _lastEmitAt = null;
    _lastEmittedPosition = null;

    const settings = LocationSettings(
      accuracy: LocationAccuracy.high,
      distanceFilter: 10, // metres — single biggest battery + data saver.
    );

    _locationSubscription = Geolocator.getPositionStream(locationSettings: settings).listen(
      _onPositionUpdate,
      onError: (e) {
        debugPrint('Rider location stream error: $e');
      },
      cancelOnError: false,
    );
  }

  void _stopLocationTracking() {
    _locationSubscription?.cancel();
    _locationSubscription = null;
    _lastEmitAt = null;
    _lastEmittedPosition = null;
  }

  Future<void> _onPositionUpdate(Position pos) async {
    // Drop spoofed GPS — flag and skip the broadcast. A small "isMocked" event
    // is sent so ops can investigate (separate channel to avoid silent fraud).
    if (pos.isMocked) {
      _socket?.emit('rider:mock_location_detected', {
        'riderId': _riderId,
        'at': DateTime.now().toIso8601String(),
      });
      return;
    }

    // Find an active delivery to attach the broadcast to. With no active
    // delivery there is no point broadcasting; the rider being online is a
    // background state, not a tracked state. Keep CPU/network idle.
    final activeDeliveries = _deliveries.where((d) {
      final s = (d['status'] as String?) ?? '';
      return s == 'ASSIGNED' || s == 'PICKED_UP' || s == 'IN_TRANSIT';
    }).toList();
    if (activeDeliveries.isEmpty) return;

    final targetDelivery = _activeDeliveryId != null
        ? activeDeliveries.firstWhere(
            (d) => d['id'] == _activeDeliveryId,
            orElse: () => activeDeliveries.first,
          )
        : activeDeliveries.first;

    final deliveryId = targetDelivery['id'] as String?;
    final orderId = (targetDelivery['orderId'] as String?) ?? _activeOrderId;
    if (deliveryId == null) return;

    // Rate-limit: at most one emit per _minEmitIntervalMs OR after _minEmitDistanceM
    // movement since the last emit. Defends against pathological stream behavior
    // and keeps Africa's-Talking-grade network usage reasonable.
    final now = DateTime.now();
    if (_lastEmitAt != null) {
      final sinceMs = now.difference(_lastEmitAt!).inMilliseconds;
      if (sinceMs < _minEmitIntervalMs) {
        if (_lastEmittedPosition == null) return;
        final movedM = Geolocator.distanceBetween(
          _lastEmittedPosition!.latitude,
          _lastEmittedPosition!.longitude,
          pos.latitude,
          pos.longitude,
        );
        if (movedM < _minEmitDistanceM) return;
      }
    }
    _lastEmitAt = now;
    _lastEmittedPosition = pos;

    try {
      await _api.updateLocation(deliveryId: deliveryId, lat: pos.latitude, lng: pos.longitude);
      _socket?.emit('rider:location', {
        'riderId': _riderId,
        'location': {
          'lat': pos.latitude,
          'lng': pos.longitude,
          'speed': pos.speed,         // m/s
          'heading': pos.heading,     // degrees, 0=north
          'accuracy': pos.accuracy,   // metres
          'orderId': orderId,
          'deliveryId': deliveryId,
        },
      });
    } catch (_) {
      // Don't crash on transient network failure; the next position event
      // will retry. Backend's rider:moved is best-effort by design.
    }
  }

  Future<bool> acceptDelivery(String deliveryId) async {
    // "Accept" means the rider is heading to pick up — use IN_TRANSIT so backend
    // registers the delivery as active. ASSIGNED is the starting state; we skip
    // it to avoid a no-op and instead move to PICKED_UP directly.
    final result = await _api.updateDeliveryStatus(deliveryId, 'PICKED_UP');
    if (result.ok) {
      _activeDeliveryId = deliveryId;
      _activeOrderId = _getOrderId(deliveryId);
      await loadDeliveries();
    }
    return result.ok;
  }

  Future<bool> markPickedUp(String deliveryId) async {
    final result = await _api.updateDeliveryStatus(deliveryId, 'PICKED_UP');
    if (result.ok) {
      _activeDeliveryId = deliveryId;
      _activeOrderId = _getOrderId(deliveryId);
      await loadDeliveries();
    }
    return result.ok;
  }

  Future<bool> markDelivered(String deliveryId) async {
    final result = await _api.updateDeliveryStatus(deliveryId, 'DELIVERED');
    if (result.ok) {
      _activeDeliveryId = null;
      _activeOrderId = null;
      await loadDeliveries();
    }
    return result.ok;
  }

  /// Extract orderId from the cached delivery list
  String? _getOrderId(String deliveryId) {
    try {
      final d = _deliveries.firstWhere((d) => d['id'] == deliveryId);
      return (d as Map<String, dynamic>)['orderId'] as String?;
    } catch (_) {
      return null;
    }
  }

  @override
  void dispose() {
    _stopLocationTracking();
    _socket?.disconnect();
    super.dispose();
  }
}
// _stopLocationTracking now cancels the position-stream subscription instead of
// a Timer. The old `_locationTimer` field has been removed entirely.
