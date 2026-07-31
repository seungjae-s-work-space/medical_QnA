import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:medical_qa_app/models/promotion_model.dart';

void main() {
  test(
      'promotion model parses fields and exposes a default external link label',
      () {
    final createdAt = DateTime(2026, 7, 31, 9);
    final updatedAt = DateTime(2026, 7, 31, 10);

    final promotion = PromotionModel.fromMap('promo_1', {
      'title': '난임의사에게 속지 않는 법',
      'summary': '나와 맞는 난임의사 찾기',
      'bannerImageUrl': 'https://example.com/banner.png',
      'contentHtml': '<p>도서 소개</p>',
      'externalLinkUrl': 'https://book.example.com',
      'externalLinkLabel': '',
      'sortOrder': 3,
      'isPublished': true,
      'createdAt': Timestamp.fromDate(createdAt),
      'updatedAt': Timestamp.fromDate(updatedAt),
    });

    expect(promotion.id, 'promo_1');
    expect(promotion.title, '난임의사에게 속지 않는 법');
    expect(promotion.summary, '나와 맞는 난임의사 찾기');
    expect(promotion.bannerImageUrl, 'https://example.com/banner.png');
    expect(promotion.contentHtml, '<p>도서 소개</p>');
    expect(promotion.externalLinkUrl, 'https://book.example.com');
    expect(promotion.externalLinkLabel, '자세히 보기');
    expect(promotion.sortOrder, 3);
    expect(promotion.isPublished, isTrue);
    expect(promotion.createdAt, createdAt);
    expect(promotion.updatedAt, updatedAt);
    expect(promotion.hasExternalLink, isTrue);
  });

  test('promotion model defaults missing display fields safely', () {
    final promotion = PromotionModel.fromMap('promo_2', {});

    expect(promotion.title, '');
    expect(promotion.summary, '');
    expect(promotion.bannerImageUrl, '');
    expect(promotion.contentHtml, '');
    expect(promotion.externalLinkUrl, isNull);
    expect(promotion.externalLinkLabel, '자세히 보기');
    expect(promotion.sortOrder, 0);
    expect(promotion.isPublished, isFalse);
    expect(promotion.hasExternalLink, isFalse);
  });

  test('promotion model defaults malformed field types safely', () {
    final fallbackDate = DateTime.fromMillisecondsSinceEpoch(0);
    late final PromotionModel promotion;

    expect(
      () {
        promotion = PromotionModel.fromMap('promo_bad', {
          'title': 42,
          'summary': true,
          'bannerImageUrl': ['https://example.com/banner.png'],
          'contentHtml': {'html': '<p>도서 소개</p>'},
          'externalLinkUrl': 123,
          'externalLinkLabel': false,
          'sortOrder': '3',
          'isPublished': 'true',
          'createdAt': DateTime(2026, 7, 31, 9),
          'updatedAt': '2026-07-31T10:00:00Z',
        });
      },
      returnsNormally,
    );

    expect(promotion.title, '');
    expect(promotion.summary, '');
    expect(promotion.bannerImageUrl, '');
    expect(promotion.contentHtml, '');
    expect(promotion.externalLinkUrl, isNull);
    expect(promotion.externalLinkLabel, '자세히 보기');
    expect(promotion.sortOrder, 0);
    expect(promotion.isPublished, isFalse);
    expect(promotion.createdAt, fallbackDate);
    expect(promotion.updatedAt, fallbackDate);
    expect(promotion.hasExternalLink, isFalse);
  });
}
