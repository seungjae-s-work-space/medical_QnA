import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

String _readSource(String path) {
  final file = File(path);
  return file.existsSync() ? file.readAsStringSync() : '';
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
}
