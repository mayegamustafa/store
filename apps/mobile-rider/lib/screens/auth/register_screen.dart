import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:country_code_picker/country_code_picker.dart';
import '../../core/theme/app_theme.dart';
import '../../providers/auth_provider.dart';

class RegisterScreen extends StatefulWidget {
  const RegisterScreen({super.key});

  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  final _personalFormKey = GlobalKey<FormState>();
  final _vehicleFormKey = GlobalKey<FormState>();
  final _securityFormKey = GlobalKey<FormState>();
  final _pageCtrl = PageController();

  final _firstNameCtrl = TextEditingController();
  final _lastNameCtrl = TextEditingController();
  final _phoneCtrl = TextEditingController();
  final _emailCtrl = TextEditingController();
  final _passwordCtrl = TextEditingController();
  final _confirmPwCtrl = TextEditingController();
  final _plateCtrl = TextEditingController();
  final _areaCtrl = TextEditingController();

  bool _obscure = true;
  bool _obscureConfirm = true;
  bool _loading = false;
  String _countryCode = '+256';
  String _vehicleType = 'MOTORCYCLE';
  int _step = 0;

  bool get _needsPlate => _vehicleType != 'BICYCLE' && _vehicleType != 'WALKING';

  String get _fullPhone =>
      '$_countryCode${_phoneCtrl.text.trim().replaceFirst(RegExp(r'^0'), '')}'
          .replaceAll(' ', '');

  @override
  void dispose() {
    _firstNameCtrl.dispose();
    _lastNameCtrl.dispose();
    _phoneCtrl.dispose();
    _emailCtrl.dispose();
    _passwordCtrl.dispose();
    _confirmPwCtrl.dispose();
    _plateCtrl.dispose();
    _areaCtrl.dispose();
    _pageCtrl.dispose();
    super.dispose();
  }

  void _nextStep() {
    if (_step == 0 && !_personalFormKey.currentState!.validate()) return;
    if (_step == 1 && !_vehicleFormKey.currentState!.validate()) return;
    if (_step == 2) { _submit(); return; }
    setState(() => _step++);
    _pageCtrl.animateToPage(_step, duration: const Duration(milliseconds: 300), curve: Curves.easeInOut);
  }

  void _prevStep() {
    if (_step == 0) { context.go('/login'); return; }
    setState(() => _step--);
    _pageCtrl.animateToPage(_step, duration: const Duration(milliseconds: 300), curve: Curves.easeInOut);
  }

