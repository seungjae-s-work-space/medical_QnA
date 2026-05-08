import 'package:flutter/material.dart';
import 'package:flutter_html/flutter_html.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../models/news_model.dart';
import '../../services/news_service.dart';
import '../../utils/app_colors.dart';
import '../../widgets/protected_content.dart';
import '../../widgets/screenshot_warning_listener.dart';
import 'package:intl/intl.dart';

class NewsScreen extends StatefulWidget {
  const NewsScreen({super.key});

  @override
  State<NewsScreen> createState() => _NewsScreenState();
}

class _NewsScreenState extends State<NewsScreen> {
  final NewsService _service = NewsService();
  final TextEditingController _searchController = TextEditingController();
  final ScrollController _scrollController = ScrollController();

  static const int _itemsPerPage = 5;
  int _currentPage = 0;
  List<NewsModel> _newsList = [];
  bool _isLoading = true;

  final List<int> _matchedIndices = [];
  int _currentMatchIndex = 0;
  String _searchQuery = '';
  bool _isSearching = false;
  bool _isOpeningNews = false;

  final Map<int, GlobalKey> _itemKeys = {};

  @override
  void initState() {
    super.initState();
    _loadNews();
  }

  Future<void> _loadNews() async {
    final news = await _service.getPublishedNews();
    if (mounted) {
      setState(() {
        _newsList = news;
        _isLoading = false;
        final totalPages = (_newsList.length / _itemsPerPage).ceil();
        if (_currentPage >= totalPages && totalPages > 0) {
          _currentPage = totalPages - 1;
        }
      });
    }
  }

