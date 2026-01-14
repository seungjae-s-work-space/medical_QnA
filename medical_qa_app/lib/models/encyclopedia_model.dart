import 'package:cloud_firestore/cloud_firestore.dart';

class EncyclopediaModel {
  final String id;
  final String title;
  final String content;
  final String? imageUrl;
  final String authorId;
  final String authorName;
  final DateTime createdAt;
  final DateTime updatedAt;
  final bool isPublished;
  final int viewCount;

  EncyclopediaModel({
    required this.id,
    required this.title,
    required this.content,
    this.imageUrl,
    required this.authorId,
    required this.authorName,
    required this.createdAt,
    required this.updatedAt,
    required this.isPublished,
    this.viewCount = 0,
  });

  factory EncyclopediaModel.fromFirestore(DocumentSnapshot doc) {
    Map<String, dynamic> data = doc.data() as Map<String, dynamic>;
    return EncyclopediaModel(
      id: doc.id,
      title: data['title'] ?? '',
      content: data['content'] ?? '',
      imageUrl: data['imageUrl'],
      authorId: data['authorId'] ?? '',
      authorName: data['authorName'] ?? '관리자',
      createdAt: (data['createdAt'] as Timestamp?)?.toDate() ?? DateTime.now(),
      updatedAt: (data['updatedAt'] as Timestamp?)?.toDate() ?? DateTime.now(),
      isPublished: data['isPublished'] ?? true,
      viewCount: data['viewCount'] ?? 0,
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'title': title,
      'content': content,
      'imageUrl': imageUrl,
      'authorId': authorId,
      'authorName': authorName,
      'createdAt': Timestamp.fromDate(createdAt),
      'updatedAt': Timestamp.fromDate(updatedAt),
      'isPublished': isPublished,
      'viewCount': viewCount,
    };
  }

  EncyclopediaModel copyWith({
    String? id,
    String? title,
    String? content,
    String? imageUrl,
    String? authorId,
    String? authorName,
    DateTime? createdAt,
    DateTime? updatedAt,
    bool? isPublished,
    int? viewCount,
  }) {
    return EncyclopediaModel(
      id: id ?? this.id,
      title: title ?? this.title,
      content: content ?? this.content,
      imageUrl: imageUrl ?? this.imageUrl,
      authorId: authorId ?? this.authorId,
      authorName: authorName ?? this.authorName,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      isPublished: isPublished ?? this.isPublished,
      viewCount: viewCount ?? this.viewCount,
    );
  }
}
