import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../core/theme/app_theme.dart';
import '../../providers/chat_provider.dart';

class ChatThreadScreen extends StatefulWidget {
  final Map<String, dynamic> conversation;
  const ChatThreadScreen({super.key, required this.conversation});

  @override
  State<ChatThreadScreen> createState() => _ChatThreadScreenState();
}

class _ChatThreadScreenState extends State<ChatThreadScreen> {
  final _controller = TextEditingController();
  final _scrollController = ScrollController();
  bool _sending = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final chat = context.read<ChatProvider>();
      chat.loadMessages(widget.conversation['id'] as String).then((_) => _scrollToBottom());
      chat.joinConversation(widget.conversation['id'] as String);
      chat.onNewMessage = _scrollToBottom;
    });
  }

  @override
  void dispose() {
    _controller.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent + 80,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  Future<void> _callPhone(String phone) async {
    final uri = Uri(scheme: 'tel', path: phone);
    if (await canLaunchUrl(uri)) await launchUrl(uri);
  }

  Future<void> _send(ChatProvider chat, String convId) async {
    final body = _controller.text.trim();
    if (body.isEmpty || _sending) return;
    setState(() => _sending = true);
    _controller.clear();
    chat.sendMessage(convId, body);
    await Future.delayed(const Duration(milliseconds: 150));
    if (mounted) setState(() => _sending = false);
    _scrollToBottom();
  }

  @override
  Widget build(BuildContext context) {
    final convId = widget.conversation['id'] as String;
    final others = (widget.conversation['participants'] as List<dynamic>? ?? [])
        .where((p) => p['role'] != 'RIDER')
        .toList();
    final title = others
        .map((p) => p['user']?['firstName'] as String? ?? '')
        .where((s) => s.isNotEmpty)
        .join(' & ');
    final phones = others
        .where((p) => p['user']?['phone'] != null)
        .map((p) => MapEntry(
              p['user']?['firstName'] as String? ?? '',
              p['user']?['phone'] as String,
            ))
        .toList();
    final isResolved = widget.conversation['isResolved'] == true;

    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        backgroundColor: AppTheme.surface,
        surfaceTintColor: Colors.transparent,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 18),
          onPressed: () => Navigator.pop(context),
        ),
        title: Row(
          children: [
            Container(
              width: 36,
              height: 36,
              decoration: BoxDecoration(
                color: AppTheme.primary.withOpacity(0.12),
                shape: BoxShape.circle,
              ),
              child: Center(
                child: Text(
                  title.isNotEmpty ? title[0].toUpperCase() : '?',
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                    color: AppTheme.primary,
                  ),
                ),
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title.isNotEmpty ? title : 'Conversation',
                    style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: AppTheme.textPrimary),
                    overflow: TextOverflow.ellipsis,
                  ),
                  if (isResolved)
                    Text('Resolved', style: TextStyle(fontSize: 11, color: AppTheme.successGreen, fontWeight: FontWeight.w600))
                  else if (phones.isNotEmpty)
                    Text(phones.first.value, style: const TextStyle(fontSize: 11, color: AppTheme.textSecondary)),
                ],
              ),
            ),
          ],
        ),
        actions: [
          if (phones.isNotEmpty)
            IconButton(
              icon: Container(
                padding: const EdgeInsets.all(6),
                decoration: BoxDecoration(
                  color: AppTheme.primary.withOpacity(0.1),
                  shape: BoxShape.circle,
                ),
                child: Icon(Icons.phone_rounded, size: 16, color: AppTheme.primary),
              ),
              tooltip: 'Call ${phones.first.key}',
              onPressed: () => _callPhone(phones.first.value),
            ),
          const SizedBox(width: 8),
        ],
      ),
      body: Consumer<ChatProvider>(
        builder: (context, chat, _) {
          final msgs = chat.messages[convId] ?? [];

          return Column(
            children: [
              // Messages
              Expanded(
                child: chat.loadingMessages
                    ? const Center(child: CircularProgressIndicator())
                    : msgs.isEmpty
                        ? Center(
                            child: Column(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(Icons.chat_outlined, size: 48, color: AppTheme.textTertiary.withOpacity(0.5)),
                                const SizedBox(height: 12),
                                const Text('No messages yet', style: TextStyle(color: AppTheme.textSecondary, fontSize: 14)),
                                const SizedBox(height: 6),
                                const Text('Send the first message below', style: TextStyle(color: AppTheme.textTertiary, fontSize: 12)),
                              ],
                            ),
                          )
                        : ListView.builder(
                            controller: _scrollController,
                            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                            itemCount: msgs.length,
                            itemBuilder: (ctx, i) {
                              final msg = msgs[i] as Map<String, dynamic>;
                              final isMe = chat.isMyMessage(msg);
                              final type = msg['type'] as String? ?? 'TEXT';
                              final prevMsg = i > 0 ? msgs[i - 1] as Map<String, dynamic> : null;
                              final prevIsMe = prevMsg != null ? chat.isMyMessage(prevMsg) : null;
                              final showSender = !isMe && prevIsMe != false;

                              if (type == 'CALL_REQUEST') {
                                return _CallRequestBubble(body: msg['body'] as String? ?? 'Call request');
                              }

                              return _MessageBubble(
                                msg: msg,
                                isMe: isMe,
                                showSender: showSender,
                              );
                            },
                          ),
              ),

              // Typing indicator
              Consumer<ChatProvider>(
                builder: (_, chat, __) {
                  if (chat.typing[convId] != true) return const SizedBox.shrink();
                  return const _TypingIndicator();
                },
              ),

              // Input bar
              _InputBar(
                controller: _controller,
                sending: _sending,
                onSend: () => _send(chat, convId),
                onTyping: (v) => chat.emitTyping(convId, isTyping: v),
              ),
            ],
          );
        },
      ),
    );
  }
}