  Future<void> _submit() async {
    if (!_securityFormKey.currentState!.validate()) return;
    setState(() => _loading = true);
    final auth = context.read<AuthProvider>();
    final err = await auth.register(
      firstName: _firstNameCtrl.text.trim(),
      lastName: _lastNameCtrl.text.trim(),
      phone: _fullPhone,
      email: _emailCtrl.text.trim().isEmpty ? null : _emailCtrl.text.trim(),
      password: _passwordCtrl.text.trim(),
      vehicleType: _vehicleType,
    );
    if (!mounted) return;
    setState(() => _loading = false);
    if (err != null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(err), backgroundColor: Colors.red,
            behavior: SnackBarBehavior.floating, margin: const EdgeInsets.all(16),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10))),
      );
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: const Text('Application submitted! We\'ll notify you once approved.'),
            backgroundColor: AppTheme.primary, behavior: SnackBarBehavior.floating,
            margin: const EdgeInsets.all(16),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10))),
      );
      context.go('/deliveries');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF0FDF4),
      body: SafeArea(
        child: Column(
          children: [
            // Header & Progress
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
              child: Column(
                children: [
                  Row(
                    children: [
                      IconButton(
                        icon: const Icon(Icons.arrow_back_rounded),
                        onPressed: _prevStep,
                      ),
                      const Spacer(),
                      Text('Step ${_step + 1} of 3',
                          style: const TextStyle(color: AppTheme.textSecondary, fontWeight: FontWeight.w500)),
                      const Spacer(),
                      const SizedBox(width: 48),
                    ],
                  ),
                  const SizedBox(height: 12),
                  // Progress bar
                  Row(
                    children: List.generate(3, (i) => Expanded(
                      child: Container(
                        height: 4,
                        margin: EdgeInsets.only(right: i < 2 ? 6 : 0),
                        decoration: BoxDecoration(
                          color: i <= _step ? AppTheme.primary : const Color(0xFFE2E8F0),
                          borderRadius: BorderRadius.circular(2),
                        ),
                      ),
                    )),
                  ),
                ],
              ),
            ),

            // Step Pages
            Expanded(
              child: PageView(
                controller: _pageCtrl,
                physics: const NeverScrollableScrollPhysics(),
                children: [
                  _buildPersonalStep(),
                  _buildVehicleStep(),
                  _buildSecurityStep(),
                ],
              ),
            ),

            // Bottom button
            Padding(
              padding: const EdgeInsets.fromLTRB(24, 8, 24, 16),
              child: SizedBox(
                height: 52,
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: _loading ? null : _nextStep,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.primary,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  ),
                  child: _loading
                      ? const SizedBox(height: 22, width: 22,
                          child: CircularProgressIndicator(strokeWidth: 2,
                              valueColor: AlwaysStoppedAnimation(Colors.white)))
                      : Text(_step == 2 ? 'Submit Application' : 'Continue',
                          style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w600)),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  // --- Step 1: Personal Information ---
  Widget _buildPersonalStep() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Form(
        key: _personalFormKey,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: AppTheme.primary.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: const Icon(Icons.person_add_rounded, size: 40, color: AppTheme.primary),
              ),
            ),
            const SizedBox(height: 20),
            const Center(
              child: Text('Personal Information',
                  style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: AppTheme.textPrimary)),
            ),
            const SizedBox(height: 6),
            const Center(
              child: Text('Tell us about yourself',
                  style: TextStyle(color: AppTheme.textSecondary)),
            ),
            const SizedBox(height: 28),

            TextFormField(
              controller: _firstNameCtrl,
              textCapitalization: TextCapitalization.words,
              decoration: const InputDecoration(
                labelText: 'First Name',
                prefixIcon: Icon(Icons.person_outline),
              ),
              validator: (v) => (v?.trim().isEmpty ?? true) ? 'First name is required' : null,
            ),
            const SizedBox(height: 16),

            TextFormField(
              controller: _lastNameCtrl,
              textCapitalization: TextCapitalization.words,
              decoration: const InputDecoration(
                labelText: 'Last Name',
                prefixIcon: Icon(Icons.person_outline),
              ),
              validator: (v) => (v?.trim().isEmpty ?? true) ? 'Last name is required' : null,
            ),
            const SizedBox(height: 16),

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
              validator: (v) => (v?.length ?? 0) < 9 ? 'Enter a valid phone number' : null,
            ),
            const SizedBox(height: 16),

            TextFormField(
              controller: _emailCtrl,
              keyboardType: TextInputType.emailAddress,
              decoration: const InputDecoration(
                labelText: 'Email (optional)',
                prefixIcon: Icon(Icons.email_outlined),
              ),
            ),
          ],
        ),
      ),
    );
  }

  // --- Step 2: Vehicle & Area ---
  Widget _buildVehicleStep() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Form(
        key: _vehicleFormKey,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: AppTheme.primary.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: const Icon(Icons.two_wheeler_rounded, size: 40, color: AppTheme.primary),
              ),
            ),
            const SizedBox(height: 20),
            const Center(
              child: Text('Vehicle & Area',
                  style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: AppTheme.textPrimary)),
            ),
            const SizedBox(height: 6),
            const Center(
              child: Text('How will you deliver?',
                  style: TextStyle(color: AppTheme.textSecondary)),
            ),
            const SizedBox(height: 28),

            // Vehicle type as selection chips
            const Text('Select Vehicle Type',
                style: TextStyle(fontWeight: FontWeight.w600, fontSize: 14, color: AppTheme.textPrimary)),
            const SizedBox(height: 12),
            _VehicleSelector(
              selected: _vehicleType,
              onChanged: (v) => setState(() => _vehicleType = v),
            ),
            const SizedBox(height: 20),

            // Conditional plate field
            if (_needsPlate) ...[
              TextFormField(
                controller: _plateCtrl,
                textCapitalization: TextCapitalization.characters,
                decoration: const InputDecoration(
                  labelText: 'Number Plate',
                  prefixIcon: Icon(Icons.confirmation_number_outlined),
                  hintText: 'e.g. UBE 123A',
                ),
              ),
              const SizedBox(height: 16),
            ],

            // Operating area
            TextFormField(
              controller: _areaCtrl,
              textCapitalization: TextCapitalization.words,
              decoration: const InputDecoration(
                labelText: 'Primary Operating Area',
                prefixIcon: Icon(Icons.location_on_outlined),
                hintText: 'e.g. Kampala Central',
              ),
            ),
          ],
        ),
      ),
    );
  }

  // --- Step 3: Security ---
  Widget _buildSecurityStep() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Form(
        key: _securityFormKey,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: AppTheme.primary.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: const Icon(Icons.shield_rounded, size: 40, color: AppTheme.primary),
              ),
            ),
            const SizedBox(height: 20),
            const Center(
              child: Text('Secure Your Account',
                  style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: AppTheme.textPrimary)),
            ),
            const SizedBox(height: 6),
            const Center(
              child: Text('Create a strong password',
                  style: TextStyle(color: AppTheme.textSecondary)),
            ),
            const SizedBox(height: 28),

            TextFormField(
              controller: _passwordCtrl,
              obscureText: _obscure,
              decoration: InputDecoration(
                labelText: 'Password',
                prefixIcon: const Icon(Icons.lock_outlined),
                suffixIcon: IconButton(
                  icon: Icon(_obscure ? Icons.visibility_off_outlined : Icons.visibility_outlined),
                  onPressed: () => setState(() => _obscure = !_obscure),
                ),
              ),
              validator: (v) => (v?.length ?? 0) < 6 ? 'Min 6 characters' : null,
            ),
            const SizedBox(height: 16),

            TextFormField(
              controller: _confirmPwCtrl,
              obscureText: _obscureConfirm,
              decoration: InputDecoration(
                labelText: 'Confirm Password',
                prefixIcon: const Icon(Icons.lock_outlined),
                suffixIcon: IconButton(
                  icon: Icon(_obscureConfirm ? Icons.visibility_off_outlined : Icons.visibility_outlined),
                  onPressed: () => setState(() => _obscureConfirm = !_obscureConfirm),
                ),
              ),
              validator: (v) {
                if ((v?.length ?? 0) < 6) return 'Min 6 characters';
                if (v != _passwordCtrl.text) return 'Passwords do not match';
                return null;
              },
            ),
            const SizedBox(height: 24),

            // Summary card
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Application Summary',
                      style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
                  const SizedBox(height: 12),
                  _summaryRow('Name', '${_firstNameCtrl.text} ${_lastNameCtrl.text}'),
                  _summaryRow('Phone', _fullPhone),
                  if (_emailCtrl.text.isNotEmpty) _summaryRow('Email', _emailCtrl.text),
                  _summaryRow('Vehicle', _vehicleLabel(_vehicleType)),
                  if (_plateCtrl.text.isNotEmpty) _summaryRow('Plate', _plateCtrl.text),
                  if (_areaCtrl.text.isNotEmpty) _summaryRow('Area', _areaCtrl.text),
                ],
              ),
            ),
            const SizedBox(height: 16),

            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Text('Already have an account? ',
                    style: TextStyle(color: AppTheme.textSecondary)),
                GestureDetector(
                  onTap: () => context.go('/login'),
                  child: const Text('Sign In',
                      style: TextStyle(color: AppTheme.primary, fontWeight: FontWeight.bold)),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  String _vehicleLabel(String type) {
    switch (type) {
      case 'MOTORCYCLE': return 'Bodaboda (Motorcycle)';
      case 'BICYCLE': return 'Bicycle';
      case 'CAR': return 'Car';
      case 'WALKING': return 'Walking Courier';
      default: return type;
    }
  }

  Widget _summaryRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        children: [
          SizedBox(width: 80, child: Text(label,
              style: const TextStyle(color: AppTheme.textSecondary, fontSize: 13))),
          Expanded(child: Text(value,
              style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13))),
        ],
      ),
    );
  }
}

