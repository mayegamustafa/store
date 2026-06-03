import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../core/theme.dart';
import '../providers/auth_provider.dart';

class RegisterScreen extends StatefulWidget {
  const RegisterScreen({super.key});
  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  final _formKey = GlobalKey<FormState>();
  int _step = 0; // 0 = account info, 1 = store info

  // Step 1 – Account
  final _firstNameCtrl = TextEditingController();
  final _lastNameCtrl = TextEditingController();
  final _phoneCtrl = TextEditingController();
  final _emailCtrl = TextEditingController();
  final _passCtrl = TextEditingController();
  bool _obscure = true;

  // Step 2 – Store
  final _storeNameCtrl = TextEditingController();
  final _storeDescCtrl = TextEditingController();
  String _storeCategory = 'General';

  bool _loading = false;
  String? _error;

  final _categories = [
    'General',
    'Fashion & Clothing',
    'Electronics',
    'Beauty & Health',
    'Food & Groceries',
    'Home & Living',
    'Sports & Outdoors',
    'Books & Stationery',
    'Automotive',
    'Other',
  ];

  Future<void> _register() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() { _loading = true; _error = null; });
    final err = await context.read<AuthProvider>().register(
      firstName: _firstNameCtrl.text.trim(),
      lastName: _lastNameCtrl.text.trim(),
      phone: _phoneCtrl.text.trim(),
      email: _emailCtrl.text.trim().isEmpty ? null : _emailCtrl.text.trim(),
      password: _passCtrl.text,
      storeName: _storeNameCtrl.text.trim(),
      storeDescription: _storeDescCtrl.text.trim(),
      storeCategory: _storeCategory,
    );
    if (!mounted) return;
    setState(() => _loading = false);
    if (err != null) {
      setState(() => _error = err);
    } else {
      context.go('/dashboard');
    }
  }

  @override
  void dispose() {
    _firstNameCtrl.dispose();
    _lastNameCtrl.dispose();
    _phoneCtrl.dispose();
    _emailCtrl.dispose();
    _passCtrl.dispose();
    _storeNameCtrl.dispose();
    _storeDescCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 24),
            child: Form(
              key: _formKey,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Container(
                    width: 80, height: 80,
                    margin: const EdgeInsets.only(bottom: 16),
                    alignment: Alignment.center,
                    decoration: BoxDecoration(
                      color: AppTheme.primary.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: const Icon(Icons.store_rounded, size: 44, color: AppTheme.primary),
                  ),
                  Text(
                    _step == 0 ? 'Create Account' : 'Set Up Your Store',
                    style: const TextStyle(fontSize: 26, fontWeight: FontWeight.bold, color: AppTheme.textPrimary),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 4),
                  Text(
                    _step == 0 ? 'Register as a seller on TotalStore' : 'Tell us about your store',
                    style: const TextStyle(fontSize: 14, color: AppTheme.textSecondary),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 8),

                  // Step indicator
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      _stepDot(0),
                      Container(width: 40, height: 2, color: _step >= 1 ? AppTheme.primary : AppTheme.border),
                      _stepDot(1),
                    ],
                  ),
                  const SizedBox(height: 24),

                  if (_error != null) ...[
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: AppTheme.error.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.error_outline, color: AppTheme.error, size: 20),
                          const SizedBox(width: 8),
                          Expanded(child: Text(_error!, style: const TextStyle(color: AppTheme.error, fontSize: 13))),
                        ],
                      ),
                    ),
                    const SizedBox(height: 16),
                  ],

                  if (_step == 0) ..._accountFields(),
                  if (_step == 1) ..._storeFields(),

                  const SizedBox(height: 24),

                  if (_step == 0)
                    SizedBox(
                      height: 52,
                      child: ElevatedButton(
                        onPressed: () {
                          if (_formKey.currentState!.validate()) {
                            setState(() => _step = 1);
                          }
                        },
                        child: const Text('Continue'),
                      ),
                    ),

                  if (_step == 1) ...[
                    SizedBox(
                      height: 52,
                      child: ElevatedButton(
                        onPressed: _loading ? null : _register,
                        child: _loading
                            ? const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                            : const Text('Create Store'),
                      ),
                    ),
                    const SizedBox(height: 12),
                    Center(
                      child: TextButton(
                        onPressed: () => setState(() => _step = 0),
                        child: const Text('← Back'),
                      ),
                    ),
                  ],

                  const SizedBox(height: 16),
                  if (_step == 0)
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Text('Already have a store? ', style: TextStyle(color: AppTheme.textSecondary)),
                        GestureDetector(
                          onTap: () => context.go('/login'),
                          child: const Text('Sign In', style: TextStyle(color: AppTheme.primary, fontWeight: FontWeight.bold)),
                        ),
                      ],
                    ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _stepDot(int step) {
    final active = _step >= step;
    return Container(
      width: 28, height: 28,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: active ? AppTheme.primary : AppTheme.border,
      ),
      child: Center(
        child: active && _step > step
            ? const Icon(Icons.check, size: 16, color: Colors.white)
            : Text('${step + 1}', style: TextStyle(color: active ? Colors.white : AppTheme.textSecondary, fontWeight: FontWeight.bold, fontSize: 12)),
      ),
    );
  }

  List<Widget> _accountFields() => [
    TextFormField(
      controller: _firstNameCtrl,
      textInputAction: TextInputAction.next,
      decoration: const InputDecoration(labelText: 'First Name', prefixIcon: Icon(Icons.person_outline)),
      validator: (v) => (v == null || v.trim().isEmpty) ? 'Required' : null,
    ),
    const SizedBox(height: 14),
    TextFormField(
      controller: _lastNameCtrl,
      textInputAction: TextInputAction.next,
      decoration: const InputDecoration(labelText: 'Last Name', prefixIcon: Icon(Icons.person_outline)),
    ),
    const SizedBox(height: 14),
    TextFormField(
      controller: _phoneCtrl,
      keyboardType: TextInputType.phone,
      textInputAction: TextInputAction.next,
      decoration: const InputDecoration(labelText: 'Phone Number', prefixIcon: Icon(Icons.phone_outlined), hintText: '+256...'),
      validator: (v) => (v == null || v.trim().length < 10) ? 'Enter valid phone' : null,
    ),
    const SizedBox(height: 14),
    TextFormField(
      controller: _emailCtrl,
      keyboardType: TextInputType.emailAddress,
      textInputAction: TextInputAction.next,
      decoration: const InputDecoration(labelText: 'Email (optional)', prefixIcon: Icon(Icons.email_outlined)),
    ),
    const SizedBox(height: 14),
    TextFormField(
      controller: _passCtrl,
      obscureText: _obscure,
      textInputAction: TextInputAction.done,
      decoration: InputDecoration(
        labelText: 'Password',
        prefixIcon: const Icon(Icons.lock_outline),
        suffixIcon: IconButton(
          icon: Icon(_obscure ? Icons.visibility_off_outlined : Icons.visibility_outlined),
          onPressed: () => setState(() => _obscure = !_obscure),
        ),
      ),
      validator: (v) => (v == null || v.length < 8) ? 'Min 8 characters' : null,
    ),
  ];

  List<Widget> _storeFields() => [
    TextFormField(
      controller: _storeNameCtrl,
      textInputAction: TextInputAction.next,
      decoration: const InputDecoration(labelText: 'Store Name', prefixIcon: Icon(Icons.storefront_outlined)),
      validator: (v) => (v == null || v.trim().length < 2) ? 'Enter store name' : null,
    ),
    const SizedBox(height: 14),
    DropdownButtonFormField<String>(
      value: _storeCategory,
      decoration: const InputDecoration(labelText: 'Store Category', prefixIcon: Icon(Icons.category_outlined)),
      items: _categories.map((c) => DropdownMenuItem(value: c, child: Text(c))).toList(),
      onChanged: (v) => setState(() => _storeCategory = v ?? 'General'),
    ),
    const SizedBox(height: 14),
    TextFormField(
      controller: _storeDescCtrl,
      maxLines: 3,
      decoration: const InputDecoration(
        labelText: 'Store Description (optional)',
        prefixIcon: Icon(Icons.description_outlined),
        alignLabelWithHint: true,
      ),
    ),
  ];
}
