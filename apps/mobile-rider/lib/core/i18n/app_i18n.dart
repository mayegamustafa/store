import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Lightweight app translations: English (default), Swahili, Luganda.
/// Use `T.t('key')` anywhere; unknown keys fall back to English, then to the
/// key itself, so adding strings is always safe.
class T {
  static String code = 'en';

  static const supported = [
    ('en', 'English'),
    ('sw', 'Kiswahili'),
    ('lg', 'Luganda'),
  ];

  static String t(String key) =>
      _strings[code]?[key] ?? _strings['en']![key] ?? key;

  static const Map<String, Map<String, String>> _strings = {
    'en': {
      'home': 'Home',
      'categories': 'Categories',
      'cart': 'Cart',
      'orders': 'Orders',
      'profile': 'Profile',
      'wishlist': 'Wishlist',
      'dashboard': 'Dashboard',
      'products': 'Products',
      'wallet': 'Wallet',
      'deliveries': 'Deliveries',
      'earnings': 'Earnings',
      'messages': 'Messages',
      'settings': 'Settings',
      'search': 'Search',
      'sign_in': 'Sign In',
      'sign_out': 'Sign Out',
      'welcome_back': 'Welcome back',
      'email_or_phone': 'Email or Phone',
      'password': 'Password',
      'continue_google': 'Continue with Google',
      'sign_in_biometrics': 'Sign in with Biometrics',
      'register': 'Register',
      'language': 'Language',
      'choose_language': 'Choose language',
      'save': 'Save',
      'cancel': 'Cancel',
      'notifications': 'Notifications',
      'track_delivery': 'Track Delivery',
      'withdraw': 'Withdraw',
      'total': 'Total',
      'subscription': 'Subscription',
    },
    'sw': {
      'home': 'Nyumbani',
      'categories': 'Jamii',
      'cart': 'Kikapu',
      'orders': 'Oda',
      'profile': 'Wasifu',
      'wishlist': 'Vipendwa',
      'dashboard': 'Dashibodi',
      'products': 'Bidhaa',
      'wallet': 'Pochi',
      'deliveries': 'Usafirishaji',
      'earnings': 'Mapato',
      'messages': 'Jumbe',
      'settings': 'Mipangilio',
      'search': 'Tafuta',
      'sign_in': 'Ingia',
      'sign_out': 'Toka',
      'welcome_back': 'Karibu tena',
      'email_or_phone': 'Barua pepe au Simu',
      'password': 'Nenosiri',
      'continue_google': 'Endelea na Google',
      'sign_in_biometrics': 'Ingia kwa alama ya kidole',
      'register': 'Jisajili',
      'language': 'Lugha',
      'choose_language': 'Chagua lugha',
      'save': 'Hifadhi',
      'cancel': 'Ghairi',
      'notifications': 'Arifa',
      'track_delivery': 'Fuatilia Oda',
      'withdraw': 'Toa pesa',
      'total': 'Jumla',
      'subscription': 'Usajili',
    },
    'lg': {
      'home': 'Awaka',
      'categories': 'Ebika',
      'cart': 'Ekisero',
      'orders': 'Ebiragiro',
      'profile': 'Ebikukwatako',
      'wishlist': 'Bye njagala',
      'dashboard': 'Olubalaza',
      'products': 'Ebyamaguzi',
      'wallet': 'Ensawo',
      'deliveries': 'Okutuusa',
      'earnings': 'Enfuna',
      'messages': 'Obubaka',
      'settings': 'Entegeka',
      'search': 'Noonya',
      'sign_in': 'Yingira',
      'sign_out': 'Fuluma',
      'welcome_back': 'Tukwanirizza nate',
      'email_or_phone': 'Email oba Essimu',
      'password': "Ekigambo eky'ekyama",
      'continue_google': 'Weyongere ne Google',
      'sign_in_biometrics': "Yingira n'ekinkumu",
      'register': 'Wewandiise',
      'language': 'Olulimi',
      'choose_language': 'Londa olulimi',
      'save': 'Tereka',
      'cancel': 'Sazaamu',
      'notifications': 'Obubaka obutuuse',
      'track_delivery': 'Goberera Ekiragiro',
      'withdraw': 'Ggyamu ssente',
      'total': 'Omugatte',
      'subscription': 'Okwewandiisa',
    },
  };
}

/// Holds the chosen language, persists it, and rebuilds the app on change.
class LocaleProvider extends ChangeNotifier {
  static const _prefKey = 'app_language';

  Future<void> load() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final saved = prefs.getString(_prefKey);
      if (saved != null && T.supported.any((s) => s.$1 == saved)) {
        T.code = saved;
        notifyListeners();
      }
    } catch (_) {}
  }

  Future<void> setLanguage(String code) async {
    if (!T.supported.any((s) => s.$1 == code)) return;
    T.code = code;
    notifyListeners();
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_prefKey, code);
    } catch (_) {}
  }
}

/// Reusable language picker bottom sheet.
Future<void> showLanguagePicker(BuildContext context, LocaleProvider provider) {
  return showModalBottomSheet(
    context: context,
    shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
    builder: (ctx) => SafeArea(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: Text(T.t('choose_language'),
                style: const TextStyle(
                    fontSize: 16, fontWeight: FontWeight.w700)),
          ),
          for (final (langCode, label) in T.supported)
            ListTile(
              leading: Icon(
                T.code == langCode
                    ? Icons.radio_button_checked_rounded
                    : Icons.radio_button_off_rounded,
                color: T.code == langCode ? Colors.green : Colors.grey,
              ),
              title: Text(label),
              onTap: () {
                provider.setLanguage(langCode);
                Navigator.pop(ctx);
              },
            ),
          const SizedBox(height: 8),
        ],
      ),
    ),
  );
}
