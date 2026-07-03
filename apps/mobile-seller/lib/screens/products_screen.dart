import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../core/theme.dart';
import '../providers/products_provider.dart';
import '../core/money.dart';

class ProductsScreen extends StatefulWidget {
  const ProductsScreen({super.key});
  @override
  State<ProductsScreen> createState() => _ProductsScreenState();
}

class _ProductsScreenState extends State<ProductsScreen> {
  bool _gridView = true;

  @override
  void initState() {
    super.initState();
    context.read<ProductsProvider>().load(refresh: true);
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<ProductsProvider>();
    final products = provider.products;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Products'),
        actions: [
          IconButton(
            icon: Icon(_gridView ? Icons.view_list_rounded : Icons.grid_view_rounded),
            onPressed: () => setState(() => _gridView = !_gridView),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () => provider.load(refresh: true),
        child: provider.loading && products.isEmpty
            ? const Center(child: CircularProgressIndicator())
            : products.isEmpty
                ? Center(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.inventory_2_outlined,
                            size: 64, color: Colors.grey.shade300),
                        const SizedBox(height: 16),
                        const Text('No products yet',
                            style: TextStyle(color: AppTheme.textSecondary)),
                        const SizedBox(height: 12),
                        FilledButton.icon(
                          onPressed: () => context.push('/products/new'),
                          icon: const Icon(Icons.add),
                          label: const Text('Add Product'),
                        ),
                      ],
                    ),
                  )
                : _gridView
                    ? _buildGrid(products)
                    : _buildList(products),
      ),
      floatingActionButton: products.isNotEmpty
          ? FloatingActionButton.extended(
              onPressed: () => context.push('/products/new'),
              icon: const Icon(Icons.add),
              label: const Text('Add'),
              backgroundColor: AppTheme.primary,
              foregroundColor: Colors.white,
            )
          : null,
    );
  }

  Widget _buildGrid(List<dynamic> products) {
    return GridView.builder(
      padding: const EdgeInsets.all(16),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        mainAxisSpacing: 12,
        crossAxisSpacing: 12,
        childAspectRatio: 0.72,
      ),
      itemCount: products.length,
      itemBuilder: (_, i) => _ProductGridCard(product: products[i]),
    );
  }

  Widget _buildList(List<dynamic> products) {
    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: products.length,
      itemBuilder: (_, i) => _ProductListTile(product: products[i]),
    );
  }
}

class _ProductGridCard extends StatelessWidget {
  final dynamic product;
  const _ProductGridCard({required this.product});

  @override
  Widget build(BuildContext context) {
    final name = product['name'] ?? '';
    final price = product['price'] ?? 0;
    final stock = product['stock'] ?? 0;
    final images = product['images'] as List? ?? [];
    final imageUrl = images.isNotEmpty ? images[0] as String? : null;
    final active = product['active'] != false;

    return GestureDetector(
      onTap: () => context.push('/products/${product['id']}/edit'),
      child: Card(
        clipBehavior: Clip.antiAlias,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              flex: 3,
              child: Stack(
                fit: StackFit.expand,
                children: [
                  imageUrl != null
                      ? CachedNetworkImage(
                          imageUrl: imageUrl,
                          fit: BoxFit.cover,
                          placeholder: (_, __) => Container(
                              color: Colors.grey.shade100,
                              child: const Icon(Icons.image_outlined,
                                  color: Colors.grey)),
                          errorWidget: (_, __, ___) => Container(
                              color: Colors.grey.shade100,
                              child: const Icon(Icons.broken_image_outlined,
                                  color: Colors.grey)),
                        )
                      : Container(
                          color: Colors.grey.shade100,
                          child: const Icon(Icons.inventory_2_outlined,
                              size: 40, color: Colors.grey)),
                  Positioned(
                    top: 8,
                    right: 8,
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: stock > 0
                            ? AppTheme.success.withValues(alpha: 0.9)
                            : AppTheme.error.withValues(alpha: 0.9),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        stock > 0 ? '$stock in stock' : 'Out of stock',
                        style: const TextStyle(
                            color: Colors.white,
                            fontSize: 10,
                            fontWeight: FontWeight.w600),
                      ),
                    ),
                  ),
                  if (!active)
                    Positioned(
                      top: 8,
                      left: 8,
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(
                          color: Colors.grey.shade700.withValues(alpha: 0.9),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: const Text('Draft',
                            style: TextStyle(
                                color: Colors.white,
                                fontSize: 10,
                                fontWeight: FontWeight.w600)),
                      ),
                    ),
                ],
              ),
            ),
            Expanded(
              flex: 2,
              child: Padding(
                padding: const EdgeInsets.all(10),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(name,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                            fontWeight: FontWeight.w600, fontSize: 13)),
                    const Spacer(),
                    Text(Money.fmt(price),
                        style: const TextStyle(
                            color: AppTheme.primary,
                            fontWeight: FontWeight.bold,
                            fontSize: 15)),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ProductListTile extends StatelessWidget {
  final dynamic product;
  const _ProductListTile({required this.product});

  @override
  Widget build(BuildContext context) {
    final name = product['name'] ?? '';
    final price = product['price'] ?? 0;
    final stock = product['stock'] ?? 0;
    final images = product['images'] as List? ?? [];
    final imageUrl = images.isNotEmpty ? images[0] as String? : null;

    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        onTap: () => context.push('/products/${product['id']}/edit'),
        contentPadding:
            const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
        leading: ClipRRect(
          borderRadius: BorderRadius.circular(10),
          child: SizedBox(
            width: 56,
            height: 56,
            child: imageUrl != null
                ? CachedNetworkImage(
                    imageUrl: imageUrl,
                    fit: BoxFit.cover,
                    placeholder: (_, __) => Container(color: Colors.grey.shade100),
                    errorWidget: (_, __, ___) => Container(color: Colors.grey.shade100),
                  )
                : Container(
                    color: Colors.grey.shade100,
                    child: const Icon(Icons.inventory_2_outlined,
                        color: Colors.grey)),
          ),
        ),
        title:
            Text(name, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
        subtitle: Text('${Money.fmt(price)} · Stock: $stock',
            style:
                const TextStyle(fontSize: 12, color: AppTheme.textSecondary)),
        trailing:
            const Icon(Icons.chevron_right_rounded, color: AppTheme.textSecondary),
      ),
    );
  }
}
