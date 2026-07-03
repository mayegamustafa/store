/// Platform-wide money formatting. The currency code comes from the admin
/// setting CURRENCY (fetched via /settings/public by SettingsProvider) —
/// never hardcode a currency symbol in a screen.
class Money {
  static String code = 'UGX';

  static String fmt(dynamic amount) {
    final v = double.tryParse(amount?.toString() ?? '0') ?? 0;
    final whole = v.round().toString().replaceAllMapped(
        RegExp(r'(\d)(?=(\d{3})+(?!\d))'), (m) => '${m[1]},');
    return '$code $whole';
  }
}
