import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/theme.dart';
import '../../core/utils/helpers.dart';
import '../../shared/widgets/product_card.dart';
import 'wishlist_provider.dart';

class WishlistScreen extends StatefulWidget {
  const WishlistScreen({super.key});

  @override
  State<WishlistScreen> createState() => _WishlistScreenState();
}

class _WishlistScreenState extends State<WishlistScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<WishlistProvider>().fetch();
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.backgroundColor,
      appBar: AppBar(title: const Text('Wishlist')),
      body: Consumer<WishlistProvider>(
        builder: (context, provider, _) {
          if (provider.isLoading && provider.items.isEmpty) {
            return const Center(child: CircularProgressIndicator());
          }

          if (provider.items.isEmpty) {
            return Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.favorite_outline_rounded, size: 64, color: AppTheme.textTertiary.withValues(alpha: 0.5)),
                  const SizedBox(height: 16),
                  Text('Your wishlist is empty', style: TextStyle(fontSize: 16, color: AppTheme.textSecondary)),
                  const SizedBox(height: 8),
                  Text('Save items you love for later', style: TextStyle(fontSize: 14, color: AppTheme.textTertiary)),
                ],
              ),
            );
          }

          return RefreshIndicator(
            onRefresh: () => provider.fetch(),
            child: GridView.builder(
              padding: const EdgeInsets.all(16),
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 2,
                childAspectRatio: 0.65,
                crossAxisSpacing: 12,
                mainAxisSpacing: 12,
              ),
              itemCount: provider.items.length,
              itemBuilder: (context, index) {
                final product = provider.items[index];
                return ProductCard(product: product);
              },
            ),
          );
        },
      ),
    );
  }
}
