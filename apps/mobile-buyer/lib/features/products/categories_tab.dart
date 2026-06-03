import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../../core/theme.dart';
import '../../core/utils/helpers.dart';
import '../../core/models/models.dart';
import 'products_provider.dart';

class CategoriesTab extends StatelessWidget {
  const CategoriesTab({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.backgroundColor,
      appBar: AppBar(title: const Text('Categories')),
      body: Consumer<ProductsProvider>(
        builder: (context, provider, child) {
          if (provider.categories.isEmpty && provider.isLoading) {
            return const Center(child: CircularProgressIndicator());
          }

          if (provider.categories.isEmpty) {
            return const Center(
              child: Text('No categories available'),
            );
          }

          return RefreshIndicator(
            onRefresh: () => provider.fetchHomeData(),
            child: ListView.separated(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.all(16),
              itemCount: provider.categories.length,
              separatorBuilder: (_, __) => const SizedBox(height: 12),
              itemBuilder: (context, index) {
                final cat = provider.categories[index];
                return _CategoryTile(
                  category: cat,
                  onTap: () => Navigator.of(context).pushNamed(
                    '/products',
                    arguments: {'categoryId': cat.id, 'title': cat.name},
                  ),
                );
              },
            ),
          );
        },
      ),
    );
  }
}

class _CategoryTile extends StatelessWidget {
  final Category category;
  final VoidCallback onTap;

  const _CategoryTile({required this.category, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        height: 80,
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          boxShadow: [AppTheme.cardShadow],
        ),
        child: Row(
          children: [
            Container(
              width: 56,
              height: 56,
              decoration: BoxDecoration(
                color: AppTheme.primaryColor.withValues(alpha: 0.08),
                borderRadius: BorderRadius.circular(14),
              ),
              clipBehavior: Clip.antiAlias,
              child: category.image != null && category.image!.isNotEmpty
                  ? CachedNetworkImage(
                      imageUrl: resolveImageUrl(category.image),
                      fit: BoxFit.cover,
                      errorWidget: (_, __, ___) => Icon(
                        Icons.category_rounded,
                        color: AppTheme.primaryColor,
                      ),
                    )
                  : Icon(
                      Icons.category_rounded,
                      color: AppTheme.primaryColor,
                      size: 28,
                    ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    category.name,
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                      color: AppTheme.textPrimary,
                    ),
                  ),
                  if (category.productCount != null)
                    Text(
                      '${category.productCount} products',
                      style: const TextStyle(
                        fontSize: 13,
                        color: AppTheme.textSecondary,
                      ),
                    ),
                ],
              ),
            ),
            Icon(Icons.chevron_right_rounded, color: AppTheme.textTertiary),
          ],
        ),
      ),
    );
  }
}
