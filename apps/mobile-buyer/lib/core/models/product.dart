import '../utils/helpers.dart';

class Product {
  final String id;
  final String name;
  final String slug;
  final String? description;
  final String status;
  final double basePrice;
  final double? comparePrice;
  final double? cost;
  final String? discountType;
  final double? discountValue;
  final int stock;
  final List<String> images;
  final String? thumbnailUrl;
  final String? videoUrl;
  final String? adVideoUrl;
  final List<String> tags;
  final double rating;
  final int reviewCount;
  final int totalSold;
  final String? sku;
  final double? weight;
  final bool isFeatured;
  final String? categoryId;
  final String? categoryName;
  final String? sellerId;
  final String? sellerName;
  final double? deliveryFee;
  final List<ProductVariant> variants;

  Product({
    required this.id,
    required this.name,
    required this.slug,
    this.description,
    required this.status,
    required this.basePrice,
    this.comparePrice,
    this.cost,
    this.discountType,
    this.discountValue,
    this.stock = 0,
    this.images = const [],
    this.thumbnailUrl,
    this.videoUrl,
    this.adVideoUrl,
    this.tags = const [],
    this.rating = 0,
    this.reviewCount = 0,
    this.totalSold = 0,
    this.sku,
    this.weight,
    this.isFeatured = false,
    this.categoryId,
    this.categoryName,
    this.sellerId,
    this.sellerName,
    this.deliveryFee,
    this.variants = const [],
  });

  double get effectivePrice {
    if (discountType == 'PERCENTAGE' && discountValue != null) {
      return basePrice * (1 - discountValue! / 100);
    } else if (discountType == 'FIXED' && discountValue != null) {
      return basePrice - discountValue!;
    }
    return basePrice;
  }

  double? get discountPercentage {
    if (comparePrice != null && comparePrice! > basePrice) {
      return ((comparePrice! - basePrice) / comparePrice! * 100);
    }
    if (discountType == 'PERCENTAGE' && discountValue != null) {
      return discountValue;
    }
    return null;
  }

  bool get isInStock => stock > 0;

  String get primaryImage {
    if (thumbnailUrl != null && thumbnailUrl!.isNotEmpty) return thumbnailUrl!;
    if (images.isNotEmpty) return images.first;
    return '';
  }

  factory Product.fromJson(Map<String, dynamic> json) {
    return Product(
      id: json['id'] ?? '',
      name: json['name'] ?? '',
      slug: json['slug'] ?? '',
      description: json['description'],
      status: json['status'] ?? 'APPROVED',
      basePrice: safeDouble(json['basePrice']),
      comparePrice: json['comparePrice'] != null ? safeDouble(json['comparePrice']) : null,
      cost: json['cost'] != null ? safeDouble(json['cost']) : null,
      discountType: json['discountType'],
      discountValue: json['discountValue'] != null ? safeDouble(json['discountValue']) : null,
      stock: json['stock'] ?? 0,
      images: json['images'] != null ? List<String>.from(json['images']) : [],
      thumbnailUrl: json['thumbnailUrl'],
      videoUrl: json['videoUrl'],
      adVideoUrl: json['adVideoUrl'],
      tags: json['tags'] != null ? List<String>.from(json['tags']) : [],
      rating: safeDouble(json['rating']),
      reviewCount: json['reviewCount'] ?? 0,
      totalSold: json['totalSold'] ?? 0,
      sku: json['sku'],
      weight: json['weight'] != null ? safeDouble(json['weight']) : null,
      isFeatured: json['isFeatured'] ?? false,
      categoryId: json['categoryId'],
      categoryName: json['category']?['name'],
      sellerId: json['sellerId'],
      sellerName: json['seller']?['storeName'] ?? json['seller']?['user']?['firstName'],
      deliveryFee: json['deliveryFee'] != null ? safeDouble(json['deliveryFee']) : null,
      variants: json['variants'] != null
          ? (json['variants'] as List).map((v) => ProductVariant.fromJson(v)).toList()
          : [],
    );
  }
}

class ProductVariant {
  final String id;
  final String name;
  final Map<String, dynamic>? options;
  final String? sku;
  final double? price;
  final int stock;
  final String? image;

  ProductVariant({
    required this.id,
    required this.name,
    this.options,
    this.sku,
    this.price,
    this.stock = 0,
    this.image,
  });

  factory ProductVariant.fromJson(Map<String, dynamic> json) {
    return ProductVariant(
      id: json['id'] ?? '',
      name: json['name'] ?? '',
      options: json['options'],
      sku: json['sku'],
      price: json['price'] != null ? safeDouble(json['price']) : null,
      stock: json['stock'] ?? 0,
      image: json['image'],
    );
  }
}
