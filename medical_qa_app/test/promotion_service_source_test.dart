import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

void main() {
  test(
      'promotion service uses a bounded published query ordered for carousel display',
      () {
    final source =
        File('lib/services/promotion_service.dart').readAsStringSync();

    expect(source, contains("static const int defaultLimit = 10"));
    expect(source, contains("final String _collection = 'promotions'"));
    expect(source, contains(".where('isPublished', isEqualTo: true)"));
    expect(source, contains(".orderBy('sortOrder')"));
    expect(source, contains(".orderBy('createdAt', descending: true)"));
    expect(source, contains(".limit(limit)"));
    expect(source,
        contains("Future<List<PromotionModel>> getPublishedPromotions"));
    expect(source, contains("Future<PromotionModel?> getPromotion"));
  });
}
