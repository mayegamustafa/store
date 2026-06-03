class Category {
  final String id;
  final String name;
  final String slug;
  final String? image;
  final String? icon;
  final String? description;
  final String? parentId;
  final bool isActive;
  final int sortOrder;
  final int? productCount;

  Category({
    required this.id,
    required this.name,
    required this.slug,
    this.image,
    this.icon,
    this.description,
    this.parentId,
    this.isActive = true,
    this.sortOrder = 0,
    this.productCount,
  });

  factory Category.fromJson(Map<String, dynamic> json) {
    return Category(
      id: json['id'] ?? '',
      name: json['name'] ?? '',
      slug: json['slug'] ?? '',
      image: json['image'],
      icon: json['icon'],
      description: json['description'],
      parentId: json['parentId'],
      isActive: json['isActive'] ?? true,
      sortOrder: json['sortOrder'] ?? 0,
      productCount: json['_count']?['products'] ?? json['productCount'],
    );
  }
}