  @override
  void dispose() {
    _searchController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  void _changePage(int page) {
    setState(() {
      _currentPage = page;
    });
  }

  void _performSearch(String query) {
    setState(() {
      _searchQuery = query.toLowerCase().trim();
      _matchedIndices.clear();
      _currentMatchIndex = 0;

      if (_searchQuery.isNotEmpty) {
        for (int i = 0; i < _newsList.length; i++) {
          final news = _newsList[i];
          if (news.title.toLowerCase().contains(_searchQuery) ||
              news.content.toLowerCase().contains(_searchQuery)) {
            _matchedIndices.add(i);
          }
        }
        if (_matchedIndices.isNotEmpty) {
          _scrollToMatch(0);
        }
      }
    });
  }

  void _scrollToMatch(int matchIndex) {
    if (_matchedIndices.isEmpty) return;

    final newsIndex = _matchedIndices[matchIndex];
    final targetPage = newsIndex ~/ _itemsPerPage;

    setState(() {
      _currentMatchIndex = matchIndex;
      if (_currentPage != targetPage) {
        _currentPage = targetPage;
      }
    });

    WidgetsBinding.instance.addPostFrameCallback((_) {
      final key = _itemKeys[newsIndex];
      if (key?.currentContext != null) {
        Scrollable.ensureVisible(
          key!.currentContext!,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeInOut,
          alignment: 0.3,
        );
      }
    });
  }

  void _goToPreviousMatch() {
    if (_matchedIndices.isEmpty) return;
    final newIndex = (_currentMatchIndex - 1 + _matchedIndices.length) %
        _matchedIndices.length;
    _scrollToMatch(newIndex);
  }

  void _goToNextMatch() {
    if (_matchedIndices.isEmpty) return;
    final newIndex = (_currentMatchIndex + 1) % _matchedIndices.length;
    _scrollToMatch(newIndex);
  }

  void _clearSearch() {
    setState(() {
      _searchController.clear();
      _searchQuery = '';
      _matchedIndices.clear();
      _currentMatchIndex = 0;
      _isSearching = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        // 검색 바
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
          child: Row(
            children: [
              Expanded(
                child: Container(
                  height: 48,
                  clipBehavior: Clip.antiAlias,
                  decoration: BoxDecoration(
                    color: AppColors.inputBackground,
                    borderRadius: BorderRadius.circular(24),
                  ),
                  child: TextField(
                    controller: _searchController,
                    cursorColor: AppColors.newsTone,
                    onChanged: (value) {
                      setState(() => _isSearching = value.isNotEmpty);
                      _performSearch(value);
                    },
                    decoration: InputDecoration(
                      filled: false,
                      hintText: '키워드 검색',
                      hintStyle: const TextStyle(
                        color: AppColors.textTertiary,
                        fontSize: 16,
                      ),
                      prefixIcon: const Icon(
                        Icons.search,
                        color: AppColors.newsTone,
                        size: 20,
                      ),
                      suffixIcon: _isSearching
                          ? IconButton(
                              icon: const Icon(Icons.close, size: 18),
                              color: AppColors.newsTone,
                              onPressed: _clearSearch,
                            )
                          : null,
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(24),
                        borderSide: const BorderSide(
                          color: Colors.transparent,
                          width: 1.4,
                        ),
                      ),
                      focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(24),
                        borderSide: const BorderSide(
                          color: AppColors.newsTone,
                          width: 1.4,
                        ),
                      ),
                      disabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(24),
                        borderSide: const BorderSide(
                          color: Colors.transparent,
                          width: 1.4,
                        ),
                      ),
                      errorBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(24),
                        borderSide: const BorderSide(
                          color: AppColors.error,
                          width: 1.4,
                        ),
                      ),
                      focusedErrorBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(24),
                        borderSide: const BorderSide(
                          color: AppColors.error,
                          width: 1.4,
                        ),
                      ),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(24),
                        borderSide: const BorderSide(
                          color: Colors.transparent,
                          width: 1.4,
                        ),
                      ),
                      contentPadding: const EdgeInsets.symmetric(
                        horizontal: 16,
                        vertical: 12,
                      ),
                    ),
                  ),
                ),
              ),
              // 검색 결과 네비게이션
              if (_matchedIndices.isNotEmpty) ...[
                const SizedBox(width: 8),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: AppColors.newsSurfaceSoft,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    '${_currentMatchIndex + 1}/${_matchedIndices.length}',
                    style: const TextStyle(
                      fontSize: 15,
                      color: AppColors.newsTone,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
                const SizedBox(width: 4),
                GestureDetector(
                  onTap: _goToPreviousMatch,
                  child: Container(
                    width: 36,
                    height: 36,
                    decoration: const BoxDecoration(
                      color: AppColors.newsSurfaceSoft,
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(
                      Icons.keyboard_arrow_up,
                      size: 22,
                      color: AppColors.newsTone,
                    ),
                  ),
                ),
                const SizedBox(width: 4),
                GestureDetector(
                  onTap: _goToNextMatch,
                  child: Container(
                    width: 36,
                    height: 36,
                    decoration: const BoxDecoration(
                      color: AppColors.newsSurfaceSoft,
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(
                      Icons.keyboard_arrow_down,
                      size: 22,
                      color: AppColors.newsTone,
                    ),
                  ),
                ),
              ],
            ],
          ),
        ),
        // 뉴스 목록
        Expanded(
          child: _buildNewsList(),
        ),
      ],
    );
  }

  Widget _buildNewsList() {
    if (_isLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    if (_newsList.isEmpty) {
      return const Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.newspaper_outlined,
                size: 64, color: AppColors.textSecondary),
            SizedBox(height: 16),
            Text('등록된 뉴스가 없습니다',
                style: TextStyle(fontSize: 18, color: AppColors.textSecondary)),
          ],
        ),
      );
    }

    final totalPages = (_newsList.length / _itemsPerPage).ceil();
    final startIndex = _currentPage * _itemsPerPage;
    final endIndex = (startIndex + _itemsPerPage).clamp(0, _newsList.length);
    final pageItems = _newsList.sublist(startIndex, endIndex);

    return Column(
      children: [
        Expanded(
          child: ListView.separated(
            key: ValueKey(_currentPage),
            controller: _scrollController,
            padding: const EdgeInsets.all(16),
            itemCount: pageItems.length,
            separatorBuilder: (_, __) => const SizedBox(height: 12),
            itemBuilder: (context, index) {
              final actualIndex = startIndex + index;
              _itemKeys[actualIndex] ??= GlobalKey();
              final news = pageItems[index];
              final isMatched = _matchedIndices.contains(actualIndex);
              final isCurrentMatch = _matchedIndices.isNotEmpty &&
                  _matchedIndices[_currentMatchIndex] == actualIndex;

              return _NewsCard(
                key: _itemKeys[actualIndex],
                news: news,
                searchQuery: _searchQuery,
                isHighlighted: isCurrentMatch,
                isMatched: isMatched,
                onTap: () => _openNewsDetail(news),
              );
            },
          ),
        ),
        if (totalPages > 1)
          _PaginationBar(
            currentPage: _currentPage,
            totalPages: totalPages,
            onPageChanged: _changePage,
          ),
      ],
    );
  }

  Future<void> _openNewsDetail(NewsModel news) async {
    if (_isOpeningNews) return;

    setState(() {
      _isOpeningNews = true;
    });

    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => NewsDetailScreen(news: news),
      ),
    );

    if (mounted) {
      setState(() {
        _isOpeningNews = false;
      });
    }
  }
}

