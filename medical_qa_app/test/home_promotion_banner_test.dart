import 'dart:io';

import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:medical_qa_app/models/promotion_model.dart';
import 'package:medical_qa_app/screens/user/promotion_detail_screen.dart';
import 'package:medical_qa_app/widgets/promotion_carousel.dart';

String _readSource(String path) {
  final file = File(path);
  return file.existsSync() ? file.readAsStringSync() : '';
}

PromotionModel _promotion({
  required String id,
  String title = '프로모션',
  String? externalLinkUrl,
  String externalLinkLabel = '자세히 보기',
}) {
  return PromotionModel(
    id: id,
    title: title,
    summary: '따뜻한 안내',
    bannerImageUrl: 'https://example.com/$id.png',
    contentHtml: '<p>프로모션 본문</p>',
    externalLinkUrl: externalLinkUrl,
    externalLinkLabel: externalLinkLabel,
    sortOrder: 0,
    isPublished: true,
    createdAt: DateTime(2026, 7, 31),
    updatedAt: DateTime(2026, 7, 31),
  );
}

Future<void> _pumpCarousel(
  WidgetTester tester, {
  required List<PromotionModel> promotions,
  required ValueChanged<PromotionModel> onPromotionTap,
}) async {
  await tester.pumpWidget(
    MaterialApp(
      home: Scaffold(
        body: PromotionCarousel(
          promotions: promotions,
          onPromotionTap: onPromotionTap,
        ),
      ),
    ),
  );
}

