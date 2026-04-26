import 'package:cloud_firestore/cloud_firestore.dart';
import 'subscription_model.dart';

class UserModel {
  final String userId;
  final String role; // 'user' | 'admin'
  final String name;
  final String email;
  final String? profileImage;
  final String? fcmToken;
  final DateTime createdAt;
  final DateTime? lastSeenAt;

  // 구독 관련 필드
  final String? subscriptionId; // 현재 구독 ID
  final SubscriptionStatus subscriptionStatus; // 구독 상태
  final DateTime? subscriptionEndDate; // 구독 만료일
  final int freeContentViewLimit; // 무료 열람 총 횟수
  final int freeContentViewUsed; // 사용한 무료 열람 횟수

  UserModel({
    required this.userId,
    required this.role,
    required this.name,
    required this.email,
    this.profileImage,
    this.fcmToken,
    required this.createdAt,
    this.lastSeenAt,
    this.subscriptionId,
    this.subscriptionStatus = SubscriptionStatus.free,
    this.subscriptionEndDate,
    this.freeContentViewLimit = 5,
    this.freeContentViewUsed = 0,
  });

  // Firestore에서 읽기
  factory UserModel.fromFirestore(DocumentSnapshot doc) {
    Map<String, dynamic> data = doc.data() as Map<String, dynamic>;
    return UserModel(
      userId: doc.id,
      role: data['role'] ?? 'user',
      name: data['name'] ?? '',
      email: data['email'] ?? '',
      profileImage: data['profileImage'],
      fcmToken: data['fcmToken'],
      createdAt: (data['createdAt'] as Timestamp?)?.toDate() ?? DateTime.now(),
      lastSeenAt: (data['lastSeenAt'] as Timestamp?)?.toDate(),
      subscriptionId: data['subscriptionId'],
      subscriptionStatus: SubscriptionStatus.values.firstWhere(
        (e) => e.name == data['subscriptionStatus'],
        orElse: () => SubscriptionStatus.free,
      ),
      subscriptionEndDate:
          (data['subscriptionEndDate'] as Timestamp?)?.toDate(),
      freeContentViewLimit: _parseInt(data['freeContentViewLimit']) ?? 5,
      freeContentViewUsed: _parseInt(data['freeContentViewUsed']) ?? 0,
    );
  }

  // Firestore에 쓰기
  Map<String, dynamic> toMap() {
    return {
      'userId': userId,
      'role': role,
      'name': name,
      'email': email,
      'profileImage': profileImage,
      'fcmToken': fcmToken,
      'createdAt': Timestamp.fromDate(createdAt),
      'lastSeenAt': lastSeenAt != null ? Timestamp.fromDate(lastSeenAt!) : null,
      'subscriptionId': subscriptionId,
      'subscriptionStatus': subscriptionStatus.name,
      'subscriptionEndDate': subscriptionEndDate != null
          ? Timestamp.fromDate(subscriptionEndDate!)
          : null,
      'freeContentViewLimit': freeContentViewLimit,
      'freeContentViewUsed': freeContentViewUsed,
    };
  }

  // 관리자 여부 확인
  bool get isAdmin => role == 'admin';

  // 구독 유효 여부 확인
  bool get hasActiveSubscription {
    if (subscriptionStatus == SubscriptionStatus.free) return false;
    if (subscriptionStatus == SubscriptionStatus.expired) return false;
    if (subscriptionEndDate == null) return false;
    return DateTime.now().isBefore(subscriptionEndDate!);
  }

  int get remainingFreeContentViews {
    final remaining = freeContentViewLimit - freeContentViewUsed;
    return remaining > 0 ? remaining : 0;
  }

  bool get hasFreeContentViews => remainingFreeContentViews > 0;

  // copyWith
  UserModel copyWith({
    String? userId,
    String? role,
    String? name,
    String? email,
    String? profileImage,
    String? fcmToken,
    DateTime? createdAt,
    DateTime? lastSeenAt,
    String? subscriptionId,
    SubscriptionStatus? subscriptionStatus,
    DateTime? subscriptionEndDate,
    int? freeContentViewLimit,
    int? freeContentViewUsed,
  }) {
    return UserModel(
      userId: userId ?? this.userId,
      role: role ?? this.role,
      name: name ?? this.name,
      email: email ?? this.email,
      profileImage: profileImage ?? this.profileImage,
      fcmToken: fcmToken ?? this.fcmToken,
      createdAt: createdAt ?? this.createdAt,
      lastSeenAt: lastSeenAt ?? this.lastSeenAt,
      subscriptionId: subscriptionId ?? this.subscriptionId,
      subscriptionStatus: subscriptionStatus ?? this.subscriptionStatus,
      subscriptionEndDate: subscriptionEndDate ?? this.subscriptionEndDate,
      freeContentViewLimit: freeContentViewLimit ?? this.freeContentViewLimit,
      freeContentViewUsed: freeContentViewUsed ?? this.freeContentViewUsed,
    );
  }

  static int? _parseInt(dynamic value) {
    if (value is int) return value;
    if (value is double) return value.toInt();
    return null;
  }
}