class _NewsCard extends StatelessWidget {
  final NewsModel news;
  final String searchQuery;
  final bool isHighlighted;
  final bool isMatched;
  final VoidCallback onTap;

  const _NewsCard({
    super.key,
    required this.news,
    required this.searchQuery,
    required this.isHighlighted,
    required this.isMatched,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: isHighlighted
              ? AppColors.newsSurfaceSoft.withValues(alpha: 0.6)
              : isMatched
                  ? AppColors.newsSurfaceSoft.withValues(alpha: 0.3)
                  : AppColors.surfaceMuted,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: isHighlighted
                ? AppColors.newsTone
                : isMatched
                    ? AppColors.newsTone.withValues(alpha: 0.5)
                    : Colors.transparent,
            width: isHighlighted ? 2 : 1,
          ),
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
                  // 제목 (검색어 하이라이트)
                  _buildHighlightedText(
                    news.title,
                    searchQuery,
                    const TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w600,
                      color: AppColors.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 8),
                  // 날짜
                  Text(
                    DateFormat('yyyy.MM.dd').format(news.createdAt),
                    style: const TextStyle(
                      fontSize: 14,
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
                color: AppColors.newsSurfaceSoft,
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.chevron_right,
                color: AppColors.newsTone,
                size: 20,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildHighlightedText(String text, String query, TextStyle baseStyle) {
    if (query.isEmpty) {
      return Text(text,
          style: baseStyle, maxLines: 2, overflow: TextOverflow.ellipsis);
    }

    final lowerText = text.toLowerCase();
    final lowerQuery = query.toLowerCase();
    final spans = <TextSpan>[];
    int start = 0;

    while (true) {
      final index = lowerText.indexOf(lowerQuery, start);
      if (index == -1) {
        spans.add(TextSpan(text: text.substring(start)));
        break;
      }
      if (index > start) {
        spans.add(TextSpan(text: text.substring(start, index)));
      }
      spans.add(TextSpan(
        text: text.substring(index, index + query.length),
        style: const TextStyle(
          backgroundColor: AppColors.newsHighlight,
          fontWeight: FontWeight.bold,
        ),
      ));
      start = index + query.length;
    }

    return RichText(
      text: TextSpan(style: baseStyle, children: spans),
      maxLines: 2,
      overflow: TextOverflow.ellipsis,
    );
  }
}

// 페이지네이션 바 위젯
class _PaginationBar extends StatelessWidget {
  final int currentPage;
  final int totalPages;
  final ValueChanged<int> onPageChanged;

  const _PaginationBar({
    required this.currentPage,
    required this.totalPages,
    required this.onPageChanged,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.only(top: 16, bottom: 50, left: 16, right: 16),
      decoration: const BoxDecoration(
        color: Colors.white,
        border: Border(
          top: BorderSide(color: AppColors.divider, width: 1),
        ),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          // 이전 버튼
          _PageButton(
            icon: Icons.chevron_left,
            onTap:
                currentPage > 0 ? () => onPageChanged(currentPage - 1) : null,
          ),
          const SizedBox(width: 8),
          // 페이지 번호들
          ..._buildPageNumbers(),
          const SizedBox(width: 8),
          // 다음 버튼
          _PageButton(
            icon: Icons.chevron_right,
            onTap: currentPage < totalPages - 1
                ? () => onPageChanged(currentPage + 1)
                : null,
          ),
        ],
      ),
    );
  }

  List<Widget> _buildPageNumbers() {
    final List<Widget> widgets = [];
    const maxVisiblePages = 5;

    int startPage = 0;
    int endPage = totalPages;

    if (totalPages > maxVisiblePages) {
      startPage = (currentPage - 2).clamp(0, totalPages - maxVisiblePages);
      endPage = (startPage + maxVisiblePages).clamp(0, totalPages);
    }

    for (int i = startPage; i < endPage; i++) {
      widgets.add(
        GestureDetector(
          onTap: () => onPageChanged(i),
          child: Container(
            width: 36,
            height: 36,
            margin: const EdgeInsets.symmetric(horizontal: 4),
            decoration: BoxDecoration(
              color:
                  i == currentPage ? AppColors.textPrimary : Colors.transparent,
              borderRadius: BorderRadius.circular(8),
            ),
            child: Center(
              child: Text(
                '${i + 1}',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight:
                      i == currentPage ? FontWeight.w600 : FontWeight.normal,
                  color:
                      i == currentPage ? Colors.white : AppColors.textSecondary,
                ),
              ),
            ),
          ),
        ),
      );
    }
    return widgets;
  }
}

class _PageButton extends StatelessWidget {
  final IconData icon;
  final VoidCallback? onTap;