void main() {
  test('home screen wires promotion banners between chat and notices', () {
    final source = _readSource('lib/screens/user/home_screen.dart');

    expect(
      source,
      contains("import '../../services/promotion_service.dart';"),
    );
    expect(source, contains("import '../../models/promotion_model.dart';"));
    expect(source, contains("import '../../widgets/promotion_carousel.dart';"));
    expect(source, contains("import 'promotion_detail_screen.dart';"));
    expect(
      source,
      contains(
          'final PromotionService _promotionService = PromotionService();'),
    );
    expect(source, contains('List<PromotionModel> _promotions = [];'));
    expect(source, contains('Future<void> _loadPromotions() async'));
    expect(source, contains('_loadPromotions();'));

    final chatBannerIndex = source.indexOf('_ChatBanner(');
    final carouselIndex = source.indexOf('PromotionCarousel(');
    final noticeIndex = source.indexOf('_buildNoticeBanner()', carouselIndex);

    expect(chatBannerIndex, isNonNegative);
    expect(carouselIndex, greaterThan(chatBannerIndex));
    expect(noticeIndex, greaterThan(carouselIndex));
    expect(source, isNot(contains('_buildLogoSection(),')));
    expect(source, contains('height: 133'));
    expect(source, contains('fit: BoxFit.cover'));
    expect(
      source,
      contains('const SizedBox.shrink(), // placeholder (채팅은 Navigator로 이동)'),
    );
    expect(
      source,
      isNot(
          contains('_buildHomeContent(), // placeholder (채팅은 Navigator로 이동)')),
    );
  });

  test('promotion carousel source contains auto-scrolling image carousel', () {
    final source = _readSource('lib/widgets/promotion_carousel.dart');

    expect(source, contains('PageView.builder'));
    expect(source, contains('Timer.periodic'));
    expect(source, contains('const Duration(seconds: 5)'));
    expect(source, contains('promotions.length > 1'));
    expect(source, contains('CachedNetworkImage'));
    expect(source, contains('onPromotionTap'));
  });

  test('promotion detail source renders HTML and optional external CTA', () {
    final source = _readSource('lib/screens/user/promotion_detail_screen.dart');

    expect(source, contains('class PromotionDetailScreen'));
    expect(source, contains('Html('));
    expect(source, contains('launchUrl('));
    expect(source, contains('LaunchMode.externalApplication'));
    expect(source, contains('promotion.externalLinkLabel'));
    expect(source, contains('promotion.hasExternalLink'));
  });

  test('promotion detail normalizes external CTA URLs before launching', () {
    final source = _readSource('lib/screens/user/promotion_detail_screen.dart');

    expect(source, contains('_normalizePromotionExternalUrl'));
    expect(source, contains('final trimmedUrl = url?.trim() ?? \'\';'));
    expect(source, contains('final uri = Uri.tryParse(trimmedUrl);'));
    expect(source, contains('!uri.hasScheme'));
    expect(source, contains('uri.host.isEmpty'));
    expect(source, contains("uri.scheme == 'https' || uri.scheme == 'http'"));
    expect(
      source,
      contains(
          'final uri = _normalizePromotionExternalUrl(promotion.externalLinkUrl);'),
    );
    expect(source, contains('if (uri == null)'));
    expect(source, contains('launchUrl(\n        uri,'));
  });

  test('promotion model treats invalid external CTA URLs as unavailable', () {
    final validPromotion = _promotion(
      id: 'valid-link',
      externalLinkUrl: 'https://book.example.com/path',
    );
    final invalidPromotion = _promotion(
      id: 'invalid-link',
      externalLinkUrl: 'javascript:alert(1)',
    );

    expect(validPromotion.hasExternalLink, isTrue);
    expect(invalidPromotion.hasExternalLink, isFalse);
  });

  test('promotion detail source hardens rendered HTML tags and links', () {
    final source = _readSource('lib/screens/user/promotion_detail_screen.dart');

    expect(source, contains('const _allowedPromotionHtmlTags = <String>{'));
    expect(source, contains('const _blockedPromotionHtmlTags = <String>{'));
    for (final tag in ['script', 'style', 'iframe', 'object', 'embed']) {
      expect(source, contains("'$tag'"));
    }
    expect(source, contains('onlyRenderTheseTags: _allowedPromotionHtmlTags'));
    expect(source, contains('doNotRenderTheseTags: _blockedPromotionHtmlTags'));
    expect(source, contains('onLinkTap: (url, attributes, element)'));
    expect(source, contains('_openPromotionHtmlLink(context, url);'));
  });

  test('promotion detail validates HTML media URLs before rendering images', () {
    final source = _readSource('lib/screens/user/promotion_detail_screen.dart');

    expect(source, contains('_normalizePromotionMediaOrLinkUrl'));
    expect(source, contains('final normalizedSrc = _normalizePromotionMediaOrLinkUrl(src);'));
    expect(source, contains('if (normalizedSrc == null)'));
    expect(source, contains('return const SizedBox.shrink();'));
    expect(source, contains('imageUrl: normalizedSrc.toString()'));
    expect(source, contains('!uri.hasScheme'));
    expect(source, contains('uri.host.isEmpty'));
    expect(source, contains("uri.scheme == 'https' || uri.scheme == 'http'"));
  });

  test('promotion detail rejects unsafe HTML link taps', () {
    final source = _readSource('lib/screens/user/promotion_detail_screen.dart');

    expect(source, contains('Future<void> _openPromotionHtmlLink('));
    expect(source, contains('final uri = _normalizePromotionMediaOrLinkUrl(url);'));
    expect(source, contains('if (uri == null) return;'));
    expect(source, contains('LaunchMode.externalApplication'));
  });

  testWidgets('promotion carousel renders no banner image when empty',
      (tester) async {
    await _pumpCarousel(
      tester,
      promotions: const [],
      onPromotionTap: (_) {},
    );

    expect(find.byType(CachedNetworkImage), findsNothing);

    final shrink = tester.widget<SizedBox>(find.byType(SizedBox).first);
    expect(shrink.width, 0);
    expect(shrink.height, 0);
  });

  testWidgets('promotion carousel renders one tappable banner', (tester) async {
    final promotion = _promotion(id: 'single', title: '싱글 프로모션');
    PromotionModel? tappedPromotion;

    await _pumpCarousel(
      tester,
      promotions: [promotion],
      onPromotionTap: (value) {
        tappedPromotion = value;
      },
    );

    expect(find.byType(CachedNetworkImage), findsOneWidget);
    expect(
      find.descendant(
        of: find.byType(PromotionCarousel),
        matching: find.byType(GestureDetector),
      ),
      findsOneWidget,
    );

    await tester.tap(find.byType(CachedNetworkImage));

    expect(tappedPromotion, same(promotion));
  });

  testWidgets('promotion detail hides invalid external CTA', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        home: PromotionDetailScreen(
          promotion: _promotion(
            id: 'invalid-cta',
            externalLinkUrl: 'ftp://book.example.com',
            externalLinkLabel: '도서 구매하기',
          ),
        ),
      ),
    );

    expect(find.text('도서 구매하기'), findsNothing);
  });

  testWidgets('promotion carousel renders dots for multiple promotions',
      (tester) async {
    await _pumpCarousel(
      tester,
      promotions: [
        _promotion(id: 'first', title: '첫 번째 프로모션'),
        _promotion(id: 'second', title: '두 번째 프로모션'),
        _promotion(id: 'third', title: '세 번째 프로모션'),
      ],
      onPromotionTap: (_) {},
    );

    expect(find.byType(CachedNetworkImage), findsOneWidget);
    expect(find.byType(AnimatedContainer), findsNWidgets(3));

    await tester.pump(const Duration(milliseconds: 20));
    await tester.pumpWidget(const SizedBox.shrink());
  });
}
