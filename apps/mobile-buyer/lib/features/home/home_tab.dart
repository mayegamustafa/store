import 'dart:async';
import 'package:flutter/material.dart' hide Banner;
import 'package:provider/provider.dart';
import 'package:carousel_slider/carousel_slider.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:shimmer/shimmer.dart';
import '../../core/theme.dart';
import '../../core/utils/helpers.dart';
import '../../core/models/models.dart';
import '../../shared/widgets/product_card.dart';
import '../../shared/widgets/common.dart';
import '../products/products_provider.dart';
import '../cart/cart_provider.dart';
import '../auth/auth_provider.dart';

class HomeTab extends StatefulWidget {
  const HomeTab({super.key});

  @override
  State<HomeTab> createState() => _HomeTabState();
}

class _HomeTabState extends State<HomeTab> {
  final ScrollController _scrollController = ScrollController();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<ProductsProvider>().fetchHomeData();
    });
    _scrollController.addListener(_onScroll);
  }

  void _onScroll() {
    if (_scrollController.position.pixels >=
        _scrollController.position.maxScrollExtent - 300) {
      context.read<ProductsProvider>().loadMore();
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
      body: SafeArea(
        child: Consumer<ProductsProvider>(
          builder: (context, provider, child) {
            return RefreshIndicator(
              onRefresh: () => provider.fetchHomeData(),
              child: CustomScrollView(
                controller: _scrollController,
                physics: const AlwaysScrollableScrollPhysics(),
                slivers: [
                  // Search bar header
                  _buildSearchHeader(),

                  // Banner carousel
                  if (provider.banners.isNotEmpty) _buildBannerCarousel(provider.banners),

                  // Categories horizontal scroll
                  if (provider.categories.isNotEmpty)
                    _buildCategoriesSection(provider.categories),

                  // Flash sales
                  if (provider.flashSales.isNotEmpty)
                    _buildFlashSaleSection(provider.flashSales.first),

                  // Promotions strip (non-intrusive, auto-scrolling)
                  _buildPromoStrip(),

                  // Featured products
                  if (provider.featured.isNotEmpty)
                    _buildFeaturedSection(provider.featured),

                // Section title
                SliverToBoxAdapter(
                  child: SectionHeader(
                    title: 'All Products',
                    actionLabel: 'Filter',
                    onAction: () => _showSortSheet(context),
                  ),
                ),

                // Products grid
                if (provider.isLoading && provider.products.isEmpty)
                  _buildSkeletonGrid()
                else if (provider.products.isEmpty)
                  SliverToBoxAdapter(
                    child: EmptyState(
                      icon: Icons.shopping_bag_outlined,
                      title: 'No Products Yet',
                      subtitle: 'Check back later for new arrivals',
                    ),
                  )
                else
                  _buildProductsGrid(provider.products),

                // Loading more indicator
                if (provider.isLoadingMore)
                  const SliverToBoxAdapter(
                    child: Padding(
                      padding: EdgeInsets.all(24),
                      child: LoadingIndicator(),
                    ),
                  ),

                // Bottom spacing
                const SliverToBoxAdapter(child: SizedBox(height: 24)),
              ],
            ),
            );
          },
        ),
      ),
    );
  }

  Widget _buildSearchHeader() {
    return SliverToBoxAdapter(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
        child: Row(
          children: [
            Expanded(
              child: GestureDetector(
                onTap: () => Navigator.of(context).pushNamed('/search'),
                child: Container(
                  height: 48,
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(14),
                    boxShadow: [AppTheme.cardShadow],
                  ),
                  child: Row(
                    children: [
                      Icon(Icons.search_rounded,
                          size: 22, color: AppTheme.textTertiary),
                      const SizedBox(width: 10),
                      Text(
                        'Search products...',
                        style: TextStyle(
                          color: AppTheme.textTertiary,
                          fontSize: 15,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
            const SizedBox(width: 12),
            GestureDetector(
              onTap: () => Navigator.of(context).pushNamed('/notifications'),
              child: Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(14),
                  boxShadow: [AppTheme.cardShadow],
                ),
                child: const Icon(Icons.notifications_none_rounded,
                    size: 24, color: AppTheme.textPrimary),
              ),
            ),
          ],
        ),
      ),
    );
  }

  /// A subtle, auto-scrolling row of promotional highlights. Sits mid-page and
  /// moves on its own so it draws attention without interrupting browsing.
  Widget _buildPromoStrip() {
    final promos = <Map<String, dynamic>>[
      {'icon': Icons.local_shipping_rounded, 'title': 'Free delivery', 'sub': 'On orders over UGX 150,000', 'colors': const [Color(0xFF0EA5E9), Color(0xFF2563EB)]},
      {'icon': Icons.bolt_rounded, 'title': 'Flash deals daily', 'sub': 'Up to 70% off', 'colors': const [Color(0xFFF59E0B), Color(0xFFEF4444)]},
      {'icon': Icons.verified_rounded, 'title': 'Verified sellers', 'sub': 'Shop with confidence', 'colors': const [Color(0xFF10B981), Color(0xFF059669)]},
      {'icon': Icons.payments_rounded, 'title': 'Pay on delivery', 'sub': 'Cash or Mobile Money', 'colors': const [Color(0xFF8B5CF6), Color(0xFF6D28D9)]},
    ];
    return SliverToBoxAdapter(
      child: Padding(
        padding: const EdgeInsets.only(top: 4, bottom: 8),
        child: CarouselSlider(
          items: promos.map((p) {
            return GestureDetector(
              onTap: () => Navigator.of(context).pushNamed('/products'),
              child: Container(
                width: double.infinity,
                margin: const EdgeInsets.symmetric(horizontal: 4),
                padding: const EdgeInsets.symmetric(horizontal: 16),
                decoration: BoxDecoration(
                  gradient: LinearGradient(colors: (p['colors'] as List<Color>)),
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Row(
                  children: [
                    Icon(p['icon'] as IconData, color: Colors.white, size: 26),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(p['title'] as String,
                              style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14),
                              maxLines: 1, overflow: TextOverflow.ellipsis),
                          Text(p['sub'] as String,
                              style: TextStyle(color: Colors.white.withValues(alpha: 0.85), fontSize: 12),
                              maxLines: 1, overflow: TextOverflow.ellipsis),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            );
          }).toList(),
          options: CarouselOptions(
            height: 66,
            viewportFraction: 0.74,
            autoPlay: true,
            autoPlayInterval: const Duration(seconds: 3),
            autoPlayAnimationDuration: const Duration(milliseconds: 700),
            enableInfiniteScroll: true,
            padEnds: false,
          ),
        ),
      ),
    );
  }

  Widget _buildBannerCarousel(List<Banner> banners) {
    return SliverToBoxAdapter(
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 12),
        child: CarouselSlider(
          items: banners.map<Widget>((banner) {
            return Container(
              margin: const EdgeInsets.symmetric(horizontal: 4),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(16),
                boxShadow: [AppTheme.cardShadow],
              ),
              clipBehavior: Clip.antiAlias,
              child: CachedNetworkImage(
                imageUrl: resolveImageUrl(banner.imageUrl),
                fit: BoxFit.cover,
                width: double.infinity,
                placeholder: (_, __) => Shimmer.fromColors(
                  baseColor: Colors.grey[200]!,
                  highlightColor: Colors.grey[50]!,
                  child: Container(color: Colors.white),
                ),
                errorWidget: (_, __, ___) => Container(
                  color: AppTheme.primaryColor.withValues(alpha: 0.1),
                  child: Center(
                    child: Icon(Icons.image_outlined,
                        size: 48, color: AppTheme.primaryColor),
                  ),
                ),
              ),
            );
          }).toList(),
          options: CarouselOptions(
            height: 160,
            viewportFraction: 0.9,
            autoPlay: true,
            autoPlayInterval: const Duration(seconds: 5),
            enlargeCenterPage: true,
            enlargeStrategy: CenterPageEnlargeStrategy.height,
          ),
        ),
      ),
    );
  }

  Widget _buildCategoriesSection(List<Category> categories) {
    return SliverToBoxAdapter(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SectionHeader(
            title: 'Categories',
            actionLabel: 'See All',
            onAction: () {},
          ),
          SizedBox(
            height: 100,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16),
              itemCount: categories.length,
              separatorBuilder: (_, __) => const SizedBox(width: 16),
              itemBuilder: (context, index) {
                final cat = categories[index];
                return GestureDetector(
                  onTap: () => Navigator.of(context)
                      .pushNamed('/products', arguments: {'categoryId': cat.id, 'title': cat.name}),
                  child: SizedBox(
                    width: 72,
                    child: Column(
                      children: [
                        Container(
                          width: 60,
                          height: 60,
                          decoration: BoxDecoration(
                            color: AppTheme.primaryColor.withValues(alpha: 0.08),
                            borderRadius: BorderRadius.circular(16),
                          ),
                          child: cat.image != null && cat.image!.isNotEmpty
                              ? ClipRRect(
                                  borderRadius: BorderRadius.circular(16),
                                  child: CachedNetworkImage(
                                    imageUrl: resolveImageUrl(cat.image),
                                    fit: BoxFit.cover,
                                    errorWidget: (_, __, ___) => Icon(
                                      Icons.category_rounded,
                                      color: AppTheme.primaryColor,
                                      size: 28,
                                    ),
                                  ),
                                )
                              : Icon(
                                  Icons.category_rounded,
                                  color: AppTheme.primaryColor,
                                  size: 28,
                                ),
                        ),
                        const SizedBox(height: 6),
                        Text(
                          cat.name,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          textAlign: TextAlign.center,
                          style: const TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w500,
                            color: AppTheme.textPrimary,
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFlashSaleSection(FlashSale sale) {
    return SliverToBoxAdapter(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: Row(
              children: [
                Icon(Icons.flash_on_rounded,
                    color: AppTheme.warningColor, size: 22),
                const SizedBox(width: 6),
                const Text(
                  'Flash Sale',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w700,
                    color: AppTheme.textPrimary,
                  ),
                ),
                const SizedBox(width: 12),
                _FlashSaleCountdown(endsAt: sale.endsAt),
              ],
            ),
          ),
          SizedBox(
            height: 220,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16),
              itemCount: sale.items.length,
              separatorBuilder: (_, __) => const SizedBox(width: 12),
              itemBuilder: (context, index) {
                final item = sale.items[index];
                if (item.product == null) return const SizedBox();
                final product = Product.fromJson(item.product!);
                return SizedBox(
                  width: 150,
                  child: ProductCard(
                    product: product,
                    onTap: () => Navigator.of(context)
                        .pushNamed('/product', arguments: product.slug),
                    onAddToCart: () => _addToCart(product.id),
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFeaturedSection(List<Product> featured) {
    return SliverToBoxAdapter(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const SectionHeader(title: 'Featured'),
          SizedBox(
            height: 240,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16),
              itemCount: featured.length,
              separatorBuilder: (_, __) => const SizedBox(width: 12),
              itemBuilder: (context, index) {
                final product = featured[index];
                return SizedBox(
                  width: 160,
                  child: ProductCard(
                    product: product,
                    onTap: () => Navigator.of(context)
                        .pushNamed('/product', arguments: product.slug),
                    onAddToCart: () => _addToCart(product.id),
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildProductsGrid(List<Product> products) {
    return SliverPadding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      sliver: SliverGrid(
        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
          crossAxisCount: 2,
          childAspectRatio: 0.62,
          crossAxisSpacing: 12,
          mainAxisSpacing: 12,
        ),
        delegate: SliverChildBuilderDelegate(
          (context, index) {
            final product = products[index];
            return ProductCard(
              product: product,
              onTap: () => Navigator.of(context)
                  .pushNamed('/product', arguments: product.slug),
              onAddToCart: () => _addToCart(product.id),
            );
          },
          childCount: products.length,
        ),
      ),
    );
  }

  Widget _buildSkeletonGrid() {
    return SliverPadding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      sliver: SliverGrid(
        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
          crossAxisCount: 2,
          childAspectRatio: 0.62,
          crossAxisSpacing: 12,
          mainAxisSpacing: 12,
        ),
        delegate: SliverChildBuilderDelegate(
          (context, index) => const ProductCardSkeleton(),
          childCount: 6,
        ),
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
        content: Text(success ? 'Added to cart' : 'Failed to add to cart'),
        duration: const Duration(seconds: 1),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
      ),
    );
  }

  void _showSortSheet(BuildContext context) {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) {
        return SafeArea(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 40,
                height: 4,
                margin: const EdgeInsets.only(top: 12),
                decoration: BoxDecoration(
                  color: AppTheme.dividerColor,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              const SizedBox(height: 16),
              const Text(
                'Sort By',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
              ),
              const SizedBox(height: 8),
              ...[
                ('Newest', 'newest'),
                ('Price: Low to High', 'price_asc'),
                ('Price: High to Low', 'price_desc'),
                ('Most Popular', 'popular'),
                ('Best Rating', 'rating'),
              ].map((item) {
                return ListTile(
                  title: Text(item.$1),
                  onTap: () {
                    Navigator.pop(ctx);
                    context
                        .read<ProductsProvider>()
                        .fetchProducts(refresh: true, sortBy: item.$2);
                  },
                );
              }),
              const SizedBox(height: 16),
            ],
          ),
        );
      },
    );
  }
}

class _FlashSaleCountdown extends StatefulWidget {
  final DateTime endsAt;

  const _FlashSaleCountdown({required this.endsAt});

  @override
  State<_FlashSaleCountdown> createState() => _FlashSaleCountdownState();
}

class _FlashSaleCountdownState extends State<_FlashSaleCountdown> {
  late Timer _timer;
  Duration _remaining = Duration.zero;

  @override
  void initState() {
    super.initState();
    _remaining = widget.endsAt.difference(DateTime.now());
    _timer = Timer.periodic(const Duration(seconds: 1), (_) {
      setState(() {
        _remaining = widget.endsAt.difference(DateTime.now());
        if (_remaining.isNegative) {
          _remaining = Duration.zero;
          _timer.cancel();
        }
      });
    });
  }

  @override
  void dispose() {
    _timer.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final hours = _remaining.inHours;
    final minutes = _remaining.inMinutes % 60;
    final seconds = _remaining.inSeconds % 60;

    return Row(
      children: [
        _timeBox('${hours.toString().padLeft(2, '0')}'),
        const Text(' : ', style: TextStyle(fontWeight: FontWeight.bold, color: AppTheme.errorColor)),
        _timeBox('${minutes.toString().padLeft(2, '0')}'),
        const Text(' : ', style: TextStyle(fontWeight: FontWeight.bold, color: AppTheme.errorColor)),
        _timeBox('${seconds.toString().padLeft(2, '0')}'),
      ],
    );
  }

  Widget _timeBox(String text) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
      decoration: BoxDecoration(
        color: AppTheme.errorColor,
        borderRadius: BorderRadius.circular(6),
      ),
      child: Text(
        text,
        style: const TextStyle(
          color: Colors.white,
          fontSize: 13,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }
}
