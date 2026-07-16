import 'dart:async';
import 'package:flutter/material.dart';
import 'package:connectivity_plus/connectivity_plus.dart';

/// Slim banner shown whenever the device has no network connection.
/// Wrap any screen body: OfflineBanner(child: ...).
class OfflineBanner extends StatefulWidget {
  final Widget child;
  const OfflineBanner({super.key, required this.child});

  @override
  State<OfflineBanner> createState() => _OfflineBannerState();
}

class _OfflineBannerState extends State<OfflineBanner> {
  StreamSubscription? _sub;
  bool _offline = false;

  @override
  void initState() {
    super.initState();
    Connectivity().checkConnectivity().then(_update);
    _sub = Connectivity().onConnectivityChanged.listen(_update);
  }

  void _update(dynamic result) {
    final list = result is List ? result : [result];
    final offline = list.every((r) => r == ConnectivityResult.none);
    if (mounted && offline != _offline) setState(() => _offline = offline);
  }

  @override
  void dispose() {
    _sub?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        if (_offline)
          Material(
            color: const Color(0xFF334155),
            child: SafeArea(
              bottom: false,
              child: Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(vertical: 6, horizontal: 12),
                child: const Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.wifi_off_rounded, size: 14, color: Colors.white70),
                    SizedBox(width: 6),
                    Text("You're offline — showing saved content",
                        style: TextStyle(color: Colors.white, fontSize: 12)),
                  ],
                ),
              ),
            ),
          ),
        Expanded(child: widget.child),
      ],
    );
  }
}
