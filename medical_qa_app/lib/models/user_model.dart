import 'package:cloud_firestore/cloud_firestore.dart';

class UserModel {
  final String userId;
  final String role; // 'user' | 'admin'
  final String name;
  final String email;
  final String? profileImage;
  final String? fcmToken;
  final DateTime createdAt;
  final DateTime? lastSeenAt;

  UserModel({
    required this.userId,
    required this.role,
    required this.name,
    required this.email,
    this.profileImage,
    this.fcmToken,
    required this.createdAt,
    this.lastSeenAt,
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
    };
  }

  // 관리자 여부 확인
  bool get isAdmin => role == 'admin';

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
    );
  }
}
