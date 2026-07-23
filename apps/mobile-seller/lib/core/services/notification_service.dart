import 'dart:convert';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import '../api_service.dart';
import '../router.dart';

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

  static const _channelId = 'seller_notifications';
  static const _channelName = 'Seller Notifications';

  bool _initialized = false;

  Future<void> init() async {
    if (_initialized) return;
    _initialized = true;

    FirebaseMessaging.onBackgroundMessage(_firebaseMessagingBackgroundHandler);

    final settings = await _fcm.requestPermission(
      alert: true,
      badge: true,
      sound: true,
    );
    if (settings.authorizationStatus == AuthorizationStatus.denied) return;

    const androidInit = AndroidInitializationSettings('@mipmap/ic_launcher');
    const initSettings = InitializationSettings(android: androidInit);
    await _localNotifs.initialize(
      initSettings,
      onDidReceiveNotificationResponse: (resp) {
        if (resp.payload == null || resp.payload!.isEmpty) return;
        try {
          _navigateFromData(
              Map<String, dynamic>.from(jsonDecode(resp.payload!) as Map));
        } catch (_) {}
      },
    );

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
    await _localNotifs
        .resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>()
        ?.createNotificationChannel(const AndroidNotificationChannel(
          'totalstore_high',
          'TotalStore Alerts',
          description: 'Orders, payments and important updates.',
          importance: Importance.max,
          playSound: true,
          enableVibration: true,
        ));

    FirebaseMessaging.onMessage.listen(_showForegroundNotification);
    FirebaseMessaging.onMessageOpenedApp.listen((msg) => _navigateFromData(msg.data));

    // Tap that cold-started the app from terminated state.
    final initialMessage = await _fcm.getInitialMessage();
    if (initialMessage != null) {
      Future.delayed(const Duration(seconds: 3),
          () => _navigateFromData(initialMessage.data));
    }

    // Token registration happens after login (see registerTokenAfterLogin())
    _fcm.onTokenRefresh.listen(_sendTokenToBackend);
  }

  /// Navigate to the screen referenced by the push payload. The server sends a
  /// `route` like "/orders/123" (which matches this app's go_router path) plus
  /// an `event`/`order_id` fallback.
  void _navigateFromData(Map<String, dynamic> data) {
    final router = AppRouter.instance;
    if (router == null) return;
    var route = (data['route'] ?? '').toString().trim();
    final orderId = (data['order_id'] ?? data['orderId'] ?? '').toString();
    if (route.isEmpty && orderId.isNotEmpty) route = '/orders/$orderId';
    if (route.isEmpty) return;
    // Seller order routes are already plural; map any /deliveries/ just in case.
    route = route.replaceFirst('/deliveries/', '/orders/');
    if (!route.startsWith('/')) route = '/$route';
    router.push(route);
  }

  /// Call this after a successful login so the token is sent with a valid JWT.
  Future<void> registerTokenAfterLogin() async {
    try {
      final token = await _fcm.getToken();
      if (token != null) await _sendTokenToBackend(token);
      // Broadcast topics so admin "send to all/sellers" reaches this device.
      await _fcm.subscribeToTopic('all_users');
      await _fcm.subscribeToTopic('sellers');
    } catch (_) {}
  }

  Future<void> _sendTokenToBackend(String token) async {
    try {
      await _api.dio.patch('/auth/fcm-token', data: {'fcmToken': token});
    } catch (_) {}
  }

  void _showForegroundNotification(RemoteMessage message) {
    final notification = message.notification;
    if (notification == null) return;

    _localNotifs.show(
      notification.hashCode,
      notification.title ?? 'TotalStore Seller',
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
}
