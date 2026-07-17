import 'package:flutter/material.dart';

/// Reusable "Sign in with ..." social button
class SocialAuthButton extends StatelessWidget {
  final String label;
  final Widget logo;
  final VoidCallback? onPressed;
  final Color? borderColor;

  const SocialAuthButton({
    super.key,
    required this.label,
    required this.logo,
    required this.onPressed,
    this.borderColor,
  });

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 50,
      child: OutlinedButton(
        onPressed: onPressed,
        style: OutlinedButton.styleFrom(
          backgroundColor: Colors.white,
          foregroundColor: const Color(0xFF1E293B),
          side: BorderSide(color: borderColor ?? const Color(0xFFE2E8F0)),
          shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12)),
          padding: const EdgeInsets.symmetric(horizontal: 16),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            SizedBox(width: 22, height: 22, child: logo),
            const SizedBox(width: 10),
            Text(
              label,
              style: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                  color: Color(0xFF1E293B)),
            ),
          ],
        ),
      ),
    );
  }
}

/// Google logo painted with SVG-like CustomPainter (no image dependency)
class GoogleLogo extends StatelessWidget {
  const GoogleLogo({super.key});

  @override
  Widget build(BuildContext context) {
    return Image.asset('assets/icons/google_g.png', width: 20, height: 20);
  }
}

class _GoogleLogoPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final double w = size.width, h = size.height;
    final Path blue = Path()
      ..moveTo(w * 0.52, h * 0.0)
      ..arcTo(Rect.fromLTWH(0, 0, w, h), -1.57, 3.14, false)
      ..lineTo(w * 0.52, h * 0.5)
      ..close();
    canvas.drawPath(blue, Paint()..color = const Color(0xFF4285F4));
    final Path green = Path()
      ..moveTo(w * 0.0, h * 0.52)
      ..arcTo(Rect.fromLTWH(0, 0, w, h), 3.14, 1.57, false)
      ..lineTo(w * 0.5, h * 0.5)
      ..close();
    canvas.drawPath(green, Paint()..color = const Color(0xFF34A853));
    final Path yellow = Path()
      ..moveTo(w * 0.5, h * 1.0)
      ..arcTo(Rect.fromLTWH(0, 0, w, h), 1.57, 1.57, false)
      ..lineTo(w * 0.5, h * 0.5)
      ..close();
    canvas.drawPath(yellow, Paint()..color = const Color(0xFFFBBC05));
    final Path red = Path()
      ..moveTo(w * 1.0, h * 0.5)
      ..arcTo(Rect.fromLTWH(0, 0, w, h), 0, 1.57, false)
      ..lineTo(w * 0.5, h * 0.5)
      ..close();
    canvas.drawPath(red, Paint()..color = const Color(0xFFEA4335));
    canvas.drawCircle(
        Offset(w * 0.5, h * 0.5), w * 0.22, Paint()..color = Colors.white);
  }

  @override
  bool shouldRepaint(covariant CustomPainter old) => false;
}

/// Divider with "or continue with" text
class OrDivider extends StatelessWidget {
  const OrDivider({super.key});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        const Expanded(child: Divider()),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 12),
          child: Text(
            'or continue with',
            style: TextStyle(
                fontSize: 12,
                color: Colors.grey.shade400,
                fontWeight: FontWeight.w500),
          ),
        ),
        const Expanded(child: Divider()),
      ],
    );
  }
}
