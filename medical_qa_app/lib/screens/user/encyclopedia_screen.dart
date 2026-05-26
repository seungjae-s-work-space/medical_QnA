import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/material.dart';
import 'package:flutter_html/flutter_html.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:provider/provider.dart';
import '../../models/encyclopedia_model.dart';
import '../../services/encyclopedia_service.dart';
import '../../providers/auth_provider.dart';
import '../../utils/app_colors.dart';
import '../../widgets/protected_content.dart';
import '../../widgets/screenshot_warning_listener.dart';
import 'package:intl/intl.dart';

class EncyclopediaScreen extends StatefulWidget {
  const EncyclopediaScreen({super.key});

  @override
  State<EncyclopediaScreen> createState() => _EncyclopediaScreenState();
}

class _EncyclopediaScreenState extends State<EncyclopediaScreen> {
  final EncyclopediaService _service = EncyclopediaService();
  final TextEditingController _searchController = TextEditingController();
  final ScrollController _scrollController = ScrollController();

  List<EncyclopediaModel> _allArticles = [];
  final List<int> _matchedIndices = [];
  int _currentMatchIndex = 0;
  String _searchQuery = '';
  bool _isSearching = false;
  bool _isLoading = true;
  bool _isLoadingMore = false;
  bool _hasMore = false;
  bool _isOpeningArticle = false;
  int _totalItemCount = 0;
  DocumentSnapshot? _lastDocument;

  // 페이지네이션
  static const int _itemsPerPage = 5;
  static const int _queryPageSize = _itemsPerPage;
  int _currentPage = 0;

  // 각 아이템의 GlobalKey를 저장
  final Map<int, GlobalKey> _itemKeys = {};

  int get _loadedPages => (_allArticles.length / _itemsPerPage).ceil();

  int get _totalPages {
    final count = _totalItemCount > 0 ? _totalItemCount : _allArticles.length;
    return (count / _itemsPerPage).ceil();
  }

  @override
  void initState() {
    super.initState();
    _loadArticles();
  }

  Future<void> _loadArticles() async {
    final pageFuture =
        _service.getPublishedArticlesPage(pageSize: _queryPageSize);
    final countFuture = _service.getPublishedArticlesCount();
    final result = await pageFuture;
    final totalItemCount = await countFuture;
    if (mounted) {
      setState(() {
        _allArticles = result.items;
        _lastDocument = result.lastDocument;
        _hasMore = result.hasMore;
        _totalItemCount = totalItemCount;
        _isLoading = false;
        if (_currentPage >= _totalPages && _totalPages > 0) {
          _currentPage = _totalPages - 1;
        }
      });
    }
  }

  Future<bool> _loadMoreArticles() async {
    if (_isLoadingMore || !_hasMore) return false;

    setState(() {
      _isLoadingMore = true;
    });

    try {
      final result = await _service.getPublishedArticlesPage(
        pageSize: _queryPageSize,
        startAfter: _lastDocument,
      );
      if (!mounted) return false;

      setState(() {
        final updatedList = [..._allArticles, ...result.items];
        _allArticles = updatedList;
        _lastDocument = result.lastDocument;
        _hasMore = result.hasMore;
        if (_totalItemCount < updatedList.length) {
          _totalItemCount = updatedList.length;
        }
        _isLoadingMore = false;
      });

      if (_searchQuery.isNotEmpty) {
        _performSearch(_searchController.text);
      }
      return result.items.isNotEmpty;
    } catch (_) {
      if (mounted) {
        setState(() {
          _isLoadingMore = false;
        });
      }
      return false;
    }
  }

