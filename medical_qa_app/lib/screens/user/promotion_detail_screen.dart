import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_html/flutter_html.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../design/app_radii.dart';
import '../../design/app_spacing.dart';
import '../../models/promotion_model.dart';
import '../../utils/app_colors.dart';

const _allowedPromotionHtmlTags = <String>{
  'html',
  'body',
  'a',
  'b',
  'blockquote',
  'br',
  'div',
  'em',
  'figcaption',
  'figure',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'i',
  'img',
  'li',
  'ol',
  'p',
  's',
  'span',
  'strong',
  'table',
  'tbody',
  'td',
  'th',
  'thead',
  'tr',
  'u',
  'ul',
};

const _blockedPromotionHtmlTags = <String>{
  'script',
  'style',
  'iframe',
  'object',
  'embed',
};

Uri? _normalizePromotionMediaOrLinkUrl(String? url) {
  return _normalizePromotionExternalUrl(url);
}

Uri? _normalizePromotionExternalUrl(String? url) {
  final trimmedUrl = url?.trim() ?? '';
  if (trimmedUrl.isEmpty) return null;

  final uri = Uri.tryParse(trimmedUrl);
  if (uri == null || !uri.hasScheme || uri.host.isEmpty) {
    return null;
  }

  if (!(uri.scheme == 'https' || uri.scheme == 'http')) {
    return null;
  }

  return uri;
}

Future<void> _openPromotionHtmlLink(
  BuildContext context,
  String? url,
) async {
  final uri = _normalizePromotionMediaOrLinkUrl(url);
  if (uri == null) return;

  try {
    await launchUrl(
      uri,
      mode: LaunchMode.externalApplication,
    );
  } catch (_) {
    if (!context.mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('외부 페이지를 열 수 없습니다.')),
    );
  }
}

class PromotionDetailScreen extends StatelessWidget {
  final PromotionModel promotion;

  const PromotionDetailScreen({
    super.key,
    required this.promotion,
  });

