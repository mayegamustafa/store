import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/theme.dart';
import '../../shared/widgets/product_card.dart';
import '../../shared/widgets/common.dart';
import '../auth/auth_provider.dart';
import '../cart/cart_provider.dart';
import 'products_provider.dart';

class ProductListScreen extends StatefulWidget {
  const ProductListScreen({super.key});

  @override
  State<ProductListScreen> createState() => _ProductListScreenState();
}

class _ProductListScreenState extends State<ProductListScreen> {
  final ScrollController _scrollController = ScrollController();
  late ProductsProvider _provider;
  String? _categoryId;
  String _title = 'Products';

  @override
  void initState() {
    super.initState();
    _scrollController.addListener(_onScroll);
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final args = ModalRoute.of(context)?.settings.arguments as Map<String, dynamic>?;
    if (args != null) {
      _categoryId = args['categoryId'];
      _title = args['title'] ?? 'Products';
    }
    _provider = context.read<ProductsProvider>();
    _provider.fetchProducts(refresh: true, categoryId: _categoryId);
  }

  void _onScroll() {
    if (_scrollController.position.pixels >=
        _scrollController.position.maxScrollExtent - 300) {
      _provider.loadMore();
    }
  }

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.backgroundColor,
      appBar: AppBar(title: Text(_title)),
      body: Consumer<ProductsProvider>(
        builder: (context, provider, child) {
          if (provider.isLoading && provider.products.isEmpty) {
            return GridView.builder(
              padding: const EdgeInsets.all(16),
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 2,
                childAspectRatio: 0.62,
                crossAxisSpacing: 12,
                mainAxisSpacing: 12,
              ),
              itemCount: 6,
              itemBuilder: (_, __) => const ProductCardSkeleton(),
            );
          }

          if (provider.products.isEmpty) {
            return EmptyState(
              icon: Icons.shopping_bag_outlined,
              title: 'No products found',
              subtitle: 'Try a different category or check back later',
            );
          }

          return RefreshIndicator(
            onRefresh: () => provider.fetchProducts(refresh: true, categoryId: _categoryId),
            child: GridView.builder(
              controller: _scrollController,
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.all(16),
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 2,
                childAspectRatio: 0.62,
                crossAxisSpacing: 12,
                mainAxisSpacing: 12,
              ),
              itemCount: provider.products.length + (provider.isLoadingMore ? 2 : 0),
              itemBuilder: (context, index) {
                if (index >= provider.products.length) {
                  return const ProductCardSkeleton();
                }
                final product = provider.products[index];
                return ProductCard(
                  product: product,
                  onTap: () => Navigator.of(context)
                      .pushNamed('/product', arguments: product.slug),
                  onAddToCart: () => _addToCart(product.id),
                );
              },
            ),
          );
        },
      ),
    );
  }

  void _addToCart(String productId) async {
    final auth = context.read<AuthProvider>();
    if (!auth.isAuthenticated) {
      Navigator.of(context).pushNamed('/login');
      return;
    }
    final cart = context.read<CartProvider>();
    final success = await cart.addToCart(productId);
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(success ? 'Added to cart' : 'Failed to add'),
        duration: const Duration(seconds: 1),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
      ),
    );
  }
}
