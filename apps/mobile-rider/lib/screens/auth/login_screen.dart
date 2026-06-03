import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:country_code_picker/country_code_picker.dart';
import '../../core/theme/app_theme.dart';
import '../../providers/auth_provider.dart';
import '../../services/biometric_service.dart';
import '../../services/google_auth_service.dart';
import '../../widgets/auth/auth_social_button.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _phoneCtrl = TextEditingController();
  final _passwordCtrl = TextEditingController();
  bool _obscure = true;
  bool _loading = false;
  bool _showBiometric = false;
  String _countryCode = '+256';

  String get _fullPhone => '$_countryCode${_phoneCtrl.text.trim().replaceFirst(RegExp(r'^0'), '')}'.replaceAll(' ', '');

  Future<void> _googleSignIn() async {
    setState(() => _loading = true);
    try {
      final idToken = await GoogleAuthService.signIn();
      if (idToken == null) { setState(() => _loading = false); return; }
      final auth = context.read<AuthProvider>();
      final err = await auth.googleLogin(idToken);
      if (!mounted) return;
      if (err != null) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(err), backgroundColor: Colors.red,
              behavior: SnackBarBehavior.floating, margin: const EdgeInsets.all(16),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10))));
      } else {
        context.go('/deliveries');
      }
    } catch (_) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Google sign-in failed'), backgroundColor: Colors.red));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  void initState() {
    super.initState();
    _checkBiometric();
  }

  Future<void> _checkBiometric() async {
    final enrolled = await BiometricService.isEnrolled();
    final enabled = await BiometricService.isEnabled();
    if (mounted && enrolled && enabled) {
      setState(() => _showBiometric = true);
    }
  }

  Future<void> _biometricSignIn() async {
    final auth = context.read<AuthProvider>();
    final ok = await auth.biometricLogin();
    if (!mounted) return;
    if (ok) {
      context.go('/deliveries');
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Biometric authentication failed'), backgroundColor: Colors.red),
      );
    }
  }

  @override
  void dispose() { _phoneCtrl.dispose(); _passwordCtrl.dispose(); super.dispose(); }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _loading = true);
    final auth = context.read<AuthProvider>();
    final err = await auth.login(phone: _fullPhone, password: _passwordCtrl.text.trim());
    setState(() => _loading = false);
    if (err != null) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(err), backgroundColor: Colors.red));
    } else {
      context.go('/deliveries');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF0FDF4),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const SizedBox(height: 60),
                Center(
                  child: Column(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(20),
                        decoration: BoxDecoration(color: AppTheme.primary, borderRadius: BorderRadius.circular(24)),
                        child: const Icon(Icons.delivery_dining_rounded, size: 52, color: Colors.white),
                      ),
                      const SizedBox(height: 20),
                      const Text('Rider Portal', style: TextStyle(fontSize: 28, fontWeight: FontWeight.bold, color: AppTheme.textPrimary)),
                      const SizedBox(height: 8),
                      const Text('Sign in to start delivering', style: TextStyle(color: AppTheme.textSecondary)),
                    ],
                  ),
                ),
                const SizedBox(height: 40),
                TextFormField(
                  controller: _phoneCtrl,
                  keyboardType: TextInputType.phone,
                  decoration: InputDecoration(
                    labelText: 'Phone Number',
                    prefixIcon: const Icon(Icons.phone_outlined),
                    prefix: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        CountryCodePicker(
                          onChanged: (c) => setState(() => _countryCode = c.dialCode ?? '+256'),
                          initialSelection: 'UG',
                          showFlag: true,
                          showCountryOnly: false,
                          showOnlyCountryWhenClosed: false,
                          alignLeft: false,
                          textStyle: const TextStyle(fontSize: 14),
                          padding: EdgeInsets.zero,
                        ),
                      ],
                    ),
                  ),
                  validator: (v) => (v?.length ?? 0) < 9 ? 'Enter phone number' : null,
                ),
                const SizedBox(height: 16),
                TextFormField(
                  controller: _passwordCtrl,
                  obscureText: _obscure,
                  decoration: InputDecoration(
                    labelText: 'Password',
                    prefixIcon: const Icon(Icons.lock_outlined),
                    suffixIcon: IconButton(icon: Icon(_obscure ? Icons.visibility_off_outlined : Icons.visibility_outlined), onPressed: () => setState(() => _obscure = !_obscure)),
                  ),
                  validator: (v) => (v?.length ?? 0) < 6 ? 'Enter password' : null,
                ),
                const SizedBox(height: 28),
                SizedBox(
                  height: 52,
                  child: ElevatedButton(
                    onPressed: _loading ? null : _submit,
                    style: ElevatedButton.styleFrom(backgroundColor: AppTheme.primary, foregroundColor: Colors.white, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14))),
                    child: _loading
                        ? const SizedBox(height: 22, width: 22, child: CircularProgressIndicator(strokeWidth: 2, valueColor: AlwaysStoppedAnimation(Colors.white)))
                        : const Text('Sign In', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w600)),
                  ),
                ),
                if (_showBiometric) ...[                  
                  const SizedBox(height: 12),
                  SizedBox(
                    height: 52,
                    child: OutlinedButton.icon(
                      onPressed: _loading ? null : _biometricSignIn,
                      icon: const Icon(Icons.fingerprint_rounded, size: 22),
                      label: const Text('Sign in with Biometrics',
                          style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: AppTheme.primary,
                        side: const BorderSide(color: AppTheme.primary),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                      ),
                    ),
                  ),
                ],
                const SizedBox(height: 20),
                const OrDivider(),
                const SizedBox(height: 12),
                SocialAuthButton(
                  label: 'Continue with Google',
                  logo: const GoogleLogo(),
                  onPressed: _loading ? null : _googleSignIn,
                ),
                const SizedBox(height: 24),
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Text("Don't have an account? ",
                        style: TextStyle(color: AppTheme.textSecondary)),
                    GestureDetector(
                      onTap: () => context.go('/register'),
                      child: const Text('Apply here',
                          style: TextStyle(
                              color: AppTheme.primary,
                              fontWeight: FontWeight.bold)),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
