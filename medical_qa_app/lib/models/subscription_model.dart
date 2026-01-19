import 'package:cloud_firestore/cloud_firestore.dart';

/// 구독 상태 열거형
enum SubscriptionStatus {
  free,      // 무료 사용자
  active,    // 구독 활성
  expired,   // 만료됨
  cancelled, // 취소됨 (기간 내 사용 가능)
}

/// 구독 플랜 타입
enum SubscriptionPlanType {
  monthly,      // 월간권
  sixMonths,    // 6개월권
  twelveMonths, // 12개월권
}

/// 구독 플랜 정보
class SubscriptionPlan {
  final String id;
  final String name;
  final SubscriptionPlanType type;
  final int durationMonths;
  final double price;
  final String currency;
  final String? description;
  final String iosProductId;     // App Store 상품 ID
  final String androidProductId; // Google Play 상품 ID
  final bool isActive;

  const SubscriptionPlan({
    required this.id,
    required this.name,
    required this.type,
    required this.durationMonths,
    required this.price,
    this.currency = 'KRW',
    this.description,
    required this.iosProductId,
    required this.androidProductId,
    this.isActive = true,
  });

  /// 기본 구독 플랜들
  static const List<SubscriptionPlan> defaultPlans = [
    SubscriptionPlan(
      id: 'plan_monthly',
      name: '월간 이용권',
      type: SubscriptionPlanType.monthly,
      durationMonths: 1,
      price: 2900,
      currency: 'KRW',
      description: '1개월 동안 무제한 상담',
      iosProductId: 'com.gukitso.medicalqa.subscription.monthly',
      androidProductId: 'subscription_monthly',
    ),
    SubscriptionPlan(
      id: 'plan_6months',
      name: '6개월 이용권',
      type: SubscriptionPlanType.sixMonths,
      durationMonths: 6,
      price: 14900,
      currency: 'KRW',
      description: '17,400원 → 14,900원 (14% 할인)',
      iosProductId: 'com.gukitso.medicalqa.subscription.6months',
      androidProductId: 'subscription_6months',
    ),
    SubscriptionPlan(
      id: 'plan_12months',
      name: '12개월 이용권',
      type: SubscriptionPlanType.twelveMonths,
      durationMonths: 12,
      price: 19900,
      currency: 'KRW',
      description: '34,800원 → 19,900원 (43% 할인)',
      iosProductId: 'com.gukitso.medicalqa.subscription.12months',
      androidProductId: 'subscription_12months',
    ),
  ];

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'name': name,
      'type': type.name,
      'durationMonths': durationMonths,
      'price': price,
      'currency': currency,
      'description': description,
      'iosProductId': iosProductId,
      'androidProductId': androidProductId,
      'isActive': isActive,
    };
  }

  factory SubscriptionPlan.fromMap(Map<String, dynamic> map) {
    return SubscriptionPlan(
      id: map['id'] ?? '',
      name: map['name'] ?? '',
      type: SubscriptionPlanType.values.firstWhere(
        (e) => e.name == map['type'],
        orElse: () => SubscriptionPlanType.sixMonths,
      ),
      durationMonths: map['durationMonths'] ?? 6,
      price: (map['price'] ?? 0).toDouble(),
      currency: map['currency'] ?? 'KRW',
      description: map['description'],
      iosProductId: map['iosProductId'] ?? '',
      androidProductId: map['androidProductId'] ?? '',
      isActive: map['isActive'] ?? true,
    );
  }
}

/// 사용자 구독 정보
class SubscriptionModel {
  final String id;
  final String userId;
  final String planId;
  final SubscriptionStatus status;
  final String platform;           // 'ios' or 'android'
  final String? platformProductId; // 플랫폼 상품 ID
  final String? transactionId;     // 거래 ID
  final String? originalTransactionId; // 원본 거래 ID (갱신 추적용)
  final DateTime startDate;
  final DateTime endDate;
  final DateTime? cancelledAt;
  final DateTime createdAt;
  final DateTime updatedAt;

  SubscriptionModel({
    required this.id,
    required this.userId,
    required this.planId,
    required this.status,
    required this.platform,
    this.platformProductId,
    this.transactionId,
    this.originalTransactionId,
    required this.startDate,
    required this.endDate,
    this.cancelledAt,
    required this.createdAt,
    required this.updatedAt,
  });

  /// 구독이 현재 유효한지 확인
  bool get isValid {
    if (status == SubscriptionStatus.free) return false;
    if (status == SubscriptionStatus.expired) return false;
    return DateTime.now().isBefore(endDate);
  }

  /// 남은 일수
  int get remainingDays {
    if (!isValid) return 0;
    return endDate.difference(DateTime.now()).inDays;
  }

  SubscriptionModel copyWith({
    String? id,
    String? userId,
    String? planId,
    SubscriptionStatus? status,
    String? platform,
    String? platformProductId,
    String? transactionId,
    String? originalTransactionId,
    DateTime? startDate,
    DateTime? endDate,
    DateTime? cancelledAt,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return SubscriptionModel(
      id: id ?? this.id,
      userId: userId ?? this.userId,
      planId: planId ?? this.planId,
      status: status ?? this.status,
      platform: platform ?? this.platform,
      platformProductId: platformProductId ?? this.platformProductId,
      transactionId: transactionId ?? this.transactionId,
      originalTransactionId: originalTransactionId ?? this.originalTransactionId,
      startDate: startDate ?? this.startDate,
      endDate: endDate ?? this.endDate,
      cancelledAt: cancelledAt ?? this.cancelledAt,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'userId': userId,
      'planId': planId,
      'status': status.name,
      'platform': platform,
      'platformProductId': platformProductId,
      'transactionId': transactionId,
      'originalTransactionId': originalTransactionId,
      'startDate': Timestamp.fromDate(startDate),
      'endDate': Timestamp.fromDate(endDate),
      'cancelledAt': cancelledAt != null ? Timestamp.fromDate(cancelledAt!) : null,
      'createdAt': Timestamp.fromDate(createdAt),
      'updatedAt': Timestamp.fromDate(updatedAt),
    };
  }

  factory SubscriptionModel.fromMap(Map<String, dynamic> map) {
    return SubscriptionModel(
      id: map['id'] ?? '',
      userId: map['userId'] ?? '',
      planId: map['planId'] ?? '',
      status: SubscriptionStatus.values.firstWhere(
        (e) => e.name == map['status'],
        orElse: () => SubscriptionStatus.free,
      ),
      platform: map['platform'] ?? '',
      platformProductId: map['platformProductId'],
      transactionId: map['transactionId'],
      originalTransactionId: map['originalTransactionId'],
      startDate: (map['startDate'] as Timestamp).toDate(),
      endDate: (map['endDate'] as Timestamp).toDate(),
      cancelledAt: map['cancelledAt'] != null
          ? (map['cancelledAt'] as Timestamp).toDate()
          : null,
      createdAt: (map['createdAt'] as Timestamp).toDate(),
      updatedAt: (map['updatedAt'] as Timestamp).toDate(),
    );
  }

  factory SubscriptionModel.fromFirestore(DocumentSnapshot doc) {
    final data = doc.data() as Map<String, dynamic>;
    return SubscriptionModel.fromMap({...data, 'id': doc.id});
  }

  /// 무료 사용자용 기본 구독 모델
  factory SubscriptionModel.free(String userId) {
    final now = DateTime.now();
    return SubscriptionModel(
      id: '',
      userId: userId,
      planId: '',
      status: SubscriptionStatus.free,
      platform: '',
      startDate: now,
      endDate: now,
      createdAt: now,
      updatedAt: now,
    );
  }
}
