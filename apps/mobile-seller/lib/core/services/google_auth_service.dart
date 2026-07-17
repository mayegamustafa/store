import 'dart:io' show Platform;
import 'package:flutter/foundation.dart';
import 'package:google_sign_in/google_sign_in.dart';

/// Platform-safe Google Sign-In service.
/// Returns the Google ID token (idToken) for exchange with the backend.
class GoogleAuthService {
  static GoogleSignIn? _instance;

  static GoogleSignIn get _signIn {
    _instance ??= GoogleSignIn(
      scopes: ['email', 'profile'],
    );
    return _instance!;
  }

  /// Returns the idToken string on success, null on cancel.
  /// Throws on hard errors.
  static Future<String?> signIn() async {
    // google_sign_in supports Android, iOS, and Web.
    // On Linux desktop (dev mode) we skip and return null gracefully.
    if (!kIsWeb && !Platform.isAndroid && !Platform.isIOS) {
      return null;
    }
    try {
      await _signIn.signOut(); // force account chooser
      final account = await _signIn.signIn();
      if (account == null) return null;
      final auth = await account.authentication;
      return auth.idToken;
    } catch (e) {
      rethrow;
    }
  }

  static Future<void> signOut() async {
    try {
      await _signIn.signOut();
    } catch (_) {}
  }
}
