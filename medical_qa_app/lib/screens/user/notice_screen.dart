import 'package:flutter/material.dart';
import '../../models/notice_model.dart';
import '../../services/notice_service.dart';
import '../../utils/app_colors.dart';
import 'package:intl/intl.dart';

class NoticeScreen extends StatefulWidget {
  const NoticeScreen({super.key});

  @override
  State<NoticeScreen> createState() => _NoticeScreenState();
}

class _NoticeScreenState extends State<NoticeScreen> {
  final NoticeService _service = NoticeService();
  static const int _itemsPerPage = 10;
  int _currentPage = 0;
  List<NoticeModel> _noticeList = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _service.getPublishedNotices().listen((notices) {
      if (mounted) {
        setState(() {
          _noticeList = notices;
          _isLoading = false;
          // 현재 페이지가 범위를 벗어나면 첫 페이지로
          final totalPages = (_noticeList.length / _itemsPerPage).ceil();
          if (_currentPage >= totalPages && totalPages > 0) {
            _currentPage = totalPages - 1;
          }
        });
      }
    });
  }

  void _changePage(int page) {
    setState(() {
      _currentPage = page;
    });
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    if (_noticeList.isEmpty) {
      return const Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.campaign_outlined,
              size: 64,
              color: AppColors.textSecondary,
            ),
            SizedBox(height: 16),
            Text(
              '등록된 공지사항이 없습니다',
              style: TextStyle(
                fontSize: 16,
                color: AppColors.textSecondary,
              ),
            ),
          ],
        ),
      );
    }

    // 페이지네이션 계산
    final totalPages = (_noticeList.length / _itemsPerPage).ceil();
    final startIndex = _currentPage * _itemsPerPage;
    final endIndex = (startIndex + _itemsPerPage).clamp(0, _noticeList.length);
    final pageItems = _noticeList.sublist(startIndex, endIndex);

    return Column(
      children: [
        Expanded(
          child: ListView.separated(
            key: ValueKey(_currentPage),
            padding: const EdgeInsets.all(16),
            itemCount: pageItems.length,
            separatorBuilder: (_, __) => const SizedBox(height: 8),
            itemBuilder: (context, index) {
              final notice = pageItems[index];
              return _NoticeCard(
                notice: notice,
                onTap: () => _openNoticeDetail(notice),
              );
            },
          ),
        ),
        // 페이지네이션 UI
        if (totalPages > 1)
          _PaginationBar(
            currentPage: _currentPage,
            totalPages: totalPages,
            onPageChanged: _changePage,
          ),
      ],
    );
  }

  void _openNoticeDetail(NoticeModel notice) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => NoticeDetailScreen(notice: notice),
      ),
    );
  }
}

class _NoticeCard extends StatelessWidget {
  final NoticeModel notice;
  final VoidCallback onTap;

  const _NoticeCard({
    required this.notice,
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
          borderRadius: BorderRadius.circular(16),
        ),
        child: Row(
          children: [
            // 아이콘
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: const Color(0xFFFFE0B2),
                borderRadius: BorderRadius.circular(10),
              ),
              child: const Icon(
                Icons.campaign_rounded,
                color: Color(0xFFFF9800),
                size: 22,
              ),
            ),
            const SizedBox(width: 12),
            // 내용
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // 제목
                  Text(
                    notice.title,
                    style: const TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w600,
                      color: AppColors.textPrimary,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 4),
                  // 날짜
                  Text(
                    DateFormat('yyyy.MM.dd').format(notice.createdAt),
                    style: const TextStyle(
                      fontSize: 12,
                      color: AppColors.textSecondary,
                    ),
                  ),
                ],
              ),
            ),
            const Icon(
              Icons.chevron_right,
              color: AppColors.textSecondary,
              size: 20,
            ),
          ],
        ),
      ),
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
      padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 16),
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
                  fontSize: 14,
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

// 상세 화면
class NoticeDetailScreen extends StatelessWidget {
  final NoticeModel notice;

  const NoticeDetailScreen({super.key, required this.notice});

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
          '공지사항',
          style: TextStyle(
            color: AppColors.textPrimary,
            fontSize: 18,
            fontWeight: FontWeight.w600,
          ),
        ),
        centerTitle: true,
      ),
      body: SingleChildScrollView(
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // 제목
              Text(
                notice.title,
                style: const TextStyle(
                  fontSize: 22,
                  fontWeight: FontWeight.bold,
                  color: AppColors.textPrimary,
                  height: 1.4,
                ),
              ),
              const SizedBox(height: 12),
              // 날짜
              Text(
                DateFormat('yyyy년 M월 d일').format(notice.createdAt),
                style: const TextStyle(
                  fontSize: 13,
                  color: AppColors.textSecondary,
                ),
              ),
              const SizedBox(height: 24),
              const Divider(color: AppColors.divider),
              const SizedBox(height: 24),
              // 본문
              Text(
                notice.content,
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
      ),
    );
  }
}
