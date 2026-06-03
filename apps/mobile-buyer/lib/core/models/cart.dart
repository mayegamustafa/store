import 'product.dart';

class CartItem {
  final String id;
  final String productId;
  final String? variantId;
  final int quantity;
  final Product? product;
  final ProductVariant? variant;

  CartItem({
    required this.id,
    required this.productId,
    this.variantId,
    required this.quantity,
    this.product,
    this.variant,
  });

  double get lineTotal {
    final price = variant?.price ?? product?.effectivePrice ?? 0;
    return price * quantity;
  }

  factory CartItem.fromJson(Map<String, dynamic> json) {
    return CartItem(
      id: json['id'] ?? '',
      productId: json['productId'] ?? '',
      variantId: json['variantId'],
      quantity: json['quantity'] ?? 1,
      product: json['product'] != null ? Product.fromJson(json['product']) : null,
      variant: json['variant'] != null ? ProductVariant.fromJson(json['variant']) : null,
    );
  }
}

class Cart {
  final String id;
  final List<CartItem> items;
  final String? couponId;

  Cart({
    required this.id,
    this.items = const [],
    this.couponId,
  });

  int get itemCount => items.fold(0, (sum, item) => sum + item.quantity);

  double get subtotal => items.fold(0.0, (sum, item) => sum + item.lineTotal);

  factory Cart.fromJson(Map<String, dynamic> json) {
    return Cart(
      id: json['id'] ?? '',
      items: json['items'] != null
          ? (json['items'] as List).map((i) => CartItem.fromJson(i)).toList()
          : [],
      couponId: json['couponId'],
    );
  }
}
