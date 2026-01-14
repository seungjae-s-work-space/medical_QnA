import 'package:flutter/material.dart';
import '../../models/encyclopedia_model.dart';
import '../../services/encyclopedia_service.dart';
import '../../utils/app_colors.dart';
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
  List<int> _matchedIndices = [];
  int _currentMatchIndex = 0;
  String _searchQuery = '';
  bool _isSearching = false;

  // 각 아이템의 GlobalKey를 저장
  final Map<int, GlobalKey> _itemKeys = {};

  @override
  void dispose() {
    _searchController.dispose();
    _scrollController.dispose();
    super.dispose();
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

    setState(() {
      _currentMatchIndex = matchIndex;
    });

    final articleIndex = _matchedIndices[matchIndex];
    final key = _itemKeys[articleIndex];
    if (key?.currentContext != null) {
      Scrollable.ensureVisible(
        key!.currentContext!,
        duration: const Duration(milliseconds: 300),
        curve: Curves.easeInOut,
        alignment: 0.3,
      );
    }
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

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        // 검색 바
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          child: Row(
            children: [
              Expanded(
                child: Container(
                  height: 44,
                  decoration: BoxDecoration(
                    color: AppColors.inputBackground,
                    borderRadius: BorderRadius.circular(22),
                    border: Border.all(color: AppColors.divider),
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
                        fontSize: 14,
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
                  padding: const EdgeInsets.symmetric(horizontal: 8),
                  child: Text(
                    '${_currentMatchIndex + 1}/${_matchedIndices.length}',
                    style: const TextStyle(
                      fontSize: 13,
                      color: AppColors.textSecondary,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ),
                GestureDetector(
                  onTap: _goToPreviousMatch,
                  child: Container(
                    width: 32,
                    height: 32,
                    decoration: BoxDecoration(
                      color: AppColors.inputBackground,
                      shape: BoxShape.circle,
                      border: Border.all(color: AppColors.divider),
                    ),
                    child: const Icon(
                      Icons.keyboard_arrow_up,
                      size: 20,
                      color: AppColors.textSecondary,
                    ),
                  ),
                ),
                const SizedBox(width: 4),
                GestureDetector(
                  onTap: _goToNextMatch,
                  child: Container(
                    width: 32,
                    height: 32,
                    decoration: BoxDecoration(
                      color: AppColors.inputBackground,
                      shape: BoxShape.circle,
                      border: Border.all(color: AppColors.divider),
                    ),
                    child: const Icon(
                      Icons.keyboard_arrow_down,
                      size: 20,
                      color: AppColors.textSecondary,
                    ),
                  ),
                ),
              ],
            ],
          ),
        ),
        const Divider(height: 1, color: AppColors.divider),
        // 게시글 목록
        Expanded(
          child: StreamBuilder<List<EncyclopediaModel>>(
            stream: _service.getPublishedArticles(),
            builder: (context, snapshot) {
              if (snapshot.connectionState == ConnectionState.waiting) {
                return const Center(child: CircularProgressIndicator());
              }

              if (snapshot.hasError) {
                debugPrint('Encyclopedia Error: ${snapshot.error}');
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

              _allArticles = snapshot.data ?? [];

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
                          fontSize: 16,
                          color: AppColors.textSecondary,
                        ),
                      ),
                    ],
                  ),
                );
              }

              return ListView.separated(
                controller: _scrollController,
                padding: const EdgeInsets.all(16),
                itemCount: _allArticles.length,
                separatorBuilder: (_, __) => const SizedBox(height: 12),
                itemBuilder: (context, index) {
                  // GlobalKey 생성 및 저장
                  _itemKeys[index] ??= GlobalKey();

                  final article = _allArticles[index];
                  final isMatched = _matchedIndices.contains(index);
                  final isCurrentMatch = _matchedIndices.isNotEmpty &&
                      _matchedIndices[_currentMatchIndex] == index;

                  return _ArticleCard(
                    key: _itemKeys[index],
                    article: article,
                    searchQuery: _searchQuery,
                    isHighlighted: isCurrentMatch,
                    isMatched: isMatched,
                    onTap: () => _openArticleDetail(article),
                  );
                },
              );
            },
          ),
        ),
      ],
    );
  }

  void _openArticleDetail(EncyclopediaModel article) {
    _service.incrementViewCount(article.id);

    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => EncyclopediaDetailScreen(article: article),
      ),
    );
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
              ? const Color(0xFF6B4E71).withValues(alpha: 0.15)
              : isMatched
                  ? const Color(0xFFE8A838).withValues(alpha: 0.1)
                  : AppColors.inputBackground,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isHighlighted
                ? const Color(0xFF6B4E71)
                : isMatched
                    ? const Color(0xFFE8A838)
                    : AppColors.divider,
            width: isHighlighted ? 2 : 1,
          ),
        ),
        child: Row(
          children: [
            // 썸네일
            if (article.imageUrl != null) ...[
              ClipRRect(
                borderRadius: BorderRadius.circular(8),
                child: Image.network(
                  article.imageUrl!,
                  width: 80,
                  height: 80,
                  fit: BoxFit.cover,
                  errorBuilder: (_, __, ___) => Container(
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
                      fontSize: 16,
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
                          fontSize: 12,
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
                          fontSize: 12,
                          color: AppColors.textSecondary.withValues(alpha: 0.7),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const Icon(
              Icons.chevron_right,
              color: AppColors.textSecondary,
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

// 상세 화면
class EncyclopediaDetailScreen extends StatelessWidget {
  final EncyclopediaModel article;

  const EncyclopediaDetailScreen({super.key, required this.article});

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
          '난임백과',
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
            if (article.imageUrl != null)
              Image.network(
                article.imageUrl!,
                width: double.infinity,
                height: 200,
                fit: BoxFit.cover,
                errorBuilder: (_, __, ___) => Container(
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
                    article.title,
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
                        article.authorName,
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
                        DateFormat('yyyy년 M월 d일').format(article.createdAt),
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
                  // 본문
                  Text(
                    article.content,
                    style: const TextStyle(
                      fontSize: 16,
                      color: AppColors.textPrimary,
                      height: 1.8,
                    ),
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
