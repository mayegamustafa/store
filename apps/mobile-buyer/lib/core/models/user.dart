import '../utils/helpers.dart';

class User {
  final String id;
  final String? email;
  final String? phone;
  final String? firstName;
  final String? lastName;
  final String? avatar;
  final String role;
  final String status;
  final double walletBalance;
  final int loyaltyPoints;
  final bool isEmailVerified;
  final bool isPhoneVerified;

  User({
    required this.id,
    this.email,
    this.phone,
    this.firstName,
    this.lastName,
    this.avatar,
    required this.role,
    required this.status,
    this.walletBalance = 0,
    this.loyaltyPoints = 0,
    this.isEmailVerified = false,
    this.isPhoneVerified = false,
  });

  String get displayName {
    if (firstName != null && firstName!.isNotEmpty) {
      return '${firstName ?? ''} ${lastName ?? ''}'.trim();
    }
    return email ?? phone ?? 'User';
  }

  String get initials {
    if (firstName != null && firstName!.isNotEmpty) {
      final first = firstName![0].toUpperCase();
      final last = (lastName != null && lastName!.isNotEmpty) ? lastName![0].toUpperCase() : '';
      return '$first$last';
    }
    return (email ?? phone ?? 'U')[0].toUpperCase();
  }

  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      id: json['id'] ?? '',
      email: json['email'],
      phone: json['phone'],
      firstName: json['firstName'],
      lastName: json['lastName'],
      avatar: json['avatar'],
      role: json['role'] ?? 'BUYER',
      status: json['status'] ?? 'ACTIVE',
      walletBalance: safeDouble(json['walletBalance']),
      loyaltyPoints: json['loyaltyPoints'] ?? 0,
      isEmailVerified: json['isEmailVerified'] ?? false,
      isPhoneVerified: json['isPhoneVerified'] ?? false,
    );
  }
}
