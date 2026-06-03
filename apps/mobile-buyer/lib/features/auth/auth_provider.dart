import 'package:flutter/material.dart';
import 'package:dio/dio.dart';
import 'package:google_sign_in/google_sign_in.dart';
import '../../core/api/api_service.dart';
import '../../core/models/user.dart';
import '../../core/services/biometric_service.dart';
import '../../core/services/notification_service.dart';

class AuthProvider extends ChangeNotifier {
  final ApiService _api = ApiService();
  final BiometricService _biometric = BiometricService();
  final GoogleSignIn _googleSignIn = GoogleSignIn(scopes: ['email', 'profile']);

  User? _user;
  bool _isLoading = false;
  String? _error;
  bool _biometricAvailable = false;
  bool _biometricEnabled = false;

  User? get user => _user;
  bool get isLoading => _isLoading;
  bool get isAuthenticated => _user != null;
  String? get error => _error;
  bool get biometricAvailable => _biometricAvailable;
  bool get biometricEnabled => _biometricEnabled;

  Future<void> init() async {
    _biometricAvailable = await _biometric.isDeviceSupported;
    _biometricEnabled = await _biometric.isEnabled;
    if (!_api.isAuthenticated) return;
    await fetchProfile();
  }

  Future<bool> login({required String emailOrPhone, required String password}) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final response = await _api.dio.post('/auth/login', data: {
        'email': emailOrPhone.contains('@') ? emailOrPhone : null,
        'phone': !emailOrPhone.contains('@') ? emailOrPhone : null,
        'password': password,
      });

      final data = _api.extractData(response);
      await _api.setTokens(data['accessToken'], data['refreshToken']);
      _user = User.fromJson(data['user']);
      NotificationService().registerTokenAfterLogin();

      // Enable biometric after first successful password login
      if (_biometricAvailable) {
        await _biometric.enableBiometric(
          emailOrPhone: emailOrPhone,
          refreshToken: data['refreshToken'],
        );
        _biometricEnabled = true;
      }

      _isLoading = false;
      notifyListeners();
      return true;
    } catch (e) {
      _isLoading = false;
      _error = _extractError(e);
      notifyListeners();
      return false;
    }
  }

  /// Authenticate using biometrics (uses stored refresh token)
  Future<bool> loginWithBiometric() async {
    if (!_biometricAvailable || !_biometricEnabled) return false;

    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final authenticated = await _biometric.authenticate();
      if (!authenticated) {
        _isLoading = false;
        _error = 'Biometric authentication failed';
        notifyListeners();
        return false;
      }

      final creds = await _biometric.getSavedCredentials();
      if (creds == null) {
        _isLoading = false;
        _error = 'No saved credentials';
        notifyListeners();
        return false;
      }

      // Use stored refresh token to get new access token
      final refreshDio = Dio(BaseOptions(baseUrl: _api.dio.options.baseUrl));
      final response = await refreshDio.post('/auth/refresh', data: {
        'refreshToken': creds['refreshToken'],
      });

      final data = response.data is Map && response.data.containsKey('data')
          ? response.data['data']
          : response.data;

      await _api.setTokens(data['accessToken'], data['refreshToken']);

      // Update stored refresh token
      await _biometric.enableBiometric(
        emailOrPhone: creds['emailOrPhone']!,
        refreshToken: data['refreshToken'],
      );

      await fetchProfile();
      NotificationService().registerTokenAfterLogin();
      _isLoading = false;
      notifyListeners();
      return _user != null;
    } catch (e) {
      _isLoading = false;
      _error = _extractError(e);
      notifyListeners();
      return false;
    }
  }

  /// Sign in with Google
  Future<bool> loginWithGoogle() async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final googleUser = await _googleSignIn.signIn();
      if (googleUser == null) {
        _isLoading = false;
        notifyListeners();
        return false; // User cancelled
      }

      final googleAuth = await googleUser.authentication;

      final response = await _api.dio.post('/auth/google-signin', data: {
        'credential': googleAuth.idToken,
        'email': googleUser.email,
        'displayName': googleUser.displayName,
        'photoUrl': googleUser.photoUrl,
      });

      final data = _api.extractData(response);
      await _api.setTokens(data['accessToken'], data['refreshToken']);
      _user = User.fromJson(data['user']);
      NotificationService().registerTokenAfterLogin();

      // Enable biometric for Google sign-in too
      if (_biometricAvailable) {
        await _biometric.enableBiometric(
          emailOrPhone: googleUser.email,
          refreshToken: data['refreshToken'],
        );
        _biometricEnabled = true;
      }

      _isLoading = false;
      notifyListeners();
      return true;
    } catch (e) {
      _isLoading = false;
      _error = _extractError(e);
      notifyListeners();
      return false;
    }
  }

  Future<bool> register({
    required String firstName,
    required String lastName,
    required String email,
    required String phone,
    required String password,
  }) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final response = await _api.dio.post('/auth/register', data: {
        'firstName': firstName,
        'lastName': lastName,
        'email': email,
        'phone': phone,
        'password': password,
        'role': 'BUYER',
      });

      final data = _api.extractData(response);
      await _api.setTokens(data['accessToken'], data['refreshToken']);
      _user = User.fromJson(data['user']);

      if (_biometricAvailable) {
        await _biometric.enableBiometric(
          emailOrPhone: email,
          refreshToken: data['refreshToken'],
        );
        _biometricEnabled = true;
      }

      _isLoading = false;
      notifyListeners();
      return true;
    } catch (e) {
      _isLoading = false;
      _error = _extractError(e);
      notifyListeners();
      return false;
    }
  }

  Future<void> fetchProfile() async {
    try {
      final response = await _api.dio.get('/auth/me');
      final data = _api.extractData(response);
      _user = User.fromJson(data);
      notifyListeners();
    } catch (_) {
      _user = null;
      await _api.clearTokens();
      notifyListeners();
    }
  }

  Future<void> updateProfile({String? firstName, String? lastName, String? avatar}) async {
    try {
      final response = await _api.dio.patch('/users/me', data: {
        if (firstName != null) 'firstName': firstName,
        if (lastName != null) 'lastName': lastName,
        if (avatar != null) 'avatar': avatar,
      });
      final data = _api.extractData(response);
      _user = User.fromJson(data);
      notifyListeners();
    } catch (_) {}
  }

  Future<void> logout() async {
    // Only invalidate server tokens if biometric is NOT enabled
    // (otherwise the stored refresh token would be destroyed)
    if (!_biometricEnabled) {
      try { await _api.dio.post('/auth/logout'); } catch (_) {}
    }
    _user = null;
    await _api.clearTokens();
    // Keep biometric credentials so user can re-login with fingerprint
    // _biometricEnabled remains true so the biometric button shows on login screen
    try { await _googleSignIn.signOut(); } catch (_) {}
    notifyListeners();
  }

  String _extractError(dynamic e) {
    if (e is DioException && e.response?.data != null) {
      final msg = e.response!.data;
      if (msg is Map) return msg['message'] ?? msg['error'] ?? 'Something went wrong';
      return msg.toString();
    }
    return 'Network error. Please try again.';
  }
}
