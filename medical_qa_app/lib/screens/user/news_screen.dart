import 'package:flutter/material.dart';
import 'package:flutter_html/flutter_html.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:provider/provider.dart';
import '../../models/news_model.dart';
import '../../services/news_service.dart';
import '../../utils/app_colors.dart';
import '../../providers/subscription_provider.dart';
import 'package:intl/intl.dart';
import 'subscription_screen.dart';

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

  List<int> _matchedIndices = [];
  int _currentMatchIndex = 0;
  String _searchQuery = '';
  bool _isSearching = false;

  final Map<int, GlobalKey> _itemKeys = {};

  @override
  void initState() {
    super.initState();
    _service.getPublishedNews().listen((news) {
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
    });
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
    final newIndex = (_currentMatchIndex - 1 + _matchedIndices.length) % _matchedIndices.length;
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

  void _showSubscriptionRequiredSheet() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (context) => Padding(
        padding: EdgeInsets.only(
          left: 24,
          right: 24,
          top: 24,
          bottom: MediaQuery.of(context).padding.bottom + 24,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: const Color(0xFFE0E0E0),
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            const SizedBox(height: 24),
            Container(
              width: 80,
              height: 80,
              decoration: BoxDecoration(
                color: const Color(0xFFF0D8E8),
                borderRadius: BorderRadius.circular(24),
              ),
              child: const Icon(
                Icons.workspace_premium,
                size: 40,
                color: Color(0xFFB87BA8),
              ),
            ),
            const SizedBox(height: 20),
            const Text(
              '이용권이 필요해요',
              style: TextStyle(
                fontSize: 22,
                fontWeight: FontWeight.bold,
                color: Color(0xFF333333),
              ),
            ),
            const SizedBox(height: 12),
            const Text(
              '뉴스를 보시려면\n이용권이 필요합니다.',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 16,
                color: Color(0xFF888888),
                height: 1.5,
              ),
            ),
            const SizedBox(height: 24),
            SizedBox(
              width: double.infinity,
              height: 56,
              child: ElevatedButton(
                onPressed: () {
                  Navigator.pop(context);
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (context) => const SubscriptionScreen(),
                    ),
                  );
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFFB87BA8),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(28),
                  ),
                  elevation: 0,
                ),
                child: const Text(
                  '이용권 구매하기',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                  ),
                ),
              ),
            ),
            const SizedBox(height: 12),
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text(
                '나중에 할게요',
                style: TextStyle(
                  fontSize: 16,
                  color: Color(0xFF888888),
                ),
              ),
            ),
          ],
        ),
      ),
    );
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
                  decoration: BoxDecoration(
                    color: const Color(0xFFF5F5F5),
                    borderRadius: BorderRadius.circular(24),
                  ),
                  child: TextField(
                    controller: _searchController,
                    onChanged: (value) {
                      setState(() => _isSearching = value.isNotEmpty);
                      _performSearch(value);
                    },
                    decoration: InputDecoration(
                      hintText: '키워드 검색',
                      hintStyle: const TextStyle(
                        color: AppColors.textTertiary,
                        fontSize: 16,
                      ),
                      prefixIcon: const Icon(
                        Icons.search,
                        color: AppColors.textSecondary,
                        size: 20,
                      ),
                      suffixIcon: _isSearching
                          ? IconButton(
                              icon: const Icon(Icons.close, size: 18),
                              color: AppColors.textSecondary,
                              onPressed: _clearSearch,
                            )
                          : null,
                      border: InputBorder.none,
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
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF5E6A3),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    '${_currentMatchIndex + 1}/${_matchedIndices.length}',
                    style: const TextStyle(
                      fontSize: 15,
                      color: Color(0xFFD4A853),
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
                      color: Color(0xFFF5E6A3),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(
                      Icons.keyboard_arrow_up,
                      size: 22,
                      color: Color(0xFFD4A853),
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
                      color: Color(0xFFF5E6A3),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(
                      Icons.keyboard_arrow_down,
                      size: 22,
                      color: Color(0xFFD4A853),
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
            Icon(Icons.newspaper_outlined, size: 64, color: AppColors.textSecondary),
            SizedBox(height: 16),
            Text('등록된 뉴스가 없습니다', style: TextStyle(fontSize: 18, color: AppColors.textSecondary)),
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

  void _openNewsDetail(NewsModel news) {
    final subscriptionProvider = Provider.of<SubscriptionProvider>(context, listen: false);
    if (!subscriptionProvider.hasActiveSubscription) {
      _showSubscriptionRequiredSheet();
      return;
    }
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
              ? const Color(0xFFF5E6A3).withValues(alpha: 0.6)
              : isMatched
                  ? const Color(0xFFF5E6A3).withValues(alpha: 0.3)
                  : const Color(0xFFFAFAFA),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: isHighlighted
                ? const Color(0xFFD4A853)
                : isMatched
                    ? const Color(0xFFD4A853).withValues(alpha: 0.5)
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

  Widget _buildHighlightedText(String text, String query, TextStyle baseStyle) {
    if (query.isEmpty) {
      return Text(text, style: baseStyle, maxLines: 2, overflow: TextOverflow.ellipsis);
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
          backgroundColor: Color(0xFFFFEB3B),
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
      padding: const EdgeInsets.only(top: 16, bottom: 100, left: 16, right: 16),
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
            onTap: currentPage > 0 ? () => onPageChanged(currentPage - 1) : null,
          ),
          const SizedBox(width: 8),
          // 페이지 번호들
          ..._buildPageNumbers(),
          const SizedBox(width: 8),
          // 다음 버튼
          _PageButton(
            icon: Icons.chevron_right,
            onTap: currentPage < totalPages - 1 ? () => onPageChanged(currentPage + 1) : null,
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
              color: i == currentPage ? AppColors.textPrimary : Colors.transparent,
              borderRadius: BorderRadius.circular(8),
            ),
            child: Center(
              child: Text(
                '${i + 1}',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: i == currentPage ? FontWeight.w600 : FontWeight.normal,
                  color: i == currentPage ? Colors.white : AppColors.textSecondary,
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
          color: isEnabled ? const Color(0xFFF5F5F5) : Colors.transparent,
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
            fontSize: 20,
            fontWeight: FontWeight.w600,
          ),
        ),
        centerTitle: true,
      ),
      body: SingleChildScrollView(
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
                          color: AppColors.textSecondary.withValues(alpha: 0.5),
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
                  if (news.sourceUrl != null && news.sourceUrl!.isNotEmpty) ...[
                    GestureDetector(
                      onTap: () async {
                        final uri = Uri.parse(news.sourceUrl!);
                        if (await canLaunchUrl(uri)) {
                          await launchUrl(uri, mode: LaunchMode.externalApplication);
                        }
                      },
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF5F5F5),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Row(
                          children: [
                            const Icon(
                              Icons.link,
                              size: 20,
                              color: Color(0xFF5B8BA8),
                            ),
                            const SizedBox(width: 10),
                            Expanded(
                              child: Text(
                                news.sourceUrl!,
                                style: const TextStyle(
                                  fontSize: 14,
                                  color: Color(0xFF5B8BA8),
                                  decoration: TextDecoration.underline,
                                ),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                            const Icon(
                              Icons.open_in_new,
                              size: 18,
                              color: Color(0xFF5B8BA8),
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
                        backgroundColor: Colors.transparent,
                        border: const Border(
                          left: BorderSide(
                            color: Color(0xFF333333),
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
