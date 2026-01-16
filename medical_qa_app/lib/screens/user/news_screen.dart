import 'package:flutter/material.dart';
import 'package:flutter_html/flutter_html.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../../models/news_model.dart';
import '../../services/news_service.dart';
import '../../utils/app_colors.dart';
import 'package:intl/intl.dart';

class NewsScreen extends StatefulWidget {
  const NewsScreen({super.key});

  @override
  State<NewsScreen> createState() => _NewsScreenState();
}

class _NewsScreenState extends State<NewsScreen> {
  final NewsService _service = NewsService();

  @override
  Widget build(BuildContext context) {
    return StreamBuilder<List<NewsModel>>(
      stream: _service.getPublishedNews(),
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Center(child: CircularProgressIndicator());
        }

        if (snapshot.hasError) {
          debugPrint('News Error: ${snapshot.error}');
          return Center(
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Text(
                '오류가 발생했습니다: ${snapshot.error}',
                textAlign: TextAlign.center,
              ),
            ),
          );
        }

        final newsList = snapshot.data ?? [];

        if (newsList.isEmpty) {
          return const Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(
                  Icons.newspaper_outlined,
                  size: 64,
                  color: AppColors.textSecondary,
                ),
                SizedBox(height: 16),
                Text(
                  '등록된 뉴스가 없습니다',
                  style: TextStyle(
                    fontSize: 16,
                    color: AppColors.textSecondary,
                  ),
                ),
              ],
            ),
          );
        }

        return ListView.separated(
          padding: const EdgeInsets.all(16),
          itemCount: newsList.length,
          separatorBuilder: (_, __) => const SizedBox(height: 12),
          itemBuilder: (context, index) {
            final news = newsList[index];
            return _NewsCard(
              news: news,
              onTap: () => _openNewsDetail(news),
            );
          },
        );
      },
    );
  }

  void _openNewsDetail(NewsModel news) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => NewsDetailScreen(news: news),
      ),
    );
  }
}

class _NewsCard extends StatelessWidget {
  final NewsModel news;
  final VoidCallback onTap;

