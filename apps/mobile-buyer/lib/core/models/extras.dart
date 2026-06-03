import '../utils/helpers.dart';

class Banner {
  final String id;
  final String? title;
  final String? subtitle;
  final String imageUrl;
  final String? linkUrl;
  final String? placement;
  final int sortOrder;

  Banner({
    required this.id,
    this.title,
    this.subtitle,
    required this.imageUrl,
    this.linkUrl,
    this.placement,
    this.sortOrder = 0,
  });

  factory Banner.fromJson(Map<String, dynamic> json) {
    return Banner(
      id: json['id'] ?? '',
      title: json['title'],
      subtitle: json['subtitle'],
      imageUrl: json['imageUrl'] ?? json['image'] ?? '',
      linkUrl: json['linkUrl'] ?? json['link'],
      placement: json['placement'],
      sortOrder: json['sortOrder'] ?? 0,
    );
  }
}

class HomeBlock {
  final String id;
  final String type;
  final String? title;
  final String? subtitle;
  final Map<String, dynamic>? config;
  final int sortOrder;
  final bool isActive;

  HomeBlock({
    required this.id,
    required this.type,
    this.title,
    this.subtitle,
    this.config,
    this.sortOrder = 0,
    this.isActive = true,
  });

  factory HomeBlock.fromJson(Map<String, dynamic> json) {
    return HomeBlock(
      id: json['id'] ?? '',
      type: json['type'] ?? '',
      title: json['title'],
      subtitle: json['subtitle'],
      config: json['config'],
      sortOrder: json['sortOrder'] ?? 0,
      isActive: json['isActive'] ?? true,
    );
  }
}

class FlashSale {
  final String id;
  final String name;
  final DateTime startsAt;
  final DateTime endsAt;
  final List<FlashSaleItem> items;

  FlashSale({
    required this.id,
    required this.name,
    required this.startsAt,
    required this.endsAt,
    this.items = const [],
  });

  bool get isActive {
    final now = DateTime.now();
    return now.isAfter(startsAt) && now.isBefore(endsAt);
  }

  Duration get remainingTime => endsAt.difference(DateTime.now());

  factory FlashSale.fromJson(Map<String, dynamic> json) {
    return FlashSale(
      id: json['id'] ?? '',
      name: json['name'] ?? '',
      startsAt: DateTime.tryParse(json['startsAt'] ?? '') ?? DateTime.now(),
      endsAt: DateTime.tryParse(json['endsAt'] ?? '') ?? DateTime.now(),
      items: json['items'] != null
          ? (json['items'] as List).map((i) => FlashSaleItem.fromJson(i)).toList()
          : [],
    );
  }
}

class FlashSaleItem {
  final String id;
  final String productId;
  final double salePrice;
  final int? quantityLimit;
  final int? soldCount;
  final Map<String, dynamic>? product;

  FlashSaleItem({
    required this.id,
    required this.productId,
    required this.salePrice,
    this.quantityLimit,
    this.soldCount,
    this.product,
  });

  factory FlashSaleItem.fromJson(Map<String, dynamic> json) {
    return FlashSaleItem(
      id: json['id'] ?? '',
      productId: json['productId'] ?? '',
      salePrice: safeDouble(json['salePrice']),
      quantityLimit: json['quantityLimit'],
      soldCount: json['soldCount'],
      product: json['product'],
    );
  }
}

class Review {
  final String id;
  final String productId;
  final String userId;
  final int rating;
  final String? title;
  final String? body;
  final List<String> images;
  final bool isVerified;
  final DateTime createdAt;
  final String? userName;
  final String? userAvatar;

  Review({
    required this.id,
    required this.productId,
    required this.userId,
    required this.rating,
    this.title,
    this.body,
    this.images = const [],
    this.isVerified = false,
    required this.createdAt,
    this.userName,
    this.userAvatar,
  });

  factory Review.fromJson(Map<String, dynamic> json) {
    return Review(
      id: json['id'] ?? '',
      productId: json['productId'] ?? '',
      userId: json['userId'] ?? '',
      rating: json['rating'] ?? 0,
      title: json['title'],
      body: json['body'],
      images: json['images'] != null ? List<String>.from(json['images']) : [],
      isVerified: json['isVerified'] ?? false,
      createdAt: DateTime.tryParse(json['createdAt'] ?? '') ?? DateTime.now(),
      userName: json['user']?['firstName'] ?? 'Anonymous',
      userAvatar: json['user']?['avatar'],
    );
  }
}

class AppNotification {
  final String id;
  final String type;
  final String title;
  final String body;
  final Map<String, dynamic>? data;
  final bool isRead;
  final DateTime createdAt;

  AppNotification({
    required this.id,
    required this.type,
    required this.title,
    required this.body,
    this.data,
    this.isRead = false,
    required this.createdAt,
  });

  factory AppNotification.fromJson(Map<String, dynamic> json) {
    return AppNotification(
      id: json['id'] ?? '',
      type: json['type'] ?? 'SYSTEM',
      title: json['title'] ?? '',
      body: json['body'] ?? '',
      data: json['data'],
      isRead: json['isRead'] ?? false,
      createdAt: DateTime.tryParse(json['createdAt'] ?? '') ?? DateTime.now(),
    );
  }
}
