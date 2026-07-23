import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';
import 'package:dio/dio.dart';
import '../core/theme.dart';
import '../core/api_service.dart';
import '../providers/products_provider.dart';
import '../core/money.dart';

class ProductFormScreen extends StatefulWidget {
  final String? productId;
  const ProductFormScreen({super.key, this.productId});
  @override
  State<ProductFormScreen> createState() => _ProductFormScreenState();
}

class _ProductFormScreenState extends State<ProductFormScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameCtrl = TextEditingController();
  final _descCtrl = TextEditingController();
  final _brandCtrl = TextEditingController();
  final _priceCtrl = TextEditingController();
  final _stockCtrl = TextEditingController();
  String? _categoryId;
  String _condition = 'NEW';
  static const _conditions = ['NEW', 'USED', 'REFURBISHED'];
  List<Map<String, dynamic>> _categories = [];
  List<String> _imageUrls = [];
  bool _loading = false;
  bool _fetching = false;
  bool _aiLoading = false;

  bool get isEdit => widget.productId != null;

  @override
  void initState() {
    super.initState();
    _loadCategories();
    if (isEdit) _fetchProduct();
  }

  Future<void> _loadCategories() async {
    try {
      final res = await ApiService().dio.get('/categories');
      final data = ApiService().extractData(res);
      if (data is List && mounted) {
        setState(() => _categories =
            data.map((c) => Map<String, dynamic>.from(c as Map)).toList());
      }
    } catch (_) {}
  }

  Future<void> _fetchProduct() async {
    setState(() => _fetching = true);
    try {
      // First try to find from already-loaded products
      final provider = context.read<ProductsProvider>();
      dynamic data;
      try {
        final existing = provider.products.firstWhere(
          (p) => p['id'] == widget.productId,
        );
        data = existing;
      } catch (_) {
        // Not in local cache — fetch from API
        final res = await ApiService()
            .dio
            .get('/products/mine', queryParameters: {'limit': 1, 'search': widget.productId});
        final result = ApiService().extractData(res);
        final list = result is List ? result : (result['data'] as List?) ?? [];
        data = list.isNotEmpty ? list.first : null;
      }
      if (data != null && mounted) {
        _nameCtrl.text = data['name'] ?? '';
        _descCtrl.text = data['description'] ?? '';
        _brandCtrl.text = data['brand'] ?? '';
        _condition = _conditions.contains(data['condition']) ? data['condition'] : 'NEW';
        _priceCtrl.text = (data['basePrice'] ?? data['price'] ?? '').toString();
        _stockCtrl.text = (data['stock'] ?? '').toString();
        _categoryId = data['categoryId'] ?? data['category']?['id'];
        _imageUrls = List<String>.from(data['images'] ?? []);
      }
    } catch (_) {}
    if (mounted) setState(() => _fetching = false);
  }

  Future<void> _pickImage() async {
    final picker = ImagePicker();
    final file = await picker.pickImage(source: ImageSource.gallery, maxWidth: 1200);
    if (file == null) return;
    setState(() => _loading = true);
    try {
      final formData = FormData.fromMap({
        'file': await MultipartFile.fromFile(file.path, filename: file.name),
      });
      final res = await ApiService().dio.post('/upload/single', data: formData);
      final data = ApiService().extractData(res);
      final url = data['url'] as String? ?? data['path'] as String?;
      if (url != null) {
        setState(() => _imageUrls.add(url));
      }
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Failed to upload image')));
      }
    }
    if (mounted) setState(() => _loading = false);
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _loading = true);
    if (_categoryId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Please choose a category')));
      setState(() => _loading = false);
      return;
    }
    // Server contract: basePrice (number) + categoryId (uuid) — the old
    // 'price'/'category' keys made every create fail.
    final data = {
      'name': _nameCtrl.text.trim(),
      'description': _descCtrl.text.trim(),
      'brand': _brandCtrl.text.trim(),
      'condition': _condition,
      'basePrice': double.tryParse(_priceCtrl.text) ?? 0,
      'stock': int.tryParse(_stockCtrl.text) ?? 0,
      'categoryId': _categoryId,
      'images': _imageUrls,
    };
    final provider = context.read<ProductsProvider>();
    final err = isEdit
        ? await provider.updateProduct(widget.productId!, data)
        : await provider.createProduct(data);
    if (!mounted) return;
    setState(() => _loading = false);
    if (err == null) {
      context.pop();
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(err), duration: const Duration(seconds: 5)));
    }
  }

  /// Ask the backend (OpenAI-backed, with template fallback) to write the
  /// description so sellers don't have to. Uses name + brand + category +
  /// condition for accuracy.
  Future<void> _generateDescription() async {
    final name = _nameCtrl.text.trim();
    if (name.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Enter a product name first')));
      return;
    }
    setState(() => _aiLoading = true);
    try {
      final category = _categories.firstWhere(
        (c) => c['id'] == _categoryId,
        orElse: () => const {},
      )['name'];
      final res = await ApiService().dio.post('/products/ai-description', data: {
        'name': name,
        if (_brandCtrl.text.trim().isNotEmpty) 'brand': _brandCtrl.text.trim(),
        if (category != null) 'category': category,
        'condition': _condition,
      });
      final data = ApiService().extractData(res);
      final desc = (data is Map ? data['description'] : null) as String?;
      if (desc == null || desc.isEmpty) throw Exception('empty');
      setState(() => _descCtrl.text = desc);
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Could not generate description')));
      }
    }
    if (mounted) setState(() => _aiLoading = false);
  }

  @override
  void dispose() {
    _nameCtrl.dispose();
    _descCtrl.dispose();
    _brandCtrl.dispose();
    _priceCtrl.dispose();
    _stockCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(isEdit ? 'Edit Product' : 'New Product'),
        actions: [
          TextButton(
            onPressed: _loading ? null : _save,
            child: _loading
                ? const SizedBox(
                    width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2))
                : const Text('Save', style: TextStyle(fontWeight: FontWeight.w600)),
          ),
        ],
      ),
      body: _fetching
          ? const Center(child: CircularProgressIndicator())
          : Form(
              key: _formKey,
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  // Images
                  const Text('Images',
                      style: TextStyle(
                          fontWeight: FontWeight.w600, fontSize: 14)),
                  const SizedBox(height: 8),
                  SizedBox(
                    height: 100,
                    child: ListView(
                      scrollDirection: Axis.horizontal,
                      children: [
                        ..._imageUrls.map((url) => _ImageThumb(
                              url: url,
                              onRemove: () => setState(
                                  () => _imageUrls.remove(url)),
                            )),
                        GestureDetector(
                          onTap: _pickImage,
                          child: Container(
                            width: 100,
                            height: 100,
                            margin: const EdgeInsets.only(right: 8),
                            decoration: BoxDecoration(
                              border: Border.all(
                                  color: AppTheme.border, width: 2),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: const Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(Icons.add_photo_alternate_outlined,
                                    color: AppTheme.textSecondary),
                                SizedBox(height: 4),
                                Text('Add',
                                    style: TextStyle(
                                        fontSize: 12,
                                        color: AppTheme.textSecondary)),
                              ],
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 20),
                  TextFormField(
                    controller: _nameCtrl,
                    decoration: const InputDecoration(labelText: 'Product Name'),
                    validator: (v) =>
                        (v == null || v.trim().isEmpty) ? 'Required' : null,
                  ),
                  const SizedBox(height: 16),
                  Row(
                    children: [
                      const Text('Description',
                          style: TextStyle(fontSize: 13, color: AppTheme.textSecondary)),
                      const Spacer(),
                      TextButton.icon(
                        onPressed: _aiLoading ? null : _generateDescription,
                        icon: _aiLoading
                            ? const SizedBox(
                                width: 14,
                                height: 14,
                                child: CircularProgressIndicator(strokeWidth: 2))
                            : const Icon(Icons.auto_awesome, size: 16),
                        label: Text(_aiLoading ? 'Writing…' : 'AI Auto-fill'),
                        style: TextButton.styleFrom(
                            foregroundColor: AppTheme.primary,
                            padding: const EdgeInsets.symmetric(horizontal: 8)),
                      ),
                    ],
                  ),
                  TextFormField(
                    controller: _descCtrl,
                    decoration: const InputDecoration(
                        hintText: 'Describe the product, or tap AI Auto-fill'),
                    maxLines: 3,
                  ),
                  const SizedBox(height: 16),
                  Row(
                    children: [
                      Expanded(
                        child: TextFormField(
                          controller: _brandCtrl,
                          decoration:
                              const InputDecoration(labelText: 'Brand (optional)'),
                        ),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: DropdownButtonFormField<String>(
                          value: _condition,
                          decoration:
                              const InputDecoration(labelText: 'Condition'),
                          items: _conditions
                              .map((c) => DropdownMenuItem<String>(
                                    value: c,
                                    child: Text(c[0] + c.substring(1).toLowerCase()),
                                  ))
                              .toList(),
                          onChanged: (v) =>
                              setState(() => _condition = v ?? 'NEW'),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  Row(
                    children: [
                      Expanded(
                        child: TextFormField(
                          controller: _priceCtrl,
                          decoration:
                              InputDecoration(labelText: 'Price (${Money.code})'),
                          keyboardType: TextInputType.number,
                          validator: (v) =>
                              (v == null || double.tryParse(v) == null)
                                  ? 'Invalid'
                                  : null,
                        ),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: TextFormField(
                          controller: _stockCtrl,
                          decoration:
                              const InputDecoration(labelText: 'Stock'),
                          keyboardType: TextInputType.number,
                          validator: (v) =>
                              (v == null || int.tryParse(v) == null)
                                  ? 'Invalid'
                                  : null,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  DropdownButtonFormField<String>(
                    value: _categories.any((c) => c['id'] == _categoryId)
                        ? _categoryId
                        : null,
                    decoration:
                        const InputDecoration(labelText: 'Category'),
                    items: _categories
                        .map((c) => DropdownMenuItem<String>(
                              value: c['id'] as String,
                              child: Text(c['name']?.toString() ?? ''),
                            ))
                        .toList(),
                    onChanged: (v) => setState(() => _categoryId = v),
                    validator: (v) => v == null ? 'Choose a category' : null,
                  ),
                  const SizedBox(height: 32),
                  SizedBox(
                    height: 52,
                    child: ElevatedButton(
                      onPressed: _loading ? null : _save,
                      child: Text(isEdit ? 'Update Product' : 'Create Product'),
                    ),
                  ),
                ],
              ),
            ),
    );
  }
}

class _ImageThumb extends StatelessWidget {
  final String url;
  final VoidCallback onRemove;
  const _ImageThumb({required this.url, required this.onRemove});

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        Container(
          width: 100,
          height: 100,
          margin: const EdgeInsets.only(right: 8),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(12),
            image: DecorationImage(
              image: NetworkImage(url),
              fit: BoxFit.cover,
            ),
          ),
        ),
        Positioned(
          top: 4,
          right: 12,
          child: GestureDetector(
            onTap: onRemove,
            child: Container(
              padding: const EdgeInsets.all(4),
              decoration: const BoxDecoration(
                color: Colors.black54,
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.close, color: Colors.white, size: 14),
            ),
          ),
        ),
      ],
    );
  }
}