  @override
  void dispose() {
    _searchController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  void _changePage(int page) {
    if (page < 0 || _isLoadingMore) return;

    if (page >= _totalPages && !_hasMore) return;

    if (page < _loadedPages) {
      setState(() {
        _currentPage = page;
      });
      return;
    }

    _ensurePageLoaded(page).then((loaded) {
      if (loaded && mounted) {
        setState(() {
          _currentPage = page;
        });
      }
    });
  }

  Future<bool> _ensurePageLoaded(int page) async {
    while (mounted && _loadedPages <= page && _hasMore) {
      final loaded = await _loadMoreArticles();
      if (!loaded) break;
    }
    return mounted && _loadedPages > page;
  }

  Widget _buildArticleList() {
    if (_isLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    if (_allArticles.isEmpty) {
      return const Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.menu_book_outlined,
              size: 64,
              color: AppColors.textSecondary,
            ),
            SizedBox(height: 16),
            Text(
              '등록된 글이 없습니다',
              style: TextStyle(
                fontSize: 18,
                color: AppColors.textSecondary,
              ),
            ),
          ],
        ),
      );
    }

    // 페이지네이션 계산
    final totalPages = _totalPages;
    final startIndex = _currentPage * _itemsPerPage;
    final endIndex = (startIndex + _itemsPerPage).clamp(0, _allArticles.length);
    final pageItems = _allArticles.sublist(startIndex, endIndex);

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

              final article = pageItems[index];
              final isMatched = _matchedIndices.contains(actualIndex);
              final isCurrentMatch = _matchedIndices.isNotEmpty &&
                  _matchedIndices[_currentMatchIndex] == actualIndex;

              return _ArticleCard(
                key: _itemKeys[actualIndex],
                article: article,
                searchQuery: _searchQuery,
                isHighlighted: isCurrentMatch,
                isMatched: isMatched,
                onTap: () => _openArticleDetail(article),
              );
            },
          ),
        ),
        if (totalPages > 1 || _hasMore)
          _PaginationBar(
            currentPage: _currentPage,
            totalPages: totalPages,
            hasMore: _hasMore,
            isLoadingNextPage: _isLoadingMore,
            onPageChanged: _changePage,
          ),
      ],
    );
  }

  void _performSearch(String query) {
    setState(() {
      _searchQuery = query.toLowerCase().trim();
      _matchedIndices.clear();
      _currentMatchIndex = 0;

      if (_searchQuery.isNotEmpty) {
        for (int i = 0; i < _allArticles.length; i++) {
          final article = _allArticles[i];
          if (article.title.toLowerCase().contains(_searchQuery) ||
              article.content.toLowerCase().contains(_searchQuery)) {
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

    final articleIndex = _matchedIndices[matchIndex];
    final targetPage = articleIndex ~/ _itemsPerPage;

    setState(() {
      _currentMatchIndex = matchIndex;
      // 해당 아이템이 있는 페이지로 자동 이동
      if (_currentPage != targetPage) {
        _currentPage = targetPage;
      }
    });

    // 페이지 변경 후 스크롤 (약간의 딜레이 필요)
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final key = _itemKeys[articleIndex];
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
                    cursorColor: AppColors.encyclopediaTone,
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
                        color: AppColors.encyclopediaTone,
                        size: 20,
                      ),
                      suffixIcon: _isSearching
                          ? IconButton(
                              icon: const Icon(Icons.close, size: 18),
                              color: AppColors.encyclopediaTone,
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
                          color: AppColors.encyclopediaTone,
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
                    color: AppColors.encyclopediaSurfaceSoft,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    '${_currentMatchIndex + 1}/${_matchedIndices.length}',
                    style: const TextStyle(
                      fontSize: 15,
                      color: AppColors.encyclopediaTone,
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
                      color: AppColors.encyclopediaSurfaceSoft,
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(
                      Icons.keyboard_arrow_up,
                      size: 22,
                      color: AppColors.encyclopediaTone,
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
                      color: AppColors.encyclopediaSurfaceSoft,
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(
                      Icons.keyboard_arrow_down,
                      size: 22,
                      color: AppColors.encyclopediaTone,
                    ),
                  ),
                ),
              ],
            ],
          ),
        ),
        // 게시글 목록
        Expanded(
          child: _buildArticleList(),
        ),
      ],
    );
  }

  Future<void> _openArticleDetail(EncyclopediaModel article) async {
    if (_isOpeningArticle) return;

    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    var displayArticle = article;

    setState(() {
      _isOpeningArticle = true;
      if (!authProvider.isGuest) {
        displayArticle = article.copyWith(viewCount: article.viewCount + 1);
        _allArticles = _allArticles.map((item) {
          return item.id == article.id ? displayArticle : item;
        }).toList();
      }
    });

    // 게스트 모드가 아닐 때만 조회수 증가
    if (!authProvider.isGuest) {
      _service.incrementViewCount(article.id);
    }

    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => EncyclopediaDetailScreen(article: displayArticle),
      ),
    );

    if (mounted) {
      setState(() {
        _isOpeningArticle = false;
      });
    }
  }
}

class _ArticleCard extends StatelessWidget {
  final EncyclopediaModel article;
  final String searchQuery;
  final bool isHighlighted;
  final bool isMatched;
  final VoidCallback onTap;