// ─── Message Bubble ───────────────────────────────────────────────────────────

class _MessageBubble extends StatelessWidget {
  final Map<String, dynamic> msg;
  final bool isMe;
  final bool showSender;

  const _MessageBubble({required this.msg, required this.isMe, required this.showSender});

  @override
  Widget build(BuildContext context) {
    final body = msg['body'] as String? ?? '';
    final senderName = msg['sender']?['firstName'] as String? ?? '';
    final time = msg['createdAt'] != null ? _formatTime(msg['createdAt'] as String) : '';

    return Padding(
      padding: EdgeInsets.only(
        bottom: 6,
        top: showSender ? 6 : 2,
        left: isMe ? 40 : 0,
        right: isMe ? 0 : 40,
      ),
      child: Align(
        alignment: isMe ? Alignment.centerRight : Alignment.centerLeft,
        child: Column(
          crossAxisAlignment: isMe ? CrossAxisAlignment.end : CrossAxisAlignment.start,
          children: [
            if (!isMe && showSender && senderName.isNotEmpty)
              Padding(
                padding: const EdgeInsets.only(left: 4, bottom: 3),
                child: Text(
                  senderName,
                  style: const TextStyle(fontSize: 11, color: AppTheme.textTertiary, fontWeight: FontWeight.w600),
                ),
              ),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              decoration: BoxDecoration(
                color: isMe ? AppTheme.primary : AppTheme.surface,
                borderRadius: BorderRadius.only(
                  topLeft: const Radius.circular(18),
                  topRight: const Radius.circular(18),
                  bottomLeft: isMe ? const Radius.circular(18) : const Radius.circular(4),
                  bottomRight: isMe ? const Radius.circular(4) : const Radius.circular(18),
                ),
                border: isMe ? null : Border.all(color: AppTheme.divider),
                boxShadow: isMe
                    ? [BoxShadow(color: AppTheme.primary.withOpacity(0.2), blurRadius: 6, offset: const Offset(0, 2))]
                    : AppTheme.cardShadow,
              ),
              child: Text(
                body,
                style: TextStyle(
                  color: isMe ? Colors.white : AppTheme.textPrimary,
                  fontSize: 14,
                  height: 1.4,
                ),
              ),
            ),
            const SizedBox(height: 2),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 4),
              child: Text(
                time,
                style: const TextStyle(fontSize: 10, color: AppTheme.textTertiary),
              ),
            ),
          ],
        ),
      ),
    );
  }

  String _formatTime(String iso) {
    try {
      final dt = DateTime.parse(iso).toLocal();
      return '${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}';
    } catch (_) {
      return '';
    }
  }
}

// ─── Call Request Bubble ──────────────────────────────────────────────────────