  const _PageButton({
    required this.icon,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final isEnabled = onTap != null;
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 36,
        height: 36,
        decoration: BoxDecoration(
          color: isEnabled ? AppColors.inputBackground : Colors.transparent,
          borderRadius: BorderRadius.circular(8),
        ),
        child: Icon(
          icon,
          size: 20,
          color: isEnabled ? AppColors.textPrimary : AppColors.divider,
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
    RegExp(r'<blockquote[^>]*>\s*(<br\s*/?>|\s|&nbsp;)*\s*</blockquote>',
        caseSensitive: false),
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
    return ScreenshotWarningListener(
      contentType: 'news',
      contentId: news.id,
      contentTitle: news.title,
      child: Scaffold(
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
              fontSize: 20,
              fontWeight: FontWeight.w600,
            ),
          ),
          centerTitle: true,
        ),
        body: SingleChildScrollView(
          child: ProtectedContent(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Padding(
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // 제목
                      Text(
                        news.title,
                        style: const TextStyle(
                          fontSize: 24,
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
                              fontSize: 15,
                              color: AppColors.textSecondary,
                            ),
                          ),
                          const SizedBox(width: 8),
                          Text(
                            '·',
                            style: TextStyle(
                              color: AppColors.textSecondary
                                  .withValues(alpha: 0.5),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Text(
                            DateFormat('yyyy년 M월 d일').format(news.createdAt),
                            style: const TextStyle(
                              fontSize: 15,
                              color: AppColors.textSecondary,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 24),
                      const Divider(color: AppColors.divider),
                      const SizedBox(height: 24),
                      // 본문 (HTML 렌더링)
                      // 출처 링크
                      if (news.sourceUrl != null &&
                          news.sourceUrl!.isNotEmpty) ...[
                        GestureDetector(
                          onTap: () async {
                            final messenger = ScaffoldMessenger.of(context);
                            final uri = Uri.parse(news.sourceUrl!);

                            try {
                              final launched = await launchUrl(
                                uri,
                                mode: LaunchMode.externalApplication,
                              );
                              if (!launched) {
                                messenger.showSnackBar(
                                  const SnackBar(
                                    content: Text('외부 페이지를 열 수 없습니다.'),
                                  ),
                                );
                              }
                            } catch (_) {
                              messenger.showSnackBar(
                                const SnackBar(
                                  content: Text('외부 페이지를 열 수 없습니다.'),
                                ),
                              );
                            }
                          },
                          child: Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 16, vertical: 12),
                            decoration: BoxDecoration(
                              color: AppColors.inputBackground,
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Row(
                              children: [
                                const Icon(
                                  Icons.link,
                                  size: 20,
                                  color: AppColors.newsTone,
                                ),
                                const SizedBox(width: 10),
                                Expanded(
                                  child: Text(
                                    news.sourceUrl!,
                                    style: const TextStyle(
                                      fontSize: 14,
                                      color: AppColors.newsTone,
                                      decoration: TextDecoration.underline,
                                    ),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ),
                                const Icon(
                                  Icons.open_in_new,
                                  size: 18,
                                  color: AppColors.newsTone,
                                ),
                              ],
                            ),
                          ),
                        ),
                        const SizedBox(height: 24),
                      ],
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
                                padding:
                                    const EdgeInsets.symmetric(vertical: 12),
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
                                    errorWidget: (context, url, error) =>
                                        Container(
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
                            backgroundColor: Colors.transparent,
                            border: const Border(
                              left: BorderSide(
                                color: AppColors.textPrimary,
                                width: 4,
                              ),
                            ),
                            padding: HtmlPaddings.symmetric(
                                horizontal: 16, vertical: 8),
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
        ),
      ),
    );
  }
}
