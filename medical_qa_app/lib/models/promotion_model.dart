import 'package:cloud_firestore/cloud_firestore.dart';

class PromotionModel {
  final String id;
  final String title;
  final String summary;
  final String bannerImageUrl;
  final String contentHtml;
  final String? externalLinkUrl;
  final String externalLinkLabel;
  final int sortOrder;
  final bool isPublished;
  final DateTime createdAt;
  final DateTime updatedAt;

  PromotionModel({
    required this.id,
    required this.title,
    required this.summary,
    required this.bannerImageUrl,
    required this.contentHtml,
    this.externalLinkUrl,
    required this.externalLinkLabel,
    required this.sortOrder,
    required this.isPublished,
    required this.createdAt,
    required this.updatedAt,
  });

  bool get hasExternalLink =>
      externalLinkUrl != null && externalLinkUrl!.trim().isNotEmpty;

  factory PromotionModel.fromFirestore(DocumentSnapshot doc) {
    final data = doc.data() as Map<String, dynamic>? ?? {};
    return PromotionModel.fromMap(doc.id, data);
  }

  factory PromotionModel.fromMap(String id, Map<String, dynamic> data) {
    final rawExternalLink = (data['externalLinkUrl'] as String?)?.trim();
    final rawLabel = (data['externalLinkLabel'] as String?)?.trim();
    final sortOrderValue = data['sortOrder'];

    return PromotionModel(
      id: id,
      title: data['title'] ?? '',
      summary: data['summary'] ?? '',
      bannerImageUrl: data['bannerImageUrl'] ?? '',
      contentHtml: data['contentHtml'] ?? '',
      externalLinkUrl: rawExternalLink == null || rawExternalLink.isEmpty
          ? null
          : rawExternalLink,
      externalLinkLabel:
          rawLabel == null || rawLabel.isEmpty ? '자세히 보기' : rawLabel,
      sortOrder: sortOrderValue is num ? sortOrderValue.toInt() : 0,
      isPublished: data['isPublished'] ?? false,
      createdAt: (data['createdAt'] as Timestamp?)?.toDate() ??
          DateTime.fromMillisecondsSinceEpoch(0),
      updatedAt: (data['updatedAt'] as Timestamp?)?.toDate() ??
          DateTime.fromMillisecondsSinceEpoch(0),
    );
  }
}