class _CallRequestBubble extends StatelessWidget {
  final String body;
  const _CallRequestBubble({required this.body});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Center(
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          decoration: BoxDecoration(
            color: AppTheme.warningAmber.withOpacity(0.1),
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: AppTheme.warningAmber.withOpacity(0.3)),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.phone_callback_rounded, size: 14, color: AppTheme.warningAmber),
              const SizedBox(width: 6),
              Flexible(
                child: Text(body, style: TextStyle(color: AppTheme.warningAmber, fontSize: 12, fontWeight: FontWeight.w500)),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ─── Typing Indicator ─────────────────────────────────────────────────────────

class _TypingIndicator extends StatefulWidget {
  const _TypingIndicator();

  @override
  State<_TypingIndicator> createState() => _TypingIndicatorState();
}

class _TypingIndicatorState extends State<_TypingIndicator> with SingleTickerProviderStateMixin {
  late AnimationController _ctrl;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(vsync: this, duration: const Duration(milliseconds: 900))..repeat();
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 0, 0, 8),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            decoration: BoxDecoration(
              color: AppTheme.surface,
              borderRadius: const BorderRadius.only(
                topLeft: Radius.circular(18),
                topRight: Radius.circular(18),
                bottomRight: Radius.circular(18),
                bottomLeft: Radius.circular(4),
              ),
              border: Border.all(color: AppTheme.divider),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: List.generate(3, (i) => _Dot(ctrl: _ctrl, delay: i * 0.3)),
            ),
          ),
        ],
      ),
    );
  }
}

class _Dot extends StatelessWidget {
  final AnimationController ctrl;
  final double delay;
  const _Dot({required this.ctrl, required this.delay});

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: ctrl,
      builder: (_, __) {
        final t = (ctrl.value - delay).clamp(0.0, 1.0);
        final scale = 0.6 + 0.4 * (t < 0.5 ? t * 2 : (1 - t) * 2);
        return Container(
          margin: const EdgeInsets.symmetric(horizontal: 2),
          width: 7,
          height: 7,
          decoration: BoxDecoration(
            color: AppTheme.textTertiary.withOpacity(0.6 + 0.4 * scale),
            shape: BoxShape.circle,
          ),
          transform: Matrix4.identity()..scale(scale),
          transformAlignment: Alignment.center,
        );
      },
    );
  }
}

// ─── Input Bar ────────────────────────────────────────────────────────────────

class _InputBar extends StatefulWidget {
  final TextEditingController controller;
  final bool sending;
  final VoidCallback onSend;
  final ValueChanged<bool> onTyping;

  const _InputBar({
    required this.controller,
    required this.sending,
    required this.onSend,
    required this.onTyping,
  });

  @override
  State<_InputBar> createState() => _InputBarState();
}

class _InputBarState extends State<_InputBar> {
  bool _hasText = false;

  @override
  void initState() {
    super.initState();
    widget.controller.addListener(_onTextChanged);
  }

  @override
  void dispose() {
    widget.controller.removeListener(_onTextChanged);
    super.dispose();
  }

  void _onTextChanged() {
    final has = widget.controller.text.trim().isNotEmpty;
    if (has != _hasText) {
      setState(() => _hasText = has);
      widget.onTyping(has);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: AppTheme.surface,
        border: Border(top: BorderSide(color: AppTheme.divider)),
      ),
      child: SafeArea(
        top: false,
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            Expanded(
              child: Container(
                decoration: BoxDecoration(
                  color: AppTheme.background,
                  borderRadius: BorderRadius.circular(24),
                  border: Border.all(color: AppTheme.divider),
                ),
                child: TextField(
                  controller: widget.controller,
                  minLines: 1,
                  maxLines: 4,
                  style: const TextStyle(fontSize: 14, color: AppTheme.textPrimary),
                  decoration: const InputDecoration(
                    hintText: 'Type a message…',
                    hintStyle: TextStyle(color: AppTheme.textTertiary, fontSize: 14),
                    border: InputBorder.none,
                    contentPadding: EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                  ),
                  onSubmitted: (_) => widget.onSend(),
                ),
              ),
            ),
            const SizedBox(width: 8),
            GestureDetector(
              onTap: _hasText ? widget.onSend : null,
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                width: 42,
                height: 42,
                decoration: BoxDecoration(
                  color: _hasText ? AppTheme.primary : AppTheme.divider,
                  shape: BoxShape.circle,
                ),
                child: widget.sending
                    ? const Padding(
                        padding: EdgeInsets.all(11),
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: Colors.white,
                        ),
                      )
                    : Icon(
                        Icons.send_rounded,
                        color: _hasText ? Colors.white : AppTheme.textTertiary,
                        size: 18,
                      ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
