import 'package:cloud_firestore/cloud_firestore.dart';

class MessageModel {
  final String messageId;
  final String senderId;
  final String senderRole; // 'user' | 'admin'
  final String senderName;
  final String? senderProfileImage;
  final String text;
  final String? imageUrl;
  final bool isRead;
  final DateTime createdAt;

  MessageModel({
    required this.messageId,
    required this.senderId,
    required this.senderRole,
    required this.senderName,
    this.senderProfileImage,
    required this.text,
    this.imageUrl,
    required this.isRead,
    required this.createdAt,
  });

  // Firestore에서 읽기
  factory MessageModel.fromFirestore(DocumentSnapshot doc) {
    Map<String, dynamic> data = doc.data() as Map<String, dynamic>;
    return MessageModel(
      messageId: doc.id,
      senderId: data['senderId'] ?? '',
      senderRole: data['senderRole'] ?? 'user',
      senderName: data['senderName'] ?? '익명',
      senderProfileImage: data['senderProfileImage'],
      text: data['text'] ?? '',
      imageUrl: data['imageUrl'],
      isRead: data['isRead'] ?? false,
      createdAt: (data['createdAt'] as Timestamp?)?.toDate() ?? DateTime.now(),
    );
  }

  // Firestore에 쓰기
  Map<String, dynamic> toMap() {
    return {
      'senderId': senderId,
      'senderRole': senderRole,
      'senderName': senderName,
      'senderProfileImage': senderProfileImage,
      'text': text,
      'imageUrl': imageUrl,
      'isRead': isRead,
      'createdAt': Timestamp.fromDate(createdAt),
    };
  }

  // 내가 보낸 메시지인지 확인
  bool isMine(String currentUserId) => senderId == currentUserId;

  // copyWith
  MessageModel copyWith({
    String? messageId,
    String? senderId,
    String? senderRole,
    String? senderName,
    String? senderProfileImage,
    String? text,
    String? imageUrl,
    bool? isRead,
    DateTime? createdAt,
  }) {
    return MessageModel(
      messageId: messageId ?? this.messageId,
      senderId: senderId ?? this.senderId,
      senderRole: senderRole ?? this.senderRole,
      senderName: senderName ?? this.senderName,
      senderProfileImage: senderProfileImage ?? this.senderProfileImage,
      text: text ?? this.text,
      imageUrl: imageUrl ?? this.imageUrl,
      isRead: isRead ?? this.isRead,
      createdAt: createdAt ?? this.createdAt,
    );
  }
}
