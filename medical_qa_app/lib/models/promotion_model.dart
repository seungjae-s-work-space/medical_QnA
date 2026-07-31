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
    final externalLinkUrl = _readOptionalTrimmedString(
      data,
      'externalLinkUrl',
    );

    return PromotionModel(
      id: id,
      title: _readString(data, 'title'),
      summary: _readString(data, 'summary'),
      bannerImageUrl: _readString(data, 'bannerImageUrl'),
      contentHtml: _readString(data, 'contentHtml'),
      externalLinkUrl: externalLinkUrl,
      externalLinkLabel: _readTrimmedString(
        data,
        'externalLinkLabel',
        fallback: '자세히 보기',
      ),
      sortOrder: _readInt(data, 'sortOrder'),
      isPublished: _readBool(data, 'isPublished'),
      createdAt: _readTimestamp(data, 'createdAt'),
      updatedAt: _readTimestamp(data, 'updatedAt'),
    );
  }

  static String _readString(Map<String, dynamic> data, String key) {
    final value = data[key];
    return value is String ? value : '';
  }

  static String _readTrimmedString(
    Map<String, dynamic> data,
    String key, {
    required String fallback,
  }) {
    final value = data[key];
    if (value is! String) return fallback;

    final trimmedValue = value.trim();
    return trimmedValue.isEmpty ? fallback : trimmedValue;
  }

  static String? _readOptionalTrimmedString(
    Map<String, dynamic> data,
    String key,
  ) {
    final value = data[key];
    if (value is! String) return null;

    final trimmedValue = value.trim();
    return trimmedValue.isEmpty ? null : trimmedValue;
  }

  static int _readInt(Map<String, dynamic> data, String key) {
    final value = data[key];
    return value is num ? value.toInt() : 0;
  }

  static bool _readBool(Map<String, dynamic> data, String key) {
    final value = data[key];
    return value is bool ? value : false;
  }

  static DateTime _readTimestamp(Map<String, dynamic> data, String key) {
    final value = data[key];
    return value is Timestamp
        ? value.toDate()
        : DateTime.fromMillisecondsSinceEpoch(0);
  }
}
