import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:socket_io_client/socket_io_client.dart' as io;

String get _baseUrl => 'https://store.saktech.org/api/v1';
String get _wsUrl => 'https://store.saktech.org';

class ChatProvider extends ChangeNotifier {
  final _storage = const FlutterSecureStorage();
  late final Dio _dio;

  io.Socket? _socket;
  String? _myUserId;

  List<dynamic>  conversations   = [];
  Map<String, List<dynamic>> messages = {};
  Map<String, bool> typing       = {};
  bool loading        = false;
  bool loadingMessages = false;

  VoidCallback? onNewMessage;

  ChatProvider() {
    _dio = Dio(BaseOptions(
      baseUrl: _baseUrl,
      connectTimeout: const Duration(seconds: 15),
      receiveTimeout: const Duration(seconds: 15),
    ));
    _dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) async {
        final token = await _storage.read(key: 'riderAccessToken');
        if (token != null) options.headers['Authorization'] = 'Bearer $token';
        handler.next(options);
      },
    ));
  }

  // ── Initialization ──────────────────────────────────────────────────────────

  Future<void> init() async {
    final token = await _storage.read(key: 'riderAccessToken');
    if (token == null) return;

    try {
      final profileRes = await _dio.get('/auth/me');
      _myUserId = profileRes.data?['id'] as String?;
    } catch (_) {}

    _socket = io.io('$_wsUrl/chat', <String, dynamic>{
      'transports': ['websocket'],
      'autoConnect': false,
      'auth': {'token': token},
    });

    _socket!.onConnect((_) => debugPrint('[Chat] connected'));
    _socket!.onDisconnect((_) => debugPrint('[Chat] disconnected'));

    _socket!.on('chat:message', (data) {
      final msg = data as Map<String, dynamic>;
      final convId = msg['conversationId'] as String?;
      if (convId != null) {
        messages[convId] = [...(messages[convId] ?? []), msg];
        // update lastMessage on conversation list
        conversations = conversations.map((c) {
          if (c['id'] == convId) return {...c as Map, 'lastMessage': msg};
          return c;
        }).toList();
        notifyListeners();
        onNewMessage?.call();
      }
    });

    _socket!.on('chat:typing', (data) {
      final d = data as Map<String, dynamic>;
      final convId = d['conversationId'] as String?;
      if (convId != null) {
        typing[convId] = (d['isTyping'] as bool?) ?? false;
        notifyListeners();
      }
    });

    _socket!.connect();
    await loadConversations();
  }

  @override
  void dispose() {
    _socket?.disconnect();
    super.dispose();
  }

  // ── API helpers ─────────────────────────────────────────────────────────────

  // ── Conversations ──────────────────────────────────────────────────────────

  Future<void> loadConversations() async {
    loading = true;
    notifyListeners();
    try {
      final res = await _dio.get('/chat/conversations');
      final body = res.data;
      conversations = body is List ? body : (body['data'] ?? []) as List<dynamic>;
    } catch (e) {
      debugPrint('[Chat] loadConversations error: $e');
    } finally {
      loading = false;
      notifyListeners();
    }
  }

  // ── Messages ──────────────────────────────────────────────────────────────

  Future<void> loadMessages(String convId) async {
    loadingMessages = true;
    notifyListeners();
    try {
      final res = await _dio.get('/chat/conversations/$convId/messages');
      final body = res.data;
      final list = body is List ? body : (body['data'] ?? []);
      messages[convId] = list as List<dynamic>;
    } catch (e) {
      debugPrint('[Chat] loadMessages error: $e');
    } finally {
      loadingMessages = false;
      notifyListeners();
    }
  }

  // ── Socket actions ────────────────────────────────────────────────────────

  void joinConversation(String convId) {
    _socket?.emit('chat:join', {'conversationId': convId});
  }

  void leaveConversation(String convId) {
    _socket?.emit('chat:leave', {'conversationId': convId});
  }

  void sendMessage(String convId, String body) {
    if (_socket?.connected == true) {
      _socket!.emit('chat:send', {'conversationId': convId, 'body': body});
    } else {
      // REST fallback
      _sendRest(convId, body);
    }
  }

  Future<void> _sendRest(String convId, String body) async {
    try {
      await _dio.post('/chat/conversations/$convId/messages', data: {'body': body});
      await loadMessages(convId);
    } catch (e) {
      debugPrint('[Chat] sendRest error: $e');
    }
  }

  void emitTyping(String convId, {required bool isTyping}) {
    _socket?.emit('chat:typing', {'conversationId': convId, 'isTyping': isTyping});
  }

  bool isMyMessage(Map<String, dynamic> msg) {
    return msg['senderId'] == _myUserId ||
        msg['sender']?['id'] == _myUserId;
  }
}
