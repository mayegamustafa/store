/// Platform-wide money formatting. The currency code comes from the admin
/// setting CURRENCY (fetched via /settings/public at app start) — never
/// hardcode a currency symbol in a screen.
class Money {
  static String code = 'UGX';

  static String fmt(dynamic amount) {
    final v = double.tryParse(amount?.toString() ?? '0') ?? 0;
    final whole = v.round().toString().replaceAllMapped(
        RegExp(r'(\d)(?=(\d{3})+(?!\d))'), (m) => '${m[1]},');
    return '$code $whole';
  }

  static String compact(dynamic amount) {
    final n = double.tryParse(amount?.toString() ?? '0') ?? 0;
    if (n >= 1000000) return '$code ${(n / 1000000).toStringAsFixed(1)}M';
    if (n >= 1000) return '$code ${(n / 1000).toStringAsFixed(0)}K';
    return '$code ${n.toStringAsFixed(0)}';
  }
}
