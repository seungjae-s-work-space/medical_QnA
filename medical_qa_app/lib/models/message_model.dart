import 'package:cloud_firestore/cloud_firestore.dart';

/// 첨부 파일 타입
enum AttachmentType {
  image,
  video,
  file,
}

/// 첨부 파일 모델
class AttachmentModel {
  final String url;
  final AttachmentType type;
  final String? fileName;
  final int? fileSize; // bytes
  final String? mimeType;
  final String? thumbnailUrl; // 영상의 경우 썸네일

  AttachmentModel({
    required this.url,
    required this.type,
    this.fileName,
    this.fileSize,
    this.mimeType,
    this.thumbnailUrl,
  });

  factory AttachmentModel.fromMap(Map<String, dynamic> data) {
    return AttachmentModel(
      url: data['url'] ?? '',
      type: AttachmentType.values.firstWhere(
        (e) => e.name == data['type'],
        orElse: () => AttachmentType.file,
      ),
      fileName: data['fileName'],
      fileSize: data['fileSize'],
      mimeType: data['mimeType'],
      thumbnailUrl: data['thumbnailUrl'],
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'url': url,
      'type': type.name,
      'fileName': fileName,
      'fileSize': fileSize,
      'mimeType': mimeType,
      'thumbnailUrl': thumbnailUrl,
    };
  }

  /// 파일 크기를 읽기 쉬운 형식으로 반환
  String get fileSizeString {
    if (fileSize == null) return '';
    if (fileSize! < 1024) return '$fileSize B';
    if (fileSize! < 1024 * 1024) return '${(fileSize! / 1024).toStringAsFixed(1)} KB';
    return '${(fileSize! / (1024 * 1024)).toStringAsFixed(1)} MB';
  }
}

class MessageModel {
  final String messageId;
  final String senderId;
  final String senderRole; // 'user' | 'admin'
  final String senderName;
  final String? senderProfileImage;
  final String text;
  final String? imageUrl; // 하위 호환성 유지
  final List<AttachmentModel> attachments; // 새로운 첨부 파일 리스트
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
    this.attachments = const [],
    required this.isRead,
    required this.createdAt,
  });

  /// 첨부 파일이 있는지 확인
  bool get hasAttachments => attachments.isNotEmpty || imageUrl != null;

  /// 이미지 첨부 파일만 가져오기
  List<AttachmentModel> get imageAttachments =>
      attachments.where((a) => a.type == AttachmentType.image).toList();

  /// 영상 첨부 파일만 가져오기
  List<AttachmentModel> get videoAttachments =>
      attachments.where((a) => a.type == AttachmentType.video).toList();

  /// 문서 첨부 파일만 가져오기
  List<AttachmentModel> get fileAttachments =>
      attachments.where((a) => a.type == AttachmentType.file).toList();

  // Firestore에서 읽기
  factory MessageModel.fromFirestore(DocumentSnapshot doc) {
    Map<String, dynamic> data = doc.data() as Map<String, dynamic>;

    // attachments 파싱
    List<AttachmentModel> attachments = [];
    if (data['attachments'] != null) {
      attachments = (data['attachments'] as List)
          .map((a) => AttachmentModel.fromMap(a as Map<String, dynamic>))
          .toList();
    }

    return MessageModel(
      messageId: doc.id,
      senderId: data['senderId'] ?? '',
      senderRole: data['senderRole'] ?? 'user',
      senderName: data['senderName'] ?? '익명',
      senderProfileImage: data['senderProfileImage'],
      text: data['text'] ?? '',
      imageUrl: data['imageUrl'],
      attachments: attachments,
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
      'attachments': attachments.map((a) => a.toMap()).toList(),
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
    List<AttachmentModel>? attachments,
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
      attachments: attachments ?? this.attachments,
      isRead: isRead ?? this.isRead,
      createdAt: createdAt ?? this.createdAt,
    );
  }
}
