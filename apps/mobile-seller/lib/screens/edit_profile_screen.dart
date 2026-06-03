import 'dart:io';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';
import 'package:dio/dio.dart';
import '../core/theme.dart';
import '../core/api_service.dart';
import '../providers/auth_provider.dart';

class EditProfileScreen extends StatefulWidget {
  const EditProfileScreen({super.key});

  @override
  State<EditProfileScreen> createState() => _EditProfileScreenState();
}

class _EditProfileScreenState extends State<EditProfileScreen> {
  final _api = ApiService();
  final _firstNameCtrl = TextEditingController();
  final _lastNameCtrl = TextEditingController();
  final _storeNameCtrl = TextEditingController();
  final _phoneCtrl = TextEditingController();
  final _emailCtrl = TextEditingController();
  String? _avatarUrl;
  String? _logoUrl;
  File? _pickedAvatar;
  File? _pickedLogo;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    final auth = context.read<AuthProvider>();
    final user = auth.user;
    _firstNameCtrl.text = user?['firstName'] ?? '';
    _lastNameCtrl.text = user?['lastName'] ?? '';
    _phoneCtrl.text = user?['phone'] ?? '';
    _emailCtrl.text = user?['email'] ?? '';
    _avatarUrl = user?['avatar'];
    _storeNameCtrl.text = auth.storeName;
    _logoUrl = user?['sellerProfile']?['logo'];
  }

  @override
  void dispose() {
    _firstNameCtrl.dispose();
    _lastNameCtrl.dispose();
    _storeNameCtrl.dispose();
    _phoneCtrl.dispose();
    _emailCtrl.dispose();
    super.dispose();
  }

  Future<void> _pickAvatar() async {
    final picker = ImagePicker();
    final picked = await picker.pickImage(source: ImageSource.gallery, maxWidth: 512, imageQuality: 80);
    if (picked != null) setState(() => _pickedAvatar = File(picked.path));
  }

  Future<void> _pickLogo() async {
    final picker = ImagePicker();
    final picked = await picker.pickImage(source: ImageSource.gallery, maxWidth: 512, imageQuality: 80);
    if (picked != null) setState(() => _pickedLogo = File(picked.path));
  }

  Future<String?> _uploadImage(File file) async {
    try {
      final formData = FormData.fromMap({
        'file': await MultipartFile.fromFile(file.path, filename: 'image.jpg'),
      });
      final res = await _api.dio.post('/upload/single', data: formData,
          options: Options(contentType: 'multipart/form-data'));
      return res.data['url'] as String?;
    } catch (_) {
      return null;
    }
  }

  Future<void> _save() async {
    setState(() => _saving = true);
    try {
      // Upload avatar if changed
      String? avatarUrl = _avatarUrl;
      if (_pickedAvatar != null) {
        avatarUrl = await _uploadImage(_pickedAvatar!);
        if (avatarUrl == null) {
          _showError('Failed to upload profile picture');
          setState(() => _saving = false);
          return;
        }
      }

      // Upload store logo if changed
      String? logoUrl = _logoUrl;
      if (_pickedLogo != null) {
        logoUrl = await _uploadImage(_pickedLogo!);
        if (logoUrl == null) {
          _showError('Failed to upload store logo');
          setState(() => _saving = false);
          return;
        }
      }

      // Update user profile (name, avatar)
      await _api.dio.patch('/users/me', data: {
        'firstName': _firstNameCtrl.text.trim(),
        'lastName': _lastNameCtrl.text.trim(),
        if (avatarUrl != null) 'avatar': avatarUrl,
      });

      // Update seller profile (store name, logo)
      await _api.dio.patch('/sellers/me', data: {
        'storeName': _storeNameCtrl.text.trim(),
        if (logoUrl != null) 'logo': logoUrl,
      });

      if (mounted) {
        await context.read<AuthProvider>().refreshProfile();
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Profile updated'), backgroundColor: AppTheme.primary),
        );
        Navigator.of(context).pop();
      }
    } catch (e) {
      _showError('Error: $e');
    }
    if (mounted) setState(() => _saving = false);
  }

  void _showError(String msg) {
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(msg), backgroundColor: AppTheme.error),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Edit Profile'),
        actions: [
          TextButton(
            onPressed: _saving ? null : _save,
            child: _saving
                ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2))
                : const Text('Save', style: TextStyle(fontWeight: FontWeight.bold)),
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Profile Picture
            Center(
              child: GestureDetector(
                onTap: _pickAvatar,
                child: Stack(
                  children: [
                    CircleAvatar(
                      radius: 50,
                      backgroundColor: AppTheme.primary.withValues(alpha: 0.1),
                      backgroundImage: _pickedAvatar != null
                          ? FileImage(_pickedAvatar!)
                          : (_avatarUrl != null ? NetworkImage(_avatarUrl!) : null) as ImageProvider?,
                      child: _pickedAvatar == null && _avatarUrl == null
                          ? const Icon(Icons.person_rounded, size: 50, color: AppTheme.primary)
                          : null,
                    ),
                    Positioned(
                      bottom: 0, right: 0,
                      child: Container(
                        padding: const EdgeInsets.all(6),
                        decoration: const BoxDecoration(color: AppTheme.primary, shape: BoxShape.circle),
                        child: const Icon(Icons.camera_alt_rounded, size: 18, color: Colors.white),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 8),
            const Center(child: Text('Tap to change photo', style: TextStyle(color: AppTheme.textSecondary, fontSize: 12))),
            const SizedBox(height: 28),

            // Store Logo
            const Text('Store Logo', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
            const SizedBox(height: 8),
            GestureDetector(
              onTap: _pickLogo,
              child: Container(
                width: 80, height: 80,
                decoration: BoxDecoration(
                  color: Colors.grey.shade100,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.grey.shade300),
                  image: _pickedLogo != null
                      ? DecorationImage(image: FileImage(_pickedLogo!), fit: BoxFit.cover)
                      : (_logoUrl != null
                          ? DecorationImage(image: NetworkImage(_logoUrl!), fit: BoxFit.cover)
                          : null),
                ),
                child: _pickedLogo == null && _logoUrl == null
                    ? const Icon(Icons.add_photo_alternate_outlined, color: Colors.grey)
                    : null,
              ),
            ),
            const SizedBox(height: 24),

            // Fields
            _buildField('First Name', _firstNameCtrl, Icons.person_outline_rounded),
            const SizedBox(height: 16),
            _buildField('Last Name', _lastNameCtrl, Icons.person_outline_rounded),
            const SizedBox(height: 16),
            _buildField('Store Name', _storeNameCtrl, Icons.storefront_rounded),
            const SizedBox(height: 16),
            _buildField('Phone', _phoneCtrl, Icons.phone_rounded, enabled: false),
            const SizedBox(height: 16),
            _buildField('Email', _emailCtrl, Icons.email_outlined, enabled: false),
          ],
        ),
      ),
    );
  }

  Widget _buildField(String label, TextEditingController ctrl, IconData icon, {bool enabled = true}) {
    return TextField(
      controller: ctrl,
      enabled: enabled,
      decoration: InputDecoration(
        labelText: label,
        prefixIcon: Icon(icon),
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
        filled: !enabled,
        fillColor: enabled ? null : Colors.grey.shade100,
      ),
    );
  }
}
