import '../utils/helpers.dart';

class Address {
  final String id;
  final String? label;
  final String? fullName;
  final String? phone;
  final String? addressLine1;
  final String? addressLine2;
  final String? city;
  final String? district;
  final String? region;
  final String? country;
  final String? postalCode;
  final double? latitude;
  final double? longitude;
  final bool isDefault;

  Address({
    required this.id,
    this.label,
    this.fullName,
    this.phone,
    this.addressLine1,
    this.addressLine2,
    this.city,
    this.district,
    this.region,
    this.country,
    this.postalCode,
    this.latitude,
    this.longitude,
    this.isDefault = false,
  });

  String get formatted {
    return [addressLine1, addressLine2, city, district, region]
        .where((s) => s != null && s.isNotEmpty)
        .join(', ');
  }

  factory Address.fromJson(Map<String, dynamic> json) {
    return Address(
      id: json['id'] ?? '',
      label: json['label'],
      fullName: json['fullName'],
      phone: json['phone'],
      addressLine1: json['addressLine1'],
      addressLine2: json['addressLine2'],
      city: json['city'],
      district: json['district'],
      region: json['region'],
      country: json['country'],
      postalCode: json['postalCode'],
      latitude: json['latitude'] != null ? safeDouble(json['latitude']) : null,
      longitude: json['longitude'] != null ? safeDouble(json['longitude']) : null,
      isDefault: json['isDefault'] ?? false,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      if (label != null) 'label': label,
      if (fullName != null) 'fullName': fullName,
      if (phone != null) 'phone': phone,
      if (addressLine1 != null) 'addressLine1': addressLine1,
      if (addressLine2 != null) 'addressLine2': addressLine2,
      if (city != null) 'city': city,
      if (district != null) 'district': district,
      if (region != null) 'region': region,
      if (country != null) 'country': country,
      if (postalCode != null) 'postalCode': postalCode,
      if (latitude != null) 'latitude': latitude,
      if (longitude != null) 'longitude': longitude,
    };
  }
}
