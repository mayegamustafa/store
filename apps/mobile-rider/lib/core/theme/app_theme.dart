import 'package:flutter/material.dart';

class AppTheme {
  // ── Brand Colors ──────────────────────────────────────────────
  static const Color primaryGreen  = Color(0xFF16A34A);
  static const Color successGreen  = Color(0xFF10B981);
  static const Color warningAmber  = Color(0xFFF59E0B);
  static const Color dangerRed     = Color(0xFFEF4444);
  static const Color infoBlue      = Color(0xFF3B82F6);

  // ── Semantic aliases (keep old names working) ──────────────────
  static const Color primary       = primaryGreen;
  static const Color secondary     = warningAmber;

  // ── Surface / Background ──────────────────────────────────────
  static const Color background    = Color(0xFFF1F5F9);
  static const Color surface       = Color(0xFFFFFFFF);

  // ── Text ──────────────────────────────────────────────────────
  static const Color textPrimary   = Color(0xFF0F172A);
  static const Color textSecondary = Color(0xFF475569);
  static const Color textTertiary  = Color(0xFF94A3B8);

  // ── Borders / Dividers ────────────────────────────────────────
  static const Color divider       = Color(0xFFE2E8F0);

  // ── Card Shadow ───────────────────────────────────────────────
  static List<BoxShadow> get cardShadow => [
    BoxShadow(
      color: const Color(0xFF0F172A).withOpacity(0.05),
      blurRadius: 8,
      offset: const Offset(0, 2),
    ),
  ];

  // ── Status Colors ─────────────────────────────────────────────
  static Color statusColor(String status) {
    switch (status.toUpperCase()) {
      case 'ASSIGNED':   return infoBlue;
      case 'PICKED_UP':  return warningAmber;
      case 'IN_TRANSIT': return primaryGreen;
      case 'DELIVERED':  return successGreen;
      case 'FAILED':     return dangerRed;
      // legacy statuses kept for compatibility
      case 'PENDING':    return warningAmber;
      case 'CONFIRMED':  return infoBlue;
      case 'PROCESSING': return const Color(0xFF8B5CF6);
      case 'SHIPPED':    return primaryGreen;
      default:           return textTertiary;
    }
  }

  static String statusLabel(String status) {
    switch (status.toUpperCase()) {
      case 'ASSIGNED':   return 'Assigned';
      case 'PICKED_UP':  return 'Picked Up';
      case 'IN_TRANSIT': return 'In Transit';
      case 'DELIVERED':  return 'Delivered';
      case 'FAILED':     return 'Failed';
      case 'PENDING':    return 'Pending';
      case 'CONFIRMED':  return 'Confirmed';
      case 'PROCESSING': return 'Processing';
      case 'SHIPPED':    return 'Shipped';
      default:           return status;
    }
  }

  // ── ThemeData ─────────────────────────────────────────────────
  static ThemeData get theme => ThemeData(
    useMaterial3: true,
    colorScheme: ColorScheme.fromSeed(
      seedColor: primaryGreen,
      brightness: Brightness.light,
      surface: surface,
    ),
    scaffoldBackgroundColor: background,

    // ── AppBar ────────────────────────────────────────────────
    appBarTheme: const AppBarTheme(
      centerTitle: false,
      elevation: 0,
      scrolledUnderElevation: 1,
      backgroundColor: surface,
      foregroundColor: textPrimary,
      titleTextStyle: TextStyle(
        fontSize: 18,
        fontWeight: FontWeight.w700,
        color: textPrimary,
        letterSpacing: -0.3,
      ),
    ),

    // ── Card ──────────────────────────────────────────────────
    cardTheme: CardThemeData(
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: const BorderSide(color: divider),
      ),
      color: surface,
      margin: EdgeInsets.zero,
    ),

    // ── ElevatedButton ────────────────────────────────────────
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: primaryGreen,
        foregroundColor: Colors.white,
        elevation: 0,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 20),
        textStyle: const TextStyle(
          fontSize: 15,
          fontWeight: FontWeight.w600,
          letterSpacing: 0.1,
        ),
      ),
    ),

    // ── BottomNavigationBar ───────────────────────────────────
    bottomNavigationBarTheme: const BottomNavigationBarThemeData(
      backgroundColor: surface,
      selectedItemColor: primaryGreen,
      unselectedItemColor: textTertiary,
      showUnselectedLabels: true,
      type: BottomNavigationBarType.fixed,
      elevation: 0,
      selectedLabelStyle: TextStyle(fontSize: 11, fontWeight: FontWeight.w600),
      unselectedLabelStyle: TextStyle(fontSize: 11),
    ),

    // ── Input Decoration ──────────────────────────────────────
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: surface,
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: divider),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: divider),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: primaryGreen, width: 2),
      ),
    ),

    // ── Chip ──────────────────────────────────────────────────
    chipTheme: ChipThemeData(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
      labelStyle: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
    ),

    // ── Divider ───────────────────────────────────────────────
    dividerTheme: const DividerThemeData(
      color: divider,
      thickness: 1,
      space: 1,
    ),
  );
}
