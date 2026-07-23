import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:smooth_page_indicator/smooth_page_indicator.dart';
import 'package:flutter_rating_bar/flutter_rating_bar.dart';
import '../../core/theme.dart';
import '../../core/utils/helpers.dart';
import '../../core/models/models.dart';
import '../../core/services/app_config.dart';
import '../../shared/widgets/common.dart';
import '../../shared/widgets/product_card.dart';
import '../auth/auth_provider.dart';
import '../cart/cart_provider.dart';
import '../wishlist/wishlist_provider.dart';
import 'products_provider.dart';

class ProductDetailScreen extends StatefulWidget {
  const ProductDetailScreen({super.key});

  @override
  State<ProductDetailScreen> createState() => _ProductDetailScreenState();
}

class _ProductDetailScreenState extends State<ProductDetailScreen> {
  final PageController _imagePageController = PageController();
  Timer? _autoSlideTimer;
  int _currentImage = 0;
  Product? _product;
  List<Product> _related = [];
  List<Review> _reviews = [];
  bool _isLoading = true;
  int _quantity = 1;
  String? _selectedVariantId;

  /// Auto-advance the image gallery like a slideshow (buyer doesn't have to
  /// swipe manually). Loops; no-op for single-image products.
  void _startAutoSlide(int count) {
    _autoSlideTimer?.cancel();
    if (count < 2) return;
    _autoSlideTimer = Timer.periodic(const Duration(seconds: 4), (_) {
      if (!_imagePageController.hasClients) return;
      final next = (_currentImage + 1) % count;
      _imagePageController.animateToPage(
        next,
        duration: const Duration(milliseconds: 500),
        curve: Curves.easeInOut,
      );
    });
  }

