import 'package:cloud_firestore/cloud_firestore.dart';

class ConversationModel {
  final String conversationId;
  final String userId;
  final String userName;
  final String? userProfileImage;
  final String lastMessage;
  final DateTime lastMessageAt;
  final int unreadByAdmin;
  final int unreadByUser;
  final DateTime createdAt;

  ConversationModel({
    required this.conversationId,
    required this.userId,
    required this.userName,
    this.userProfileImage,
    required this.lastMessage,
    required this.lastMessageAt,
    required this.unreadByAdmin,
    required this.unreadByUser,
    required this.createdAt,
  });

  // Firestore에서 읽기
  factory ConversationModel.fromFirestore(DocumentSnapshot doc) {
    Map<String, dynamic> data = doc.data() as Map<String, dynamic>;
    return ConversationModel(
      conversationId: doc.id,
      userId: data['userId'] ?? '',
      userName: data['userName'] ?? '익명',
      userProfileImage: data['userProfileImage'],
      lastMessage: data['lastMessage'] ?? '',
      lastMessageAt: (data['lastMessageAt'] as Timestamp?)?.toDate() ?? DateTime.now(),
      unreadByAdmin: data['unreadByAdmin'] ?? 0,
      unreadByUser: data['unreadByUser'] ?? 0,
      createdAt: (data['createdAt'] as Timestamp?)?.toDate() ?? DateTime.now(),
    );
  }

  // Firestore에 쓰기
  Map<String, dynamic> toMap() {
    return {
      'conversationId': conversationId,
      'userId': userId,
      'userName': userName,
      'userProfileImage': userProfileImage,
      'lastMessage': lastMessage,
      'lastMessageAt': Timestamp.fromDate(lastMessageAt),
      'unreadByAdmin': unreadByAdmin,
      'unreadByUser': unreadByUser,
      'createdAt': Timestamp.fromDate(createdAt),
    };
  }

  // copyWith
  ConversationModel copyWith({
    String? conversationId,
    String? userId,
    String? userName,
    String? userProfileImage,
    String? lastMessage,
    DateTime? lastMessageAt,
    int? unreadByAdmin,
    int? unreadByUser,
    DateTime? createdAt,
  }) {
    return ConversationModel(
      conversationId: conversationId ?? this.conversationId,
      userId: userId ?? this.userId,
      userName: userName ?? this.userName,
      userProfileImage: userProfileImage ?? this.userProfileImage,
      lastMessage: lastMessage ?? this.lastMessage,
      lastMessageAt: lastMessageAt ?? this.lastMessageAt,
      unreadByAdmin: unreadByAdmin ?? this.unreadByAdmin,
      unreadByUser: unreadByUser ?? this.unreadByUser,
      createdAt: createdAt ?? this.createdAt,
    );
  }
}