  const _NewsCard({
    required this.news,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: const Color(0xFFFAFAFA),
          borderRadius: BorderRadius.circular(20),
        ),
        child: Row(
          children: [
            // 썸네일
            if (news.imageUrl != null) ...[
              ClipRRect(
                borderRadius: BorderRadius.circular(8),
                child: CachedNetworkImage(
                  imageUrl: news.imageUrl!,
                  width: 80,
                  height: 80,
                  fit: BoxFit.cover,
                  memCacheHeight: 160,
                  memCacheWidth: 160,
                  placeholder: (context, url) => Container(
                    width: 80,
                    height: 80,
                    color: AppColors.divider,
                    child: const Center(
                      child: SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      ),
                    ),
                  ),
                  errorWidget: (context, url, error) => Container(
                    width: 80,
                    height: 80,
                    color: AppColors.divider,
                    child: const Icon(
                      Icons.image_not_supported,
                      color: AppColors.textSecondary,
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 12),
            ],
            // 내용
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // 제목
                  Text(
                    news.title,
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                      color: AppColors.textPrimary,
                    ),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 8),
                  // 날짜
                  Text(
                    DateFormat('yyyy.MM.dd').format(news.createdAt),
                    style: const TextStyle(
                      fontSize: 12,
                      color: AppColors.textSecondary,
                    ),
                  ),
                ],
              ),
            ),
            Container(
              width: 32,
              height: 32,
              decoration: const BoxDecoration(
                color: Color(0xFFD4E8F0),
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.chevron_right,
                color: Color(0xFF5B8BA8),
                size: 20,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// HTML 정리 함수 - 빈 태그 제거 및 연속 blockquote 병합
String _cleanHtmlContent(String html) {
  if (html.isEmpty) return html;

  String cleaned = html;

  // 빈 p 태그 제거 (공백, <br>, &nbsp; 만 있는 경우)
  cleaned = cleaned.replaceAllMapped(
    RegExp(r'<p[^>]*>\s*(<br\s*/?>|\s|&nbsp;)*\s*</p>', caseSensitive: false),
    (match) => '',
  );

  // 빈 blockquote 제거
  cleaned = cleaned.replaceAllMapped(
    RegExp(r'<blockquote[^>]*>\s*(<br\s*/?>|\s|&nbsp;)*\s*</blockquote>', caseSensitive: false),
    (match) => '',
  );

  // 연속된 blockquote 병합 (</blockquote><blockquote> -> <br>)
  cleaned = cleaned.replaceAllMapped(
    RegExp(r'</blockquote>\s*<blockquote[^>]*>', caseSensitive: false),
    (match) => '<br>',
  );

  return cleaned;
}

// 상세 화면
class NewsDetailScreen extends StatelessWidget {
  final NewsModel news;

  const NewsDetailScreen({super.key, required this.news});

  @override
  Widget build(BuildContext context) {
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
          '난임뉴스',
          style: TextStyle(
            color: AppColors.textPrimary,
            fontSize: 18,
            fontWeight: FontWeight.w600,
          ),
        ),
        centerTitle: true,
      ),
      body: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // 헤더 이미지
            if (news.imageUrl != null)
              CachedNetworkImage(
                imageUrl: news.imageUrl!,
                width: double.infinity,
                height: 200,
                fit: BoxFit.cover,
                placeholder: (context, url) => Container(
                  height: 200,
                  color: AppColors.divider,
                  child: const Center(
                    child: CircularProgressIndicator(),
                  ),
                ),
                errorWidget: (context, url, error) => Container(
                  height: 200,
                  color: AppColors.divider,
                  child: const Center(
                    child: Icon(
                      Icons.image_not_supported,
                      size: 48,
                      color: AppColors.textSecondary,
                    ),
                  ),
                ),
              ),
            Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // 제목
                  Text(
                    news.title,
                    style: const TextStyle(
                      fontSize: 22,
                      fontWeight: FontWeight.bold,
                      color: AppColors.textPrimary,
                      height: 1.4,
                    ),
                  ),
                  const SizedBox(height: 12),
                  // 작성자 및 날짜
                  Row(
                    children: [
                      Text(
                        news.authorName,
                        style: const TextStyle(
                          fontSize: 13,
                          color: AppColors.textSecondary,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Text(
                        '·',
                        style: TextStyle(
                          color: AppColors.textSecondary.withValues(alpha: 0.5),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Text(
                        DateFormat('yyyy년 M월 d일').format(news.createdAt),
                        style: const TextStyle(
                          fontSize: 13,
                          color: AppColors.textSecondary,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 24),
                  const Divider(color: AppColors.divider),
                  const SizedBox(height: 24),
                  // 본문 (HTML 렌더링)
                  Html(
                    data: _cleanHtmlContent(news.content),
                    extensions: [
                      TagExtension(
                        tagsToExtend: {"img"},
                        builder: (extensionContext) {
                          final src = extensionContext.attributes['src'];
                          if (src == null || src.isEmpty) {
                            return const SizedBox.shrink();
                          }
                          return Padding(
                            padding: const EdgeInsets.symmetric(vertical: 12),
                            child: ClipRRect(
                              borderRadius: BorderRadius.circular(8),
                              child: CachedNetworkImage(
                                imageUrl: src,
                                width: double.infinity,
                                fit: BoxFit.contain,
                                placeholder: (context, url) => Container(
                                  height: 200,
                                  color: AppColors.divider,
                                  child: const Center(
                                    child: CircularProgressIndicator(),
                                  ),
                                ),
                                errorWidget: (context, url, error) => Container(
                                  height: 100,
                                  color: AppColors.divider,
                                  child: const Center(
                                    child: Icon(
                                      Icons.image_not_supported,
                                      color: AppColors.textSecondary,
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
                      "blockquote": Style(
                        backgroundColor: const Color(0xFFEEF2FF),
                        border: const Border(
                          left: BorderSide(
                            color: Color(0xFF6366F1),
                            width: 4,
                          ),
                        ),
                        padding: HtmlPaddings.symmetric(horizontal: 16, vertical: 8),
                        margin: Margins.symmetric(vertical: 8),
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
                        fontSize: FontSize(20),
                        fontWeight: FontWeight.bold,
                        margin: Margins.only(top: 20, bottom: 10),
                      ),
                      "h3": Style(
                        fontSize: FontSize(18),
                        fontWeight: FontWeight.w600,
                        margin: Margins.only(top: 16, bottom: 8),
                      ),
                      "ul": Style(
                        margin: Margins.only(left: 16, bottom: 16),
                      ),
                      "ol": Style(
                        margin: Margins.only(left: 16, bottom: 16),
                      ),
                      "li": Style(
                        margin: Margins.only(bottom: 4),
                      ),
                    },
                  ),
                  const SizedBox(height: 40),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
