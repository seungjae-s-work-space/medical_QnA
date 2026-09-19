import 'dart:async';

import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';

import '../design/app_radii.dart';
import '../design/app_spacing.dart';
import '../models/promotion_model.dart';
import '../utils/app_colors.dart';

class PromotionCarousel extends StatefulWidget {
  final List<PromotionModel> promotions;
  final ValueChanged<PromotionModel> onPromotionTap;

  const PromotionCarousel({
    super.key,
    required this.promotions,
    required this.onPromotionTap,
  });

  @override
  State<PromotionCarousel> createState() => _PromotionCarouselState();
}

class _PromotionCarouselState extends State<PromotionCarousel> {
  static const double _bannerHeight = 96;

  final PageController _pageController = PageController();
  Timer? _autoScrollTimer;
  int _currentPage = 0;

  @override
  void initState() {
    super.initState();
    _restartAutoScroll();
  }

  @override
  void didUpdateWidget(covariant PromotionCarousel oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.promotions.length != widget.promotions.length) {
      _currentPage = 0;
      if (_pageController.hasClients && widget.promotions.isNotEmpty) {
        _pageController.jumpToPage(0);
      }
      _restartAutoScroll();
    }
  }

  @override
  void dispose() {
    _autoScrollTimer?.cancel();
    _pageController.dispose();
    super.dispose();
  }

  void _restartAutoScroll() {
    _autoScrollTimer?.cancel();
    final promotions = widget.promotions;
    if (promotions.length > 1) {
      _autoScrollTimer = Timer.periodic(const Duration(seconds: 5), (_) {
        if (!mounted || !_pageController.hasClients) return;

        final nextPage = (_currentPage + 1) % widget.promotions.length;
        _pageController.animateToPage(
          nextPage,
          duration: const Duration(milliseconds: 280),
          curve: Curves.easeInOut,
        );
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final promotions = widget.promotions;
    if (promotions.isEmpty) {
      return const SizedBox.shrink();
    }

    final hasMultiplePromotions = promotions.length > 1;

    return SizedBox(
      height: hasMultiplePromotions ? 114 : _bannerHeight,
      child: Column(
        children: [
          SizedBox(
            height: _bannerHeight,
            child: PageView.builder(
              controller: _pageController,
              itemCount: promotions.length,
              onPageChanged: (index) {
                setState(() {
                  _currentPage = index;
                });
              },
              itemBuilder: (context, index) {
                final promotion = promotions[index];
                return _PromotionBanner(
                  promotion: promotion,
                  onTap: () => widget.onPromotionTap(promotion),
                );
              },
            ),
          ),
          if (hasMultiplePromotions) ...[
            const SizedBox(height: AppSpacing.xs),
            _PromotionDots(
              count: promotions.length,
              currentIndex: _currentPage,
            ),
          ],
        ],
      ),
    );
  }
}

class _PromotionBanner extends StatelessWidget {
  final PromotionModel promotion;
  final VoidCallback onTap;

  const _PromotionBanner({
    required this.promotion,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      label: promotion.title,
      child: GestureDetector(
        onTap: onTap,
        child: ClipRRect(
          borderRadius: BorderRadius.circular(AppRadii.md),
          child: DecoratedBox(
            decoration: BoxDecoration(
              color: AppColors.surfaceMuted,
              borderRadius: BorderRadius.circular(AppRadii.md),
              border: Border.all(color: AppColors.border),
            ),
            child: CachedNetworkImage(
              imageUrl: promotion.bannerImageUrl,
              width: double.infinity,
              height: double.infinity,
              fit: BoxFit.cover,
              placeholder: (context, url) => const ColoredBox(
                color: AppColors.surfaceMuted,
                child: Center(
                  child: SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  ),
                ),
              ),
              errorWidget: (context, url, error) => const ColoredBox(
                color: AppColors.surfaceTint,
                child: Center(
                  child: Icon(
                    Icons.image_not_supported_outlined,
                    color: AppColors.textTertiary,
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _PromotionDots extends StatelessWidget {
  final int count;
  final int currentIndex;

  const _PromotionDots({
    required this.count,
    required this.currentIndex,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: List.generate(count, (index) {
        final isActive = index == currentIndex;
        return AnimatedContainer(
          duration: const Duration(milliseconds: 180),
          width: isActive ? 14 : 6,
          height: 6,
          margin: const EdgeInsets.symmetric(horizontal: 3),
          decoration: BoxDecoration(
            color: isActive ? AppColors.accent : AppColors.borderStrong,
            borderRadius: BorderRadius.circular(AppRadii.pill),
          ),
        );
      }),
    );
  }
}
