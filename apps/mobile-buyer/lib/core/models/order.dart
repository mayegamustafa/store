import '../utils/helpers.dart';

class Order {
  final String id;
  final String orderNumber;
  final String status;
  final String paymentStatus;
  final String? paymentMethod;
  final double subtotal;
  final double shippingFee;
  final double discount;
  final double tax;
  final double total;
  final String? notes;
  final String? cancelReason;
  final DateTime createdAt;
  final DateTime updatedAt;
  final List<OrderItem> items;
  final OrderAddress? address;
  final Delivery? delivery;

  Order({
    required this.id,
    required this.orderNumber,
    required this.status,
    required this.paymentStatus,
    this.paymentMethod,
    required this.subtotal,
    required this.shippingFee,
    this.discount = 0,
    this.tax = 0,
    required this.total,
    this.notes,
    this.cancelReason,
    required this.createdAt,
    required this.updatedAt,
    this.items = const [],
    this.address,
    this.delivery,
  });

  factory Order.fromJson(Map<String, dynamic> json) {
    return Order(
      id: json['id'] ?? '',
      orderNumber: json['orderNumber'] ?? '',
      status: json['status'] ?? 'PENDING',
      paymentStatus: json['paymentStatus'] ?? 'PENDING',
      paymentMethod: json['paymentMethod'],
      subtotal: safeDouble(json['subtotal']),
      shippingFee: safeDouble(json['shippingFee']),
      discount: safeDouble(json['discount']),
      tax: safeDouble(json['tax']),
      total: safeDouble(json['total']),
      notes: json['notes'],
      cancelReason: json['cancelReason'],
      createdAt: DateTime.tryParse(json['createdAt'] ?? '') ?? DateTime.now(),
      updatedAt: DateTime.tryParse(json['updatedAt'] ?? '') ?? DateTime.now(),
      items: json['items'] != null
          ? (json['items'] as List).map((i) => OrderItem.fromJson(i)).toList()
          : [],
      address: json['address'] != null ? OrderAddress.fromJson(json['address']) : null,
      delivery: json['delivery'] != null ? Delivery.fromJson(json['delivery']) : null,
    );
  }
}

class OrderItem {
  final String id;
  final String productId;
  final String? variantId;
  final String productName;
  final String? variantName;
  final String? productImage;
  final double price;
  final int quantity;
  final double subtotal;

  OrderItem({
    required this.id,
    required this.productId,
    this.variantId,
    required this.productName,
    this.variantName,
    this.productImage,
    required this.price,
    required this.quantity,
    required this.subtotal,
  });

  factory OrderItem.fromJson(Map<String, dynamic> json) {
    return OrderItem(
      id: json['id'] ?? '',
      productId: json['productId'] ?? '',
      variantId: json['variantId'],
      productName: json['productName'] ?? '',
      variantName: json['variantName'],
      productImage: json['productImage'],
      price: safeDouble(json['price']),
      quantity: json['quantity'] ?? 1,
      subtotal: safeDouble(json['subtotal']),
    );
  }
}

class OrderAddress {
  final String? fullName;
  final String? phone;
  final String? addressLine1;
  final String? city;
  final String? district;
  final String? region;

  OrderAddress({
    this.fullName,
    this.phone,
    this.addressLine1,
    this.city,
    this.district,
    this.region,
  });

  String get formatted {
    return [addressLine1, city, district, region]
        .where((s) => s != null && s.isNotEmpty)
        .join(', ');
  }

  factory OrderAddress.fromJson(Map<String, dynamic> json) {
    return OrderAddress(
      fullName: json['fullName'],
      phone: json['phone'],
      addressLine1: json['addressLine1'],
      city: json['city'],
      district: json['district'],
      region: json['region'],
    );
  }
}

class Delivery {
  final String id;
  final String status;
  final String? pickupAddress;
  final double? dropoffLat;
  final double? dropoffLng;
  final String? estimatedTime;
  final DateTime? deliveredAt;

  Delivery({
    required this.id,
    required this.status,
    this.pickupAddress,
    this.dropoffLat,
    this.dropoffLng,
    this.estimatedTime,
    this.deliveredAt,
  });

  factory Delivery.fromJson(Map<String, dynamic> json) {
    return Delivery(
      id: json['id'] ?? '',
      status: json['status'] ?? 'ASSIGNED',
      pickupAddress: json['pickupAddress'],
      dropoffLat: safeDouble(json['dropoffLat']),
      dropoffLng: safeDouble(json['dropoffLng']),
      estimatedTime: json['estimatedTime'],
      deliveredAt: json['deliveredAt'] != null ? DateTime.tryParse(json['deliveredAt']) : null,
    );
  }
}