/// Vehicle type selector with visual cards
class _VehicleSelector extends StatelessWidget {
  final String selected;
  final ValueChanged<String> onChanged;
  const _VehicleSelector({required this.selected, required this.onChanged});

  @override
  Widget build(BuildContext context) {
    final options = [
      _VehicleOption('MOTORCYCLE', 'Bodaboda', Icons.two_wheeler_rounded),
      _VehicleOption('BICYCLE', 'Bicycle', Icons.pedal_bike_rounded),
      _VehicleOption('CAR', 'Car', Icons.directions_car_rounded),
      _VehicleOption('WALKING', 'Walking', Icons.directions_walk_rounded),
    ];

    return GridView.count(
      crossAxisCount: 2,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      crossAxisSpacing: 12,
      mainAxisSpacing: 12,
      childAspectRatio: 2.2,
      children: options.map((opt) {
        final isSelected = selected == opt.value;
        return GestureDetector(
          onTap: () => onChanged(opt.value),
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 200),
            decoration: BoxDecoration(
              color: isSelected ? AppTheme.primary.withOpacity(0.1) : Colors.white,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: isSelected ? AppTheme.primary : const Color(0xFFE2E8F0),
                width: isSelected ? 2 : 1,
              ),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(opt.icon, color: isSelected ? AppTheme.primary : AppTheme.textSecondary, size: 22),
                const SizedBox(width: 8),
                Text(opt.label,
                    style: TextStyle(
                      fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                      color: isSelected ? AppTheme.primary : AppTheme.textPrimary,
                      fontSize: 13,
                    )),
              ],
            ),
          ),
        );
      }).toList(),
    );
  }
}

class _VehicleOption {
  final String value;
  final String label;
  final IconData icon;
  _VehicleOption(this.value, this.label, this.icon);
}
