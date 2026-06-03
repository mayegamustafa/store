import 'package:dio/dio.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/material.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:go_router/go_router.dart';
import '../core/navigation/navigator_key.dart';

/// Background / terminated message handler — must be a top-level function.
/// For messages WITH a notification block, the OS shows them automatically.
/// For pure data messages, we create a local notification here.
@pragma('vm:entry-point')
Future<void> _onBackgroundMessage(RemoteMessage message) async {
  if (message.notification != null) return; // OS handles it

  final title = message.data['title'] ?? 'TotalStore Rider';
  final body = message.data['body'] ?? '';
  if (title.isEmpty && body.isEmpty) return;

  final plugin = FlutterLocalNotificationsPlugin();
  await plugin.initialize(
    const InitializationSettings(
      android: AndroidInitializationSettings('@mipmap/ic_launcher'),
      iOS: DarwinInitializationSettings(),
    ),
  );
  final androidPlugin =
      plugin.resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>();
  await androidPlugin?.createNotificationChannel(const AndroidNotificationChannel(
    'rider_high', 'Rider Alerts', importance: Importance.high, playSound: true,
  ));
  await plugin.show(
    message.hashCode, title, body,
    const NotificationDetails(
      android: AndroidNotificationDetails(
        'rider_high', 'Rider Alerts',
        importance: Importance.high,
        priority: Priority.high,
        icon: '@mipmap/ic_launcher',
      ),
      iOS: DarwinNotificationDetails(
        presentAlert: true, presentBadge: true, presentSound: true,
        interruptionLevel: InterruptionLevel.active,
      ),
    ),
    payload: message.data['route'],
  );
}

class NotificationService {
  NotificationService._();

  static final _fcm = FirebaseMessaging.instance;
  static final _localNotifs = FlutterLocalNotificationsPlugin();

  static const _channel = AndroidNotificationChannel(
    'rider_high',
    'Rider Alerts',
    description: 'New delivery assignments, order updates, and earnings.',
    importance: Importance.high,
    playSound: true,
    enableVibration: true,
    enableLights: true,
    ledColor: Color(0xFF16A34A),
  );

  static Future<void> initialize() async {
    FirebaseMessaging.onBackgroundMessage(_onBackgroundMessage);

    await _fcm.requestPermission(
      alert: true,
      badge: true,
      sound: true,
      provisional: false,
    );

    await _fcm.setForegroundNotificationPresentationOptions(
      alert: true,
      badge: true,
      sound: true,
    );

    // Subscribe to broadcast topics
    await _fcm.subscribeToTopic('all_users');
    await _fcm.subscribeToTopic('riders');

    final androidPlugin = _localNotifs
        .resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>();
    await androidPlugin?.createNotificationChannel(_channel);

    const initSettings = InitializationSettings(
      android: AndroidInitializationSettings('@mipmap/ic_launcher'),
      iOS: DarwinInitializationSettings(
        requestAlertPermission: false,
        requestBadgePermission: false,
        requestSoundPermission: false,
      ),
    );
    await _localNotifs.initialize(
      initSettings,
      onDidReceiveNotificationResponse: _onLocalNotifTapped,
      onDidReceiveBackgroundNotificationResponse: _onLocalNotifTapped,
    );

    FirebaseMessaging.onMessage.listen(_handleForegroundMessage);
    FirebaseMessaging.onMessageOpenedApp.listen(_handleMessageOpen);

    final initial = await _fcm.getInitialMessage();
    if (initial != null) _handleMessageOpen(initial);

    // Token registration happens after login (see registerTokenAfterLogin())
    // Listen for token refresh — will only send if user is already logged in
    _fcm.onTokenRefresh.listen(_registerToken);
  }

  static void _handleForegroundMessage(RemoteMessage message) {
    final notif = message.notification;
    if (notif != null) {
      _showLocalNotification(
        id: notif.hashCode,
        title: notif.title ?? 'TotalStore Rider',
        body: notif.body ?? '',
        payload: message.data['route'],
      );
    }
    _showInAppBanner(
      title: notif?.title ?? message.data['title'] ?? 'New notification',
      body: notif?.body ?? message.data['body'] ?? '',
      route: message.data['route'],
    );
  }

  static Future<void> _showLocalNotification({
    required int id,
    required String title,
    required String body,
    String? payload,
  }) async {
    final androidDetails = AndroidNotificationDetails(
      _channel.id,
      _channel.name,
      channelDescription: _channel.description,
      importance: Importance.high,
      priority: Priority.high,
      icon: '@mipmap/ic_launcher',
      color: const Color(0xFF16A34A),
      showWhen: true,
      styleInformation: BigTextStyleInformation(body, contentTitle: title),
    );
    const iosDetails = DarwinNotificationDetails(
      presentAlert: true,
      presentBadge: true,
      presentSound: true,
      interruptionLevel: InterruptionLevel.active,
    );
    await _localNotifs.show(
      id,
      title,
      body,
      NotificationDetails(android: androidDetails, iOS: iosDetails),
      payload: payload,
    );
  }