  const _ArticleCard({
    super.key,
    required this.article,
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
              ? AppColors.encyclopediaSurfaceSoft.withValues(alpha: 0.6)
              : isMatched
                  ? AppColors.encyclopediaSurfaceSoft.withValues(alpha: 0.3)
                  : AppColors.surfaceMuted,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: isHighlighted
                ? AppColors.encyclopediaTone
                : isMatched
                    ? AppColors.encyclopediaTone.withValues(alpha: 0.5)
                    : Colors.transparent,
            width: isHighlighted ? 2 : 1,
          ),
        ),
        child: Row(
          children: [
            // 썸네일
            if (article.imageUrl != null) ...[
              ClipRRect(
                borderRadius: BorderRadius.circular(8),
                child: CachedNetworkImage(
                  imageUrl: article.imageUrl!,
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
                    article.title,
                    searchQuery,
                    const TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w600,
                      color: AppColors.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 8),
                  // 날짜 및 조회수
                  Row(
                    children: [
                      Text(
                        DateFormat('yyyy.MM.dd').format(article.createdAt),
                        style: const TextStyle(
                          fontSize: 14,
                          color: AppColors.textSecondary,
                        ),
                      ),
                      const SizedBox(width: 12),
                      Icon(
                        Icons.visibility_outlined,
                        size: 14,
                        color: AppColors.textSecondary.withValues(alpha: 0.7),
                      ),
                      const SizedBox(width: 4),
                      Text(
                        '${article.viewCount}',
                        style: TextStyle(
                          fontSize: 14,
                          color: AppColors.textSecondary.withValues(alpha: 0.7),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            Container(
              width: 32,
              height: 32,
              decoration: const BoxDecoration(
                color: AppColors.encyclopediaSurfaceSoft,
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.chevron_right,
                color: AppColors.encyclopediaTone,
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
          backgroundColor: AppColors.encyclopediaHighlight,
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
  final bool hasMore;
  final bool isLoadingNextPage;
  final ValueChanged<int> onPageChanged;

  const _PaginationBar({
    required this.currentPage,
    required this.totalPages,
    required this.hasMore,
    required this.isLoadingNextPage,
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
          if (totalPages > 5) ...[
            const SizedBox(width: 8),
            Text(
              '${currentPage + 1} / $totalPages',
              style: const TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: AppColors.textSecondary,
              ),
            ),
          ],
          const SizedBox(width: 8),
          // 다음 버튼
          _PageButton(
            icon: Icons.chevron_right,
            isLoading: isLoadingNextPage,
            onTap: currentPage < totalPages - 1 || hasMore
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
  final bool isLoading;

  const _PageButton({
    required this.icon,
    this.onTap,
    this.isLoading = false,
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
        child: isLoading
            ? const Center(
                child: SizedBox(
                  width: 16,
                  height: 16,
                  child: CircularProgressIndicator(strokeWidth: 2),
                ),
              )
            : Icon(
                icon,
                size: 20,
                color: isEnabled ? AppColors.textPrimary : AppColors.divider,
              ),
      ),
    );
  }
}

// 참고자료 및 출처 섹션 위젯
class _ReferencesSection extends StatelessWidget {
  final String? references;
  final String? sourceUrl;

  const _ReferencesSection({
    this.references,
    this.sourceUrl,
  });

  Future<void> _launchUrl(BuildContext context, String url) async {
    final uri = Uri.parse(url);

    try {
      final launched = await launchUrl(
        uri,
        mode: LaunchMode.externalApplication,
      );
      if (!launched && context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('외부 페이지를 열 수 없습니다.')),
        );
      }
    } catch (_) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('외부 페이지를 열 수 없습니다.')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(top: 32),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFFF8F9FA),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFE9ECEF)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // 헤더
          const Row(
            children: [
              Icon(
                Icons.info_outline,
                size: 18,
                color: AppColors.textSecondary,
              ),
              SizedBox(width: 8),
              Text(
                '참고자료 및 출처',
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                  color: AppColors.textSecondary,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          // 참고자료 목록
          if (references != null && references!.isNotEmpty) ...[
            ...references!
                .split('\n')
                .where((line) => line.trim().isNotEmpty)
                .map(
                  (ref) => Padding(
                    padding: const EdgeInsets.only(bottom: 6),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          '• ',
                          style: TextStyle(
                            fontSize: 13,
                            color: AppColors.textSecondary,
                          ),
                        ),
                        Expanded(
                          child: Text(
                            ref.trim(),
                            style: const TextStyle(
                              fontSize: 13,
                              color: AppColors.textSecondary,
                              height: 1.4,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
          ],
          // 원문 링크
          if (sourceUrl != null && sourceUrl!.isNotEmpty) ...[
            if (references != null && references!.isNotEmpty)
              const SizedBox(height: 8),
            GestureDetector(
              onTap: () => _launchUrl(context, sourceUrl!),
              child: Row(
                children: [
                  Icon(
                    Icons.link,
                    size: 16,
                    color: Colors.blue[600],
                  ),
                  const SizedBox(width: 6),
                  Expanded(
                    child: Text(
                      '원문 보기',
                      style: TextStyle(
                        fontSize: 13,
                        color: Colors.blue[600],
                        decoration: TextDecoration.underline,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ],
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
class EncyclopediaDetailScreen extends StatelessWidget {
  final EncyclopediaModel article;

  const EncyclopediaDetailScreen({super.key, required this.article});

  @override
  Widget build(BuildContext context) {
    return ScreenshotWarningListener(
      contentType: 'encyclopedia',
      contentId: article.id,
      contentTitle: article.title,
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
            '난임백과',
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
                        article.title,
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
                            article.authorName,
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
                            DateFormat('yyyy년 M월 d일').format(article.createdAt),
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
                      Html(
                        data: _cleanHtmlContent(article.content),
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
                      // 참고자료 및 출처 섹션
                      if (article.references != null &&
                              article.references!.isNotEmpty ||
                          article.sourceUrl != null &&
                              article.sourceUrl!.isNotEmpty)
                        _ReferencesSection(
                          references: article.references,
                          sourceUrl: article.sourceUrl,
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