  Future<void> _openExternalLink(BuildContext context) async {
    final messenger = ScaffoldMessenger.of(context);
    final uri = _normalizePromotionExternalUrl(promotion.externalLinkUrl);
    if (uri == null) {
      messenger.showSnackBar(
        const SnackBar(content: Text('외부 페이지를 열 수 없습니다.')),
      );
      return;
    }

    try {
      final launched = await launchUrl(
        uri,
        mode: LaunchMode.externalApplication,
      );
      if (!launched) {
        messenger.showSnackBar(
          const SnackBar(content: Text('외부 페이지를 열 수 없습니다.')),
        );
      }
    } catch (_) {
      messenger.showSnackBar(
        const SnackBar(content: Text('외부 페이지를 열 수 없습니다.')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final summary = promotion.summary.trim();

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.background,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: AppColors.textPrimary),
          onPressed: () => Navigator.pop(context),
        ),
        title: const Text(
          '프로모션',
          style: TextStyle(
            color: AppColors.textPrimary,
            fontSize: 20,
            fontWeight: FontWeight.w600,
          ),
        ),
        centerTitle: true,
      ),
      body: Column(
        children: [
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.fromLTRB(
                AppSpacing.lg,
                AppSpacing.md,
                AppSpacing.lg,
                AppSpacing.xl,
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  ClipRRect(
                    borderRadius: BorderRadius.circular(AppRadii.md),
                    child: CachedNetworkImage(
                      imageUrl: promotion.bannerImageUrl,
                      width: double.infinity,
                      height: 180,
                      fit: BoxFit.cover,
                      placeholder: (context, url) => const ColoredBox(
                        color: AppColors.surfaceMuted,
                        child: SizedBox(
                          height: 180,
                          child: Center(
                            child: CircularProgressIndicator(strokeWidth: 2),
                          ),
                        ),
                      ),
                      errorWidget: (context, url, error) => const ColoredBox(
                        color: AppColors.surfaceTint,
                        child: SizedBox(
                          height: 180,
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
                  const SizedBox(height: AppSpacing.xl),
                  Text(
                    promotion.title,
                    style: const TextStyle(
                      fontSize: 24,
                      fontWeight: FontWeight.bold,
                      color: AppColors.textPrimary,
                      height: 1.35,
                    ),
                  ),
                  if (summary.isNotEmpty) ...[
                    const SizedBox(height: AppSpacing.sm),
                    Text(
                      summary,
                      style: const TextStyle(
                        fontSize: 16,
                        color: AppColors.textSecondary,
                        height: 1.55,
                      ),
                    ),
                  ],
                  const SizedBox(height: AppSpacing.xl),
                  const Divider(color: AppColors.divider),
                  const SizedBox(height: AppSpacing.lg),
                  Html(
                    data: promotion.contentHtml,
                    onlyRenderTheseTags: _allowedPromotionHtmlTags,
                    doNotRenderTheseTags: _blockedPromotionHtmlTags,
                    onLinkTap: (url, attributes, element) {
                      _openPromotionHtmlLink(context, url);
                    },
                    extensions: [
                      TagExtension(
                        tagsToExtend: {"img"},
                        builder: (extensionContext) {
                          final src = extensionContext.attributes['src'];
                          final normalizedSrc = _normalizePromotionMediaOrLinkUrl(src);
                          if (normalizedSrc == null) {
                            return const SizedBox.shrink();
                          }
                          return Padding(
                            padding: const EdgeInsets.symmetric(
                              vertical: AppSpacing.sm,
                            ),
                            child: ClipRRect(
                              borderRadius: BorderRadius.circular(AppRadii.sm),
                              child: CachedNetworkImage(
                                imageUrl: normalizedSrc.toString(),
                                width: double.infinity,
                                fit: BoxFit.contain,
                                placeholder: (context, url) => Container(
                                  height: 180,
                                  color: AppColors.surfaceMuted,
                                  child: const Center(
                                    child: CircularProgressIndicator(
                                      strokeWidth: 2,
                                    ),
                                  ),
                                ),
                                errorWidget: (context, url, error) => Container(
                                  height: 100,
                                  color: AppColors.surfaceTint,
                                  child: const Center(
                                    child: Icon(
                                      Icons.image_not_supported_outlined,
                                      color: AppColors.textTertiary,
                                    ),
                                  ),
                                ),
                              ),
                            ),
                          );
                        },
                      ),
                    ],
                    style: {
                      "body": Style(
                        fontSize: FontSize(16),
                        color: AppColors.textPrimary,
                        lineHeight: const LineHeight(1.6),
                        margin: Margins.zero,
                        padding: HtmlPaddings.zero,
                      ),
                      "p": Style(
                        margin: Margins.only(bottom: 12),
                      ),
                      "strong": Style(
                        fontWeight: FontWeight.bold,
                      ),
                      "em": Style(
                        fontStyle: FontStyle.italic,
                      ),
                      "h1": Style(
                        fontSize: FontSize(24),
                        fontWeight: FontWeight.bold,
                        margin: Margins.only(top: 24, bottom: 12),
                      ),
                      "h2": Style(
                        fontSize: FontSize(22),
                        fontWeight: FontWeight.bold,
                        margin: Margins.only(top: 22, bottom: 10),
                      ),
                      "h3": Style(
                        fontSize: FontSize(20),
                        fontWeight: FontWeight.w600,
                        margin: Margins.only(top: 20, bottom: 8),
                      ),
                    },
                  ),
                ],
              ),
            ),
          ),
          if (promotion.hasExternalLink)
            SafeArea(
              top: false,
              child: Container(
                width: double.infinity,
                padding: const EdgeInsets.fromLTRB(
                  AppSpacing.lg,
                  AppSpacing.sm,
                  AppSpacing.lg,
                  AppSpacing.lg,
                ),
                decoration: const BoxDecoration(
                  color: AppColors.background,
                  border: Border(
                    top: BorderSide(color: AppColors.border),
                  ),
                ),
                child: SizedBox(
                  width: double.infinity,
                  height: 52,
                  child: ElevatedButton.icon(
                    onPressed: () => _openExternalLink(context),
                    icon: const Icon(Icons.open_in_new, size: 18),
                    label: Text(promotion.externalLinkLabel),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.accent,
                      foregroundColor: AppColors.textInverse,
                      elevation: 0,
                      textStyle: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                      ),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(AppRadii.pill),
                      ),
                    ),
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}