  Future<void> _shareProduct(Product product) async {
    final url = '${AppConfig.instance.uploadBaseUrl}/products/${product.slug}';
    await Clipboard.setData(ClipboardData(text: url));
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Product link copied — paste it anywhere to share')),
    );
  }

  Future<void> _toggleWishlist(Product product) async {
    final auth = context.read<AuthProvider>();
    if (!auth.isAuthenticated) {
      Navigator.pushNamed(context, '/login');
      return;
    }
    await context.read<WishlistProvider>().toggle(product.id);
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final slug = ModalRoute.of(context)?.settings.arguments as String?;
    if (slug != null && _product == null) {
      _loadProduct(slug);
    }
  }

  Future<void> _loadProduct(String slug) async {
    final provider = context.read<ProductsProvider>();

    final results = await Future.wait([
      provider.fetchProductDetail(slug),
      provider.fetchRelated(slug),
    ]);

    if (!mounted) return;

    setState(() {
      _product = results[0] as Product?;
      _related = results[1] as List<Product>;
      _isLoading = false;
    });

    if (_product != null) {
      final imageCount = _product!.images.isNotEmpty
          ? _product!.images.length
          : (_product!.thumbnailUrl != null ? 1 : 0);
      _startAutoSlide(imageCount);
      // Load saved wishlist so the heart reflects the real state.
      if (context.read<AuthProvider>().isAuthenticated) {
        context.read<WishlistProvider>().fetch();
      }
      final reviews = await provider.fetchReviews(_product!.id);
      if (mounted) setState(() => _reviews = reviews);
    }
  }

  @override
  void dispose() {
    _autoSlideTimer?.cancel();
    _imagePageController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return Scaffold(
        appBar: AppBar(),
        body: const Center(child: CircularProgressIndicator()),
      );
    }

    if (_product == null) {
      return Scaffold(
        appBar: AppBar(),
        body: const EmptyState(
          icon: Icons.error_outline_rounded,
          title: 'Product not found',
        ),
      );
    }

    final product = _product!;

    return Scaffold(
      backgroundColor: Colors.white,
      body: RefreshIndicator(
        onRefresh: () => _loadProduct(product.slug),
        child: CustomScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
        slivers: [
          // Image slider
          SliverAppBar(
            expandedHeight: 360,
            pinned: true,
            backgroundColor: Colors.white,
            leading: _circleButton(
              Icons.arrow_back_rounded,
              () => Navigator.pop(context),
            ),
            actions: [
              _circleButton(Icons.share_outlined, () => _shareProduct(product)),
              const SizedBox(width: 8),
              _circleButton(
                context.watch<WishlistProvider>().isWishlisted(product.id)
                    ? Icons.favorite_rounded
                    : Icons.favorite_outline_rounded,
                () => _toggleWishlist(product),
                iconColor: context.watch<WishlistProvider>().isWishlisted(product.id)
                    ? Colors.redAccent
                    : null,
              ),
              const SizedBox(width: 12),
            ],
            flexibleSpace: FlexibleSpaceBar(
              background: _buildImageSlider(product),
            ),
          ),

          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Name
                  Text(
                    product.name,
                    style: const TextStyle(
                      fontSize: 22,
                      fontWeight: FontWeight.w700,
                      color: AppTheme.textPrimary,
                      height: 1.3,
                    ),
                  ),
                  const SizedBox(height: 8),

                  // Rating
                  if (product.reviewCount > 0)
                    Row(
                      children: [
                        RatingBarIndicator(
                          rating: product.rating,
                          itemSize: 18,
                          itemBuilder: (_, __) => const Icon(
                            Icons.star_rounded,
                            color: AppTheme.warningColor,
                          ),
                        ),
                        const SizedBox(width: 8),
                        Text(
                          '${product.rating.toStringAsFixed(1)} (${product.reviewCount} reviews)',
                          style: const TextStyle(
                            fontSize: 14,
                            color: AppTheme.textSecondary,
                          ),
                        ),
                      ],
                    ),
                  const SizedBox(height: 16),

                  // Price
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Text(
                        formatCurrency(product.effectivePrice),
                        style: TextStyle(
                          fontSize: 26,
                          fontWeight: FontWeight.w800,
                          color: AppTheme.primaryColor,
                        ),
                      ),
                      if (product.comparePrice != null &&
                          product.comparePrice! > product.basePrice) ...[
                        const SizedBox(width: 10),
                        Text(
                          formatCurrency(product.comparePrice!),
                          style: const TextStyle(
                            fontSize: 16,
                            color: AppTheme.textTertiary,
                            decoration: TextDecoration.lineThrough,
                          ),
                        ),
                        const SizedBox(width: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(
                            color: AppTheme.errorColor.withValues(alpha: 0.1),
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(
                            '-${product.discountPercentage!.round()}%',
                            style: const TextStyle(
                              color: AppTheme.errorColor,
                              fontWeight: FontWeight.w700,
                              fontSize: 13,
                            ),
                          ),
                        ),
                      ],
                    ],
                  ),
                  const SizedBox(height: 8),

                  // Stock status
                  Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                    decoration: BoxDecoration(
                      color: product.isInStock
                          ? AppTheme.successColor.withValues(alpha: 0.1)
                          : AppTheme.errorColor.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      product.isInStock
                          ? 'In Stock (${product.stock})'
                          : 'Out of Stock',
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                        color: product.isInStock
                            ? AppTheme.successColor
                            : AppTheme.errorColor,
                      ),
                    ),
                  ),

                  const SizedBox(height: 20),

                  // Seller info
                  if (product.sellerName != null) ...[
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: AppTheme.surfaceColor,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Row(
                        children: [
                          CircleAvatar(
                            radius: 20,
                            backgroundColor: AppTheme.primaryColor.withValues(alpha: 0.1),
                            child: Icon(Icons.store_rounded,
                                color: AppTheme.primaryColor, size: 20),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  product.sellerName!,
                                  style: const TextStyle(
                                    fontWeight: FontWeight.w600,
                                    fontSize: 14,
                                  ),
                                ),
                                const Text(
                                  'Verified Seller',
                                  style: TextStyle(
                                    fontSize: 12,
                                    color: AppTheme.textSecondary,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          Icon(Icons.chevron_right_rounded,
                              color: AppTheme.textTertiary),
                        ],
                      ),
                    ),
                    const SizedBox(height: 20),
                  ],

                  // Variants
                  if (product.variants.isNotEmpty) ...[
                    const Text(
                      'Variants',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 10),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: product.variants.map((v) {
                        final isSelected = _selectedVariantId == v.id;
                        return GestureDetector(
                          onTap: () =>
                              setState(() => _selectedVariantId = v.id),
                          child: Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 14, vertical: 8),
                            decoration: BoxDecoration(
                              color: isSelected
                                  ? AppTheme.primaryColor.withValues(alpha: 0.1)
                                  : Colors.white,
                              border: Border.all(
                                color: isSelected
                                    ? AppTheme.primaryColor
                                    : AppTheme.dividerColor,
                              ),
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: Text(
                              v.name,
                              style: TextStyle(
                                fontWeight: FontWeight.w500,
                                color: isSelected
                                    ? AppTheme.primaryColor
                                    : AppTheme.textPrimary,
                              ),
                            ),
                          ),
                        );
                      }).toList(),
                    ),
                    const SizedBox(height: 20),
                  ],

                  // Description
                  if (product.description != null &&
                      product.description!.isNotEmpty) ...[
                    const Text(
                      'Description',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      product.description!,
                      style: const TextStyle(
                        fontSize: 14,
                        color: AppTheme.textSecondary,
                        height: 1.6,
                      ),
                    ),
                    const SizedBox(height: 24),
                  ],

                  // Reviews section
                  if (_reviews.isNotEmpty) ...[
                    SectionHeader(
                      title: 'Reviews (${_reviews.length})',
                    ),
                    ...(_reviews.take(3).map((r) => _buildReviewTile(r))),
                    const SizedBox(height: 16),
                  ],

                  // Related products
                  if (_related.isNotEmpty) ...[
                    const SectionHeader(title: 'Related Products'),
                    SizedBox(
                      height: 240,
                      child: ListView.separated(
                        scrollDirection: Axis.horizontal,
                        itemCount: _related.length,
                        separatorBuilder: (_, __) => const SizedBox(width: 12),
                        itemBuilder: (context, index) {
                          final p = _related[index];
                          return SizedBox(
                            width: 160,
                            child: ProductCard(
                              product: p,
                              onTap: () {
                                Navigator.of(context).pushReplacementNamed(
                                  '/product',
                                  arguments: p.slug,
                                );
                              },
                            ),
                          );
                        },
                      ),
                    ),
                  ],

                  const SizedBox(height: 100),
                ],
              ),
            ),
          ),
        ],
      ),
      ),

      // Sticky bottom bar
      bottomNavigationBar: product.isInStock
          ? Container(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
              decoration: BoxDecoration(
                color: Colors.white,
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.08),
                    blurRadius: 16,
                    offset: const Offset(0, -4),
                  ),
                ],
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Row(
                    children: [
                      // Quantity stepper
                      QuantityStepper(
                        quantity: _quantity,
                        onChanged: (v) => setState(() => _quantity = v),
                        max: product.stock,
                      ),
                      const SizedBox(width: 12),
                      // Add to cart
                      Expanded(
                        child: SizedBox(
                          height: 48,
                          child: OutlinedButton.icon(
                            onPressed: _addToCart,
                            icon: const Icon(Icons.shopping_cart_outlined, size: 18),
                            label: const Text('Add to Cart'),
                            style: OutlinedButton.styleFrom(
                              side: BorderSide(color: AppTheme.primaryColor),
                              foregroundColor: AppTheme.primaryColor,
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(14),
                              ),
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  SizedBox(
                    width: double.infinity,
                    height: 50,
                    child: ElevatedButton.icon(
                      onPressed: _buyNow,
                      icon: const Icon(Icons.flash_on_rounded, size: 20),
                      label: Text(
                        'Buy Now  ${formatCurrency(product.effectivePrice * _quantity)}',
                      ),
                      style: ElevatedButton.styleFrom(
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(14),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            )
          : null,
    );
  }

  Widget _buildImageSlider(Product product) {
    final images = product.images.isNotEmpty
        ? product.images
        : (product.thumbnailUrl != null ? [product.thumbnailUrl!] : <String>[]);

    if (images.isEmpty) {
      return Container(
        color: AppTheme.surfaceColor,
        child: const Center(
          child: Icon(Icons.image_outlined, size: 64, color: AppTheme.textTertiary),
        ),
      );
    }

    return Stack(
      alignment: Alignment.bottomCenter,
      children: [
        PageView.builder(
          controller: _imagePageController,
          itemCount: images.length,
          onPageChanged: (i) => _currentImage = i,
          itemBuilder: (context, index) {
            return CachedNetworkImage(
              imageUrl: resolveImageUrl(images[index]),
              fit: BoxFit.cover,
              placeholder: (_, __) => Container(color: AppTheme.surfaceColor),
              errorWidget: (_, __, ___) => Container(
                color: AppTheme.surfaceColor,
                child: const Icon(Icons.broken_image_outlined,
                    size: 64, color: AppTheme.textTertiary),
              ),
            );
          },
        ),
        if (images.length > 1)
          Padding(
            padding: const EdgeInsets.only(bottom: 16),
            child: SmoothPageIndicator(
              controller: _imagePageController,
              count: images.length,
              effect: ExpandingDotsEffect(
                dotHeight: 6,
                dotWidth: 6,
                activeDotColor: AppTheme.primaryColor,
                dotColor: Colors.white.withValues(alpha: 0.6),
              ),
            ),
          ),
      ],
    );
  }

  Widget _circleButton(IconData icon, VoidCallback onTap, {Color? iconColor}) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        margin: const EdgeInsets.all(8),
        width: 38,
        height: 38,
        decoration: BoxDecoration(
          color: Colors.white.withValues(alpha: 0.9),
          shape: BoxShape.circle,
          boxShadow: [AppTheme.cardShadow],
        ),
        child: Icon(icon, size: 20, color: iconColor ?? AppTheme.textPrimary),
      ),
    );
  }

  Widget _buildReviewTile(Review review) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: AppTheme.surfaceColor,
          borderRadius: BorderRadius.circular(12),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                CircleAvatar(
                  radius: 16,
                  backgroundColor: AppTheme.primaryColor.withValues(alpha: 0.1),
                  child: Text(
                    (review.userName ?? 'A')[0].toUpperCase(),
                    style: TextStyle(
                      fontWeight: FontWeight.w600,
                      color: AppTheme.primaryColor,
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        review.userName ?? 'Anonymous',
                        style: const TextStyle(
                          fontWeight: FontWeight.w600,
                          fontSize: 13,
                        ),
                      ),
                      Row(
                        children: [
                          RatingBarIndicator(
                            rating: review.rating.toDouble(),
                            itemSize: 14,
                            itemBuilder: (_, __) => const Icon(
                              Icons.star_rounded,
                              color: AppTheme.warningColor,
                            ),
                          ),
                          const SizedBox(width: 6),
                          Text(
                            formatTimeAgo(review.createdAt),
                            style: const TextStyle(
                              fontSize: 11,
                              color: AppTheme.textTertiary,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                if (review.isVerified)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                    decoration: BoxDecoration(
                      color: AppTheme.successColor.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: const Text(
                      'Verified',
                      style: TextStyle(
                        fontSize: 10,
                        color: AppTheme.successColor,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
              ],
            ),
            if (review.body != null && review.body!.isNotEmpty) ...[
              const SizedBox(height: 10),
              Text(
                review.body!,
                style: const TextStyle(fontSize: 13, color: AppTheme.textSecondary, height: 1.5),
              ),
            ],
          ],
        ),
      ),
    );
  }

  void _addToCart() async {
    final auth = context.read<AuthProvider>();
    if (!auth.isAuthenticated) {
      Navigator.of(context).pushNamed('/login');
      return;
    }
    final cart = context.read<CartProvider>();
    final success = await cart.addToCart(
      _product!.id,
      quantity: _quantity,
      variantId: _selectedVariantId,
    );
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(success ? 'Added to cart' : 'Failed to add to cart'),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
      ),
    );
  }

  void _buyNow() async {
    final auth = context.read<AuthProvider>();
    if (!auth.isAuthenticated) {
      Navigator.of(context).pushNamed('/login');
      return;
    }
    final cart = context.read<CartProvider>();
    final success = await cart.addToCart(
      _product!.id,
      quantity: _quantity,
      variantId: _selectedVariantId,
    );
    if (!mounted) return;
    if (success) {
      Navigator.of(context).pushNamed('/checkout');
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: const Text('Failed to add to cart'),
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        ),
      );
    }
  }
}