  static void _showInAppBanner({
    required String title,
    required String body,
    String? route,
  }) {
    final context = rootNavigatorKey.currentContext;
    if (context == null) return;

    final overlay = Overlay.of(context);
    late OverlayEntry entry;

    entry = OverlayEntry(
      builder: (_) => _RiderNotificationBanner(
        title: title,
        body: body,
        onTap: () {
          entry.remove();
          if (route != null && route.isNotEmpty) {
            GoRouter.of(context).push(route);
          }
        },
        onDismiss: entry.remove,
      ),
    );

    overlay.insert(entry);
    Future.delayed(const Duration(seconds: 5), () {
      if (entry.mounted) entry.remove();
    });
  }

  static void _handleMessageOpen(RemoteMessage message) {
    final route = message.data['route'];
    if (route == null || route.isEmpty) return;
    final context = rootNavigatorKey.currentContext;
    if (context != null) GoRouter.of(context).push(route);
  }

  @pragma('vm:entry-point')
  static void _onLocalNotifTapped(NotificationResponse response) {
    final route = response.payload;
    if (route == null || route.isEmpty) return;
    final context = rootNavigatorKey.currentContext;
    if (context != null) GoRouter.of(context).push(route);
  }

  static Future<void> showLocalAlert({
    required String title,
    required String body,
    String? route,
  }) async {
    await _showLocalNotification(
      id: DateTime.now().millisecondsSinceEpoch ~/ 1000,
      title: title,
      body: body,
      payload: route,
    );
    _showInAppBanner(title: title, body: body, route: route);
  }

  // ── FCM token registration ──────────────────────────────────────────────

  static Future<void> _registerToken(String token) async {
    try {
      const storage = FlutterSecureStorage();
      final accessToken = await storage.read(key: 'riderAccessToken');
      if (accessToken == null) return;
      const baseUrl = String.fromEnvironment('API_URL', defaultValue: 'https://store.saktech.org/api/v1');
      await Dio().patch(
        '$baseUrl/auth/fcm-token',
        data: {'fcmToken': token},
        options: Options(headers: {'Authorization': 'Bearer $accessToken'}),
      );
      debugPrint('✅ Rider FCM token registered');
    } catch (e) {
      debugPrint('⚠️ Rider FCM token register failed: $e');
    }
  }

  static Future<void> registerTokenAfterLogin() async {
    final token = await _fcm.getToken();
    if (token != null) await _registerToken(token);
  }
}

// ── Rider in-app banner ──────────────────────────────────────────────────────

class _RiderNotificationBanner extends StatefulWidget {
  final String title;
  final String body;
  final VoidCallback onTap;
  final VoidCallback onDismiss;

  const _RiderNotificationBanner({
    required this.title,
    required this.body,
    required this.onTap,
    required this.onDismiss,
  });

  @override
  State<_RiderNotificationBanner> createState() =>
      _RiderNotificationBannerState();
}

class _RiderNotificationBannerState extends State<_RiderNotificationBanner>
    with SingleTickerProviderStateMixin {
  late AnimationController _ctrl;
  late Animation<Offset> _slide;
  late Animation<double> _fade;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(
        vsync: this, duration: const Duration(milliseconds: 350));
    _slide =
        Tween<Offset>(begin: const Offset(0, -1), end: Offset.zero).animate(
          CurvedAnimation(parent: _ctrl, curve: Curves.easeOutCubic),
        );
    _fade = CurvedAnimation(parent: _ctrl, curve: Curves.easeIn);
    _ctrl.forward();
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  Future<void> _dismiss() async {
    await _ctrl.reverse();
    widget.onDismiss();
  }

  @override
  Widget build(BuildContext context) {
    return Positioned(
      top: MediaQuery.of(context).padding.top + 8,
      left: 12,
      right: 12,
      child: SlideTransition(
        position: _slide,
        child: FadeTransition(
          opacity: _fade,
          child: Material(
            elevation: 8,
            borderRadius: BorderRadius.circular(14),
            color: Colors.transparent,
            child: GestureDetector(
              onTap: widget.onTap,
              onVerticalDragEnd: (d) {
                if (d.primaryVelocity != null && d.primaryVelocity! < 0) {
                  _dismiss();
                }
              },
              child: Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                decoration: BoxDecoration(
                  color: const Color(0xFF14532D),
                  borderRadius: BorderRadius.circular(14),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.3),
                      blurRadius: 16,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: const Color(0xFF16A34A).withOpacity(0.25),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: const Icon(
                        Icons.delivery_dining_rounded,
                        color: Color(0xFF4ADE80),
                        size: 22,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            widget.title,
                            style: const TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.bold,
                              fontSize: 14,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                          const SizedBox(height: 2),
                          Text(
                            widget.body,
                            style: TextStyle(
                              color: Colors.white.withOpacity(0.8),
                              fontSize: 12,
                            ),
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 8),
                    GestureDetector(
                      onTap: _dismiss,
                      child: Icon(
                        Icons.close_rounded,
                        color: Colors.white.withOpacity(0.5),
                        size: 18,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
