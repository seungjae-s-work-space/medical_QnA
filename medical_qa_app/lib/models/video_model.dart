import 'package:cloud_firestore/cloud_firestore.dart';

class VideoModel {
  final String id;
  final String title;
  final String youtubeUrl;
  final String videoId;
  final String? thumbnailUrl;
  final String description;
  final String authorId;
  final String authorName;
  final DateTime createdAt;
  final DateTime updatedAt;
  final bool isPublished;

  VideoModel({
    required this.id,
    required this.title,
    required this.youtubeUrl,
    required this.videoId,
    this.thumbnailUrl,
    required this.description,
    required this.authorId,
    required this.authorName,
    required this.createdAt,
    required this.updatedAt,
    required this.isPublished,
  });

  factory VideoModel.fromFirestore(DocumentSnapshot doc) {
    final data = doc.data() as Map<String, dynamic>;
    return VideoModel(
      id: doc.id,
      title: data['title'] ?? '',
      youtubeUrl: data['youtubeUrl'] ?? '',
      videoId: data['videoId'] ?? '',
      thumbnailUrl: data['thumbnailUrl'],
      description: data['description'] ?? '',
      authorId: data['authorId'] ?? '',
      authorName: data['authorName'] ?? '',
      createdAt: (data['createdAt'] as Timestamp?)?.toDate() ?? DateTime.now(),
      updatedAt: (data['updatedAt'] as Timestamp?)?.toDate() ?? DateTime.now(),
      isPublished: data['isPublished'] ?? false,
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'title': title,
      'youtubeUrl': youtubeUrl,
      'videoId': videoId,
      'thumbnailUrl': thumbnailUrl,
      'description': description,
      'authorId': authorId,
      'authorName': authorName,
      'createdAt': Timestamp.fromDate(createdAt),
      'updatedAt': Timestamp.fromDate(updatedAt),
      'isPublished': isPublished,
    };
  }
}
