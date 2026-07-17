import 'dart:convert';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:flutter/material.dart';
import '../api/api_service.dart';

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

    // Handle notification tap when app is in background/terminated
    FirebaseMessaging.onMessageOpenedApp.listen(_onNotificationOpenedApp);

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
    // Can navigate based on payload data
    debugPrint('[Notification] Tapped: ${response.payload}');
  }

  void _onNotificationOpenedApp(RemoteMessage message) {
    debugPrint('[Notification] Opened app from: ${message.data}');
  }
}
