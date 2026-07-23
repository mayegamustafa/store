import 'dart:convert';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:flutter/material.dart';
import '../api/api_service.dart';

/// Global navigator key so notification taps can navigate from outside the
/// widget tree. Wired into MaterialApp in main.dart.
final GlobalKey<NavigatorState> navigatorKey = GlobalKey<NavigatorState>();

/// Top-level handler for background messages (must be top-level function)
@pragma('vm:entry-point')
Future<void> _firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  await Firebase.initializeApp();
}

class NotificationService {
  static final NotificationService _instance = NotificationService._internal();
  factory NotificationService() => _instance;
  NotificationService._internal();

  final FirebaseMessaging _fcm = FirebaseMessaging.instance;
  final FlutterLocalNotificationsPlugin _localNotifs = FlutterLocalNotificationsPlugin();
  final ApiService _api = ApiService();

  static const _channelId = 'totalstore_notifications';
  static const _channelName = 'TotalStore Notifications';

  bool _initialized = false;

  Future<void> init() async {
    if (_initialized) return;
    _initialized = true;

    // Set background handler
    FirebaseMessaging.onBackgroundMessage(_firebaseMessagingBackgroundHandler);

    // Request permission
    final settings = await _fcm.requestPermission(
      alert: true,
      badge: true,
      sound: true,
      provisional: false,
    );

    if (settings.authorizationStatus == AuthorizationStatus.denied) return;

    // Init local notifications for foreground display
    const androidInit = AndroidInitializationSettings('@mipmap/ic_launcher');
    const initSettings = InitializationSettings(android: androidInit);
    await _localNotifs.initialize(
      initSettings,
      onDidReceiveNotificationResponse: _onNotificationTap,
    );

    // Create notification channel
    const channel = AndroidNotificationChannel(
      _channelId,
      _channelName,
      importance: Importance.high,
      enableVibration: true,
      playSound: true,
    );
    await _localNotifs
        .resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>()
        ?.requestNotificationsPermission();
    await _localNotifs
        .resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>()
        ?.createNotificationChannel(channel);

    // Channel targeted by the SERVER's FCM pushes (channelId 'totalstore_high').
    // Without it Android downgrades pushes to silent tray entries — no popup.
    await _localNotifs
        .resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>()
        ?.createNotificationChannel(const AndroidNotificationChannel(
          'totalstore_high',
          'TotalStore Alerts',
          description: 'Orders, payments, deliveries and important updates.',
          importance: Importance.max,
          playSound: true,
          enableVibration: true,
        ));

    // Listen to foreground messages
    FirebaseMessaging.onMessage.listen(_showForegroundNotification);

    // Handle notification tap when app is in background
    FirebaseMessaging.onMessageOpenedApp.listen(_onNotificationOpenedApp);

    // Handle the tap that cold-started the app from a terminated state.
    // Delay so the splash screen has a chance to settle into /main first.
    final initialMessage = await _fcm.getInitialMessage();
    if (initialMessage != null) {
      Future.delayed(const Duration(seconds: 3),
          () => _navigateFromData(initialMessage.data));
    }

    // Token registration happens after login (see registerTokenAfterLogin())
    // Listen for token refresh — will only send if user is already logged in
    _fcm.onTokenRefresh.listen((token) => _sendTokenToBackend(token));
  }

  Future<void> _registerToken() async {
    try {
      final token = await _fcm.getToken();
      if (token != null) await _sendTokenToBackend(token);
    } catch (_) {}
  }

  /// Call this after a successful login so the token is sent with a valid JWT.
  Future<void> registerTokenAfterLogin() async {
    await _registerToken();
    // Subscribe to broadcast topics so admin "send to all/buyers" reaches
    // this device (server broadcasts via FCM topics, not per-token).
    try {
      await _fcm.subscribeToTopic('all_users');
      await _fcm.subscribeToTopic('buyers');
    } catch (_) {}
  }

  Future<void> _sendTokenToBackend(String token) async {
    try {
      await _api.dio.patch('/auth/fcm-token', data: {
        'fcmToken': token,
      });
    } catch (_) {
      // Endpoint may not exist yet — silent fail
    }
  }

  void _showForegroundNotification(RemoteMessage message) {
    final notification = message.notification;
    if (notification == null) return;

    _localNotifs.show(
      notification.hashCode,
      notification.title ?? 'TotalStore',
      notification.body ?? '',
      NotificationDetails(
        android: AndroidNotificationDetails(
          _channelId,
          _channelName,
          importance: Importance.high,
          priority: Priority.high,
          icon: '@mipmap/ic_launcher',
        ),
      ),
      payload: jsonEncode(message.data),
    );
  }

  void _onNotificationTap(NotificationResponse response) {
    // Foreground local-notification tap — payload is the encoded message data.
    if (response.payload == null || response.payload!.isEmpty) return;
    try {
      final data = Map<String, dynamic>.from(jsonDecode(response.payload!) as Map);
      _navigateFromData(data);
    } catch (_) {}
  }

  void _onNotificationOpenedApp(RemoteMessage message) {
    _navigateFromData(message.data);
  }

  /// Resolve the destination from the push payload and navigate there.
  /// The server sends a `route` (e.g. "/orders/123" or "/orders/123/track")
  /// and/or an `event` + `order_id`. Falls back to the notifications list.
  void _navigateFromData(Map<String, dynamic> data) {
    final route = _resolveRoute(data);
    final nav = navigatorKey.currentState;
    if (nav == null || route == null) return;
    nav.pushNamed(route);
  }

  String? _resolveRoute(Map<String, dynamic> data) {
    var route = (data['route'] ?? '').toString().trim();
    final event = (data['event'] ?? '').toString();
    final orderId = (data['order_id'] ?? data['orderId'] ?? '').toString();

    // Derive a route from the event when the server didn't send one.
    if (route.isEmpty && orderId.isNotEmpty) {
      route = (event == 'ORDER_OUT_FOR_DELIVERY' || event == 'ORDER_SHIPPED')
          ? '/orders/$orderId/track'
          : '/orders/$orderId';
    }
    if (route.isEmpty) return '/notifications';

    // The API uses plural /orders and /deliveries; this app registers the
    // singular /order/:id (and /order/:id/track) routes.
    route = route
        .replaceFirst('/orders/', '/order/')
        .replaceFirst('/deliveries/', '/order/');
    return route.startsWith('/') ? route : '/$route';
  }
}
